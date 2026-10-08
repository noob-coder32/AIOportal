const defaultCredLimitDb = require("../db/defaultCredLimit.db");

let schedulerTimer = null;
let nextRunAt = null;
let activeRunPromise = null;

function isValidTimeHhmm(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

function computeNextRunDate(runTimeHhmm) {
    const [hours, minutes] = String(runTimeHhmm).split(":").map(Number);
    const nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    if (nextDate.getTime() <= Date.now()) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

function clearScheduler() {
    if (schedulerTimer) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
    }

    nextRunAt = null;
}

function getRuntimeState() {
    return {
        isRunning: Boolean(activeRunPromise),
        nextRunAt,
    };
}

async function executeRun() {
    await defaultCredLimitDb.markSchedulerRunStarted();

    try {
        const updatedCount = await defaultCredLimitDb.applyDefaultCreditLimits();
        await defaultCredLimitDb.markSchedulerRunSucceeded(updatedCount);
        return { updatedCount };
    } catch (error) {
        await defaultCredLimitDb.markSchedulerRunFailed(error.message);
        throw error;
    }
}

async function runNow() {
    if (activeRunPromise) {
        return { skipped: true, reason: "already_running", ...getRuntimeState() };
    }

    activeRunPromise = executeRun();

    try {
        return await activeRunPromise;
    } finally {
        activeRunPromise = null;
    }
}

async function scheduleFromSettings(settings) {
    clearScheduler();

    if (!settings.isEnabled || !isValidTimeHhmm(settings.runTimeHhmm)) {
        return;
    }

    nextRunAt = computeNextRunDate(settings.runTimeHhmm);
    schedulerTimer = setTimeout(async () => {
        nextRunAt = null;

        try {
            await runNow();
        } catch (error) {
            console.error("Default credit limit scheduled run failed:", error.message || error);
        } finally {
            try {
                await scheduleFromSettings(await defaultCredLimitDb.getSchedulerSettings());
            } catch (error) {
                console.error("Default credit limit scheduler reschedule failed:", error.message || error);
            }
        }
    }, Math.max(nextRunAt.getTime() - Date.now(), 1000));
}

async function initializeScheduler() {
    await defaultCredLimitDb.ensureSetup();
    await scheduleFromSettings(await defaultCredLimitDb.getSchedulerSettings());
}

async function getStatus() {
    await defaultCredLimitDb.ensureSetup();
    return {
        settings: await defaultCredLimitDb.getSchedulerSettings(),
        runtime: getRuntimeState(),
    };
}

async function updateSettings({ isEnabled, runTimeHhmm }) {
    const settings = await defaultCredLimitDb.updateSchedulerSettings({ isEnabled, runTimeHhmm });
    await scheduleFromSettings(settings);

    return { settings, runtime: getRuntimeState() };
}

module.exports = {
    initializeScheduler,
    getStatus,
    updateSettings,
    runNow,
};
