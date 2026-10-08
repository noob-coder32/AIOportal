const fs = require("fs/promises");

const complaintsDb = require("../db/complaints.db");
const complaintsMailDb = require("../db/complaintsMail.db");
const { sendMail } = require("./mail.service");
const { generateComplaintsRegisterExcel } = require("../modules/complaints/excel.generator");

let schedulerTimer = null;
let nextRunAt = null;
let activeSendPromise = null;
let activeRunState = {
    isRunning: false,
    startedAt: null,
    mode: null,
};

function isValidTimeHhmm(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function parseRecipientEmails(value) {
    return String(value || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
}

function hasValidRecipientEmails(value) {
    const recipients = parseRecipientEmails(value);
    return recipients.length > 0 && recipients.every(isValidEmail);
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
        isRunning: activeRunState.isRunning,
        startedAt: activeRunState.startedAt,
        activeMode: activeRunState.mode,
        nextRunAt,
    };
}

function computeNextRunDate(sendTimeHhmm) {
    const [hoursText, minutesText] = String(sendTimeHhmm).split(":");
    const nextDate = new Date();

    nextDate.setHours(Number(hoursText), Number(minutesText), 0, 0);

    if (nextDate.getTime() <= Date.now()) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
}

async function configureScheduler(settings) {
    clearScheduler();

    if (!settings.isEnabled || !isValidTimeHhmm(settings.sendTimeHhmm)) {
        return;
    }

    nextRunAt = computeNextRunDate(settings.sendTimeHhmm);
    const delayMs = Math.max(nextRunAt.getTime() - Date.now(), 1000);

    schedulerTimer = setTimeout(async () => {
        nextRunAt = null;

        try {
            await runScheduledSend();
        } catch (error) {
            console.error("Complaints mail scheduled send failed:", error.message || error);
        } finally {
            const latestSettings = await complaintsMailDb.getSettings();
            await configureScheduler(latestSettings);
        }
    }, delayMs);
}

function buildMailSubject() {
    return `Daily Complaints Report - ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })}`;
}

function buildMailText({ pendingCount, completedCount, allCount }) {
    return [
        "Please find attached the daily complaints reports.",
        "",
        `Pending complaints: ${pendingCount}`,
        `Completed complaints: ${completedCount}`,
        `All complaints: ${allCount}`,
    ].join("\n");
}

async function removeGeneratedFiles(filePaths) {
    await Promise.all(
        filePaths.map(async (filePath) => {
            if (!filePath) {
                return;
            }

            try {
                await fs.unlink(filePath);
            } catch (_error) {
                // Ignore cleanup failures for generated attachments.
            }
        })
    );
}

async function executeMailRun({ mode, triggeredByUserId = null }) {
    const settings = await complaintsMailDb.getSettings();
    const recipientEmails = parseRecipientEmails(settings.recipientEmail);

    if (!hasValidRecipientEmails(settings.recipientEmail)) {
        throw new Error("At least one valid recipient email is required");
    }

    if (!isValidTimeHhmm(settings.sendTimeHhmm)) {
        throw new Error("Scheduled mail time is invalid");
    }

    const logId = await complaintsMailDb.createMailLog({
        runMode: mode,
        status: "running",
        recipientEmail: settings.recipientEmail,
        triggeredByUserId,
    });

    await complaintsMailDb.markRunStarted();

    let pendingCount = 0;
    let completedCount = 0;
    let allCount = 0;
    const generatedFiles = [];

    try {
        const [pendingRows, completedRows, allRows] = await Promise.all([
            complaintsDb.getComplaints({ status: "Pending" }),
            complaintsDb.getComplaints({ status: "Completed" }),
            complaintsDb.getComplaints({}),
        ]);

        pendingCount = pendingRows.length;
        completedCount = completedRows.length;
        allCount = allRows.length;

        const timestampSeed = new Date().toISOString().replace(/[:.]/g, "-");
        const [pendingFile, completedFile, allFile] = await Promise.all([
            generateComplaintsRegisterExcel(pendingRows, {
                status: "Pending",
                generatedBy: mode,
            }, {
                reportTitle: "Pending Complaints Report",
                fileNamePrefix: `Complaint_Report_Pending_${timestampSeed}`,
            }),
            generateComplaintsRegisterExcel(completedRows, {
                status: "Completed",
                generatedBy: mode,
            }, {
                reportTitle: "Completed Complaints Report",
                fileNamePrefix: `Complaint_Report_Completed_${timestampSeed}`,
            }),
            generateComplaintsRegisterExcel(allRows, {
                generatedBy: mode,
            }, {
                reportTitle: "All Complaints Report",
                fileNamePrefix: `Complaint_Report_All_${timestampSeed}`,
            }),
        ]);

        generatedFiles.push(pendingFile, completedFile, allFile);

        await sendMail({
            to: recipientEmails,
            subject: buildMailSubject(),
            text: buildMailText({ pendingCount, completedCount, allCount }),
            attachments: [
                { filename: "Pending_Complaints.xlsx", path: pendingFile },
                { filename: "Completed_Complaints.xlsx", path: completedFile },
                { filename: "All_Complaints.xlsx", path: allFile },
            ],
        });

        await complaintsMailDb.markRunSucceeded();
        await complaintsMailDb.finalizeMailLogSuccess(logId, {
            pendingCount,
            completedCount,
            allCount,
        });

        return {
            logId,
            pendingCount,
            completedCount,
            allCount,
        };
    } catch (error) {
        const message = error?.message || "Complaints mail send failed";

        await complaintsMailDb.markRunFailed(message);
        await complaintsMailDb.finalizeMailLogFailure(logId, {
            pendingCount,
            completedCount,
            allCount,
            errorMessage: message,
        });

        throw new Error(message);
    } finally {
        await removeGeneratedFiles(generatedFiles);
    }
}

async function runMailJob({ mode, triggeredByUserId = null }) {
    if (activeSendPromise) {
        const settings = await complaintsMailDb.getSettings();
        const logId = await complaintsMailDb.createMailLog({
            runMode: mode,
            status: "skipped",
            recipientEmail: settings.recipientEmail,
            triggeredByUserId,
            errorMessage: "already_running",
        });

        return {
            skipped: true,
            reason: "already_running",
            logId,
            ...getRuntimeState(),
        };
    }

    activeRunState = {
        isRunning: true,
        startedAt: new Date(),
        mode,
    };

    activeSendPromise = (async () => {
        try {
            return await executeMailRun({ mode, triggeredByUserId });
        } finally {
            activeSendPromise = null;
            activeRunState = {
                isRunning: false,
                startedAt: null,
                mode: null,
            };
        }
    })();

    return activeSendPromise;
}

async function initializeScheduler() {
    await complaintsMailDb.ensureSetup();
    const settings = await complaintsMailDb.getSettings();
    await configureScheduler(settings);
    return settings;
}

async function getStatus() {
    await complaintsMailDb.ensureSetup();

    return {
        settings: await complaintsMailDb.getSettings(),
        runtime: getRuntimeState(),
    };
}

async function getLogs(limit = 20) {
    return complaintsMailDb.getMailLogs(limit);
}

async function updateSettings({ recipientEmail, isEnabled, sendTimeHhmm }) {
    if (!hasValidRecipientEmails(recipientEmail)) {
        throw new Error("Enter one or more valid recipient emails separated by commas");
    }

    if (!isValidTimeHhmm(sendTimeHhmm)) {
        throw new Error("Send time must be in HH:mm format");
    }

    const settings = await complaintsMailDb.updateSettings({
        recipientEmail: String(recipientEmail).trim(),
        isEnabled,
        sendTimeHhmm,
    });

    await configureScheduler(settings);

    return {
        settings,
        runtime: getRuntimeState(),
    };
}

async function runManualSend({ triggeredByUserId = null } = {}) {
    return runMailJob({
        mode: "manual",
        triggeredByUserId,
    });
}

async function runScheduledSend() {
    const settings = await complaintsMailDb.getSettings();

    if (!settings.isEnabled) {
        const logId = await complaintsMailDb.createMailLog({
            runMode: "scheduled",
            status: "skipped",
            recipientEmail: settings.recipientEmail,
            errorMessage: "disabled",
        });

        return {
            skipped: true,
            reason: "disabled",
            logId,
        };
    }

    try {
        return await runMailJob({
            mode: "scheduled",
            triggeredByUserId: null,
        });
    } catch (error) {
        console.warn("Complaints mail scheduled run failed, retrying once:", error.message || error);

        return runMailJob({
            mode: "scheduled",
            triggeredByUserId: null,
        });
    }
}

module.exports = {
    initializeScheduler,
    getStatus,
    getLogs,
    updateSettings,
    runManualSend,
    runScheduledSend,
};
