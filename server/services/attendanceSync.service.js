const os = require("os");
const attendanceSyncDb = require("../db/attendanceSync.db");

const SUPPORTED_INTERVALS = new Set([2, 5, 15, 30, 60]);
const AUTO_SYNC_BATCH_LIMIT = 5;
const MANUAL_SYNC_BATCH_LIMIT = 20;
const BATCH_SIZE = 10000;
const PENDING_PREVIEW_LIMIT = 2500;
const PENDING_SNAPSHOT_STALE_MS = 5 * 60 * 1000;

function getServerHostIp() {
    const interfaces = os.networkInterfaces();

    for (const iface of Object.values(interfaces)) {
        if (!iface) {
            continue;
        }

        for (const net of iface) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }

    return "127.0.0.1";
}

let schedulerTimer = null;
let schedulerIntervalMinutes = null;
let nextRunAt = null;
let activeSyncPromise = null;
let activePendingScanPromise = null;
let activeRunState = {
    isRunning: false,
    mode: null,
    startedAt: null,
};

function formatErrorMessage(error) {
    return error?.originalError?.message || error?.message || "Attendance sync failed";
}

async function getAwsStatusSnapshot() {
    try {
        return {
            latestAwsCheckTime: await attendanceSyncDb.getLatestAwsCheckTime(),
            awsStatus: "connected",
            awsError: "",
        };
    } catch (error) {
        const message = formatErrorMessage(error);

        return {
            latestAwsCheckTime: null,
            awsStatus: "failed",
            awsError: message,
        };
    }
}

function isPendingSnapshotStale(snapshot) {
    if (!snapshot?.pendingSnapshotAt) {
        return true;
    }

    const snapshotTime = new Date(snapshot.pendingSnapshotAt).getTime();

    return !Number.isFinite(snapshotTime)
        || Date.now() - snapshotTime > PENDING_SNAPSHOT_STALE_MS;
}

function getRuntimeState() {
    return {
        isRunning: activeRunState.isRunning,
        activeMode: activeRunState.mode,
        startedAt: activeRunState.startedAt,
        nextRunAt,
        schedulerIntervalMinutes,
        isPendingScanRunning: Boolean(activePendingScanPromise),
    };
}

function clearScheduler() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }

    schedulerIntervalMinutes = null;
    nextRunAt = null;
}

function scheduleNextRun(intervalMinutes) {
    nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
}

function configureScheduler(settings) {
    clearScheduler();

    if (!settings.isEnabled) {
        return;
    }

    schedulerIntervalMinutes = settings.intervalMinutes;
    scheduleNextRun(settings.intervalMinutes);

    schedulerTimer = setInterval(() => {
        scheduleNextRun(settings.intervalMinutes);
        runAutoSyncTick().catch((error) => {
            console.error("Attendance sync auto-run failed:", formatErrorMessage(error));
        });
    }, settings.intervalMinutes * 60 * 1000);
}

async function executeSync({ mode, maxBatches, triggeredByUserId = null, hostIp = null }) {
    let latestAwsCheckTime = await attendanceSyncDb.getLatestAwsCheckTime();
    const awsLatestChecktimeBeforeRun = latestAwsCheckTime;
    const logId = await attendanceSyncDb.createSyncLog({
        runMode: mode,
        triggeredByUserId: mode === "manual" ? triggeredByUserId : null,
        batchSize: BATCH_SIZE,
        awsLatestChecktimeBeforeRun,
        status: "running",
    });

    await attendanceSyncDb.markSyncRunStarted();

    let insertedCount = 0;
    let processedBatches = 0;
    let lastSyncedChecktime = latestAwsCheckTime;
    let pendingCursor = null;
    let pendingExhausted = false;

    try {
        while (processedBatches < maxBatches) {
            const pendingBatch = await attendanceSyncDb.getPendingBatch({
                afterRow: pendingCursor,
                batchSize: BATCH_SIZE,
            });
            const batch = pendingBatch.rows;

            if (!batch.length) {
                pendingExhausted = pendingBatch.exhausted;
                break;
            }

            await attendanceSyncDb.insertBatchToAws(batch, hostIp);

            insertedCount += batch.length;
            processedBatches += 1;
            lastSyncedChecktime = batch[batch.length - 1].CHECKTIME;
            pendingCursor = pendingBatch.nextCursor;
            pendingExhausted = pendingBatch.exhausted;

            if (pendingBatch.exhausted) {
                break;
            }
        }

        await attendanceSyncDb.markSyncRunSucceeded(lastSyncedChecktime);

        const hasMorePending = !pendingExhausted;
        const remainingCount = hasMorePending ? null : 0;

        await attendanceSyncDb.finalizeSyncLogSuccess(logId, {
            processedBatches,
            insertedCount,
            remainingCount,
            lastSyncedChecktimeAfterRun: lastSyncedChecktime,
        });

        return {
            mode,
            insertedCount,
            processedBatches,
            batchSize: BATCH_SIZE,
            hasMorePending,
            remainingCount,
            lastSyncedChecktime,
            awsLatestChecktimeBeforeRun,
            logId,
        };
    } catch (error) {
        const message = formatErrorMessage(error);

        await attendanceSyncDb.finalizeSyncLogFailure(logId, {
            processedBatches,
            insertedCount,
            remainingCount: null,
            lastSyncedChecktimeAfterRun: lastSyncedChecktime,
            errorMessage: message,
        });

        throw error;
    }
}

async function runSync({ mode, maxBatches, triggeredByUserId = null, hostIp = null }) {
    if (activeSyncPromise) {
        const skippedLogId = await attendanceSyncDb.createSyncLog({
            runMode: mode,
            status: "skipped",
            triggeredByUserId,
            batchSize: BATCH_SIZE,
            skipReason: "already_running",
        });

        return {
            skipped: true,
            reason: "already_running",
            logId: skippedLogId,
            ...getRuntimeState(),
        };
    }

    activeRunState = {
        isRunning: true,
        mode,
        startedAt: new Date(),
    };

    activeSyncPromise = (async () => {
        try {
            const result = await executeSync({ mode, maxBatches, triggeredByUserId, hostIp });
            startPendingSnapshotRefresh({ reason: `${mode}_sync_finished`, force: true });
            return result;
        } catch (error) {
            const message = formatErrorMessage(error);
            await attendanceSyncDb.markSyncRunFailed(message);
            throw new Error(message);
        } finally {
            activeSyncPromise = null;
            activeRunState = {
                isRunning: false,
                mode: null,
                startedAt: null,
            };
        }
    })();

    return activeSyncPromise;
}

async function initializeScheduler() {
    await attendanceSyncDb.ensureSetup();
    const settings = await attendanceSyncDb.getSettings();
    configureScheduler(settings);
    startPendingSnapshotRefresh({ reason: "startup" });
    return settings;
}

async function getStatus() {
    await attendanceSyncDb.ensureSetup();

    const [settings, latestLocalCheckTime, pendingSnapshot, awsStatusSnapshot] = await Promise.all([
        attendanceSyncDb.getSettings(),
        attendanceSyncDb.getLatestLocalCheckTime(),
        attendanceSyncDb.getPendingSnapshot(),
        getAwsStatusSnapshot(),
    ]);

    if (isPendingSnapshotStale(pendingSnapshot)) {
        startPendingSnapshotRefresh({ reason: "status_stale" });
    }

    const isPendingScanRunning = Boolean(activePendingScanPromise)
        && !pendingSnapshot.pendingScanFinishedAt;

    return {
        settings,
        runtime: {
            ...getRuntimeState(),
            isPendingScanRunning,
        },
        data: {
            latestAwsCheckTime: awsStatusSnapshot.latestAwsCheckTime,
            awsStatus: awsStatusSnapshot.awsStatus,
            awsError: awsStatusSnapshot.awsError,
            latestLocalCheckTime,
            pendingCount: pendingSnapshot.pendingCount,
            previewRows: pendingSnapshot.previewRows,
            pendingSnapshotAt: pendingSnapshot.pendingSnapshotAt,
            pendingScanStatus: isPendingScanRunning
                ? "running"
                : pendingSnapshot.pendingScanStatus,
            pendingScanStartedAt: pendingSnapshot.pendingScanStartedAt,
            pendingScanFinishedAt: pendingSnapshot.pendingScanFinishedAt,
            pendingScanDurationMs: pendingSnapshot.pendingScanDurationMs,
            pendingScanError: pendingSnapshot.pendingScanError,
        },
    };
}

function startPendingSnapshotRefresh({ reason = "background", force = false } = {}) {
    if (activePendingScanPromise) {
        return activePendingScanPromise;
    }

    activePendingScanPromise = (async () => {
        try {
            if (!force) {
                const snapshot = await attendanceSyncDb.getPendingSnapshot();

                if (!isPendingSnapshotStale(snapshot)) {
                    return snapshot;
                }
            }

            await attendanceSyncDb.markPendingScanStarted();
            const pendingOverview = await attendanceSyncDb.getPendingOverview(PENDING_PREVIEW_LIMIT);
            await attendanceSyncDb.markPendingScanSucceeded(pendingOverview);

            return {
                ...pendingOverview,
                reason,
            };
        } catch (error) {
            const message = formatErrorMessage(error);
            await attendanceSyncDb.markPendingScanFailed(message);
            console.error("Attendance sync pending scan failed:", message);
            throw error;
        } finally {
            activePendingScanPromise = null;
        }
    })();

    activePendingScanPromise.catch(() => {});
    return activePendingScanPromise;
}

async function getLogs({ mode, status, limit }) {
    return attendanceSyncDb.getSyncLogs({ mode, status, limit });
}

async function getSettingsSnapshot() {
    await attendanceSyncDb.ensureSetup();

    return {
        settings: await attendanceSyncDb.getSettings(),
        runtime: getRuntimeState(),
    };
}

async function updateSettings({ isEnabled, intervalMinutes }) {
    if (!SUPPORTED_INTERVALS.has(intervalMinutes)) {
        throw new Error("Interval must be 2, 5, 15, 30, or 60 minutes");
    }

    const settings = await attendanceSyncDb.updateSettings({
        isEnabled,
        intervalMinutes,
    });

    configureScheduler(settings);

    return {
        settings,
        runtime: getRuntimeState(),
    };
}

async function runManualSync({ triggeredByUserId = null, hostIp = null } = {}) {
    return runSync({
        mode: "manual",
        maxBatches: MANUAL_SYNC_BATCH_LIMIT,
        triggeredByUserId,
        hostIp,
    });
}

async function runAutoSyncTick() {
    const settings = await attendanceSyncDb.getSettings();

    if (!settings.isEnabled) {
        await attendanceSyncDb.createSyncLog({
            runMode: "auto",
            status: "skipped",
            batchSize: BATCH_SIZE,
            skipReason: "disabled",
        });

        return {
            skipped: true,
            reason: "disabled",
        };
    }

    return runSync({
        mode: "auto",
        maxBatches: AUTO_SYNC_BATCH_LIMIT,
        hostIp: getServerHostIp(),
    });
}

module.exports = {
    BATCH_SIZE,
    MANUAL_SYNC_BATCH_LIMIT,
    initializeScheduler,
    getStatus,
    getLogs,
    getSettingsSnapshot,
    updateSettings,
    runManualSync,
    runAutoSyncTick,
    startPendingSnapshotRefresh,
};
