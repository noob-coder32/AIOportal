const debtor1MailDb = require("../db/debtor1Mail.db");
const { sendMail } = require("./mail.service");
const { generateDebtorCreditLimitWorkbook } = require("../modules/debtor1/debtor1Mail.report");

let schedulerTimer = null;
let nextRunAt = null;
let activeSendPromise = null;
let activeRunState = { isRunning: false, startedAt: null, mode: null };

function isValidTimeHhmm(value) { return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "")); }
function parseRecipientEmails(value) { return String(value || "").split(",").map((email) => email.trim()).filter(Boolean); }
function validateRecipients(value) {
    const recipients = parseRecipientEmails(value);
    if (!recipients.length || !recipients.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new Error("Enter one or more valid recipient email addresses");
    }
    return recipients;
}
function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function toDateKey(value) {
    if (value === null || value === undefined || value === "") return null;

    // SQL DATE values are returned by the MSSQL driver as JavaScript Date objects.
    // Use local date parts so a date at midnight is not shifted by the timezone.
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : dateKey(value);
    }

    const text = String(value).trim();
    const dateOnlyMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnlyMatch) return dateOnlyMatch[1];

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : dateKey(parsed);
}
function previousDateKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return dateKey(date);
}
function addDays(value, amount) {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + amount);
    return dateKey(date);
}
function getDateRange(fromDate, toDate) {
    const dates = [];
    for (let current = fromDate; current <= toDate; current = addDays(current, 1)) dates.push(current);
    return dates;
}
function clearScheduler() {
    if (schedulerTimer) clearTimeout(schedulerTimer);
    schedulerTimer = null;
    nextRunAt = null;
}
function computeNextRunDate(sendTimeHhmm) {
    const [hours, minutes] = String(sendTimeHhmm).split(":").map(Number);
    const nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);
    if (nextDate.getTime() <= Date.now()) nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
}
function getRuntimeState() {
    return { isRunning: activeRunState.isRunning, activeMode: activeRunState.mode, startedAt: activeRunState.startedAt, nextRunAt };
}
function startOfDate(value) { return `${value}T00:00:00`; }
function startOfNextDate(value) { return `${addDays(value, 1)}T00:00:00`; }
function formatDisplayDate(value, separator = "/") {
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return `${day}${separator}${month}${separator}${year}`;
}

async function getPendingDates() {
    const targetDate = previousDateKey();
    const settings = await debtor1MailDb.getSettings();
    const lastSuccessfulDate = toDateKey(settings.lastSuccessfulReportDate);
    const firstDate = lastSuccessfulDate
        ? addDays(lastSuccessfulDate, 1)
        : targetDate;
    if (firstDate > targetDate) return [];

    const candidateDates = getDateRange(firstDate, targetDate);
    const statuses = await debtor1MailDb.getDeliveryStatuses(firstDate, targetDate);
    const sentDates = new Set(
        statuses
            .filter((row) => row.status === "sent")
            .map((row) => toDateKey(row.report_date))
            .filter(Boolean)
    );
    return candidateDates.filter((reportDate) => !sentDates.has(reportDate));
}

function buildMailText(reportDates, rows) {
    const noChangeDates = reportDates.filter((date) => !rows.some((row) => row.change_date === date));
    const displayReportDates = reportDates.map((date) => formatDisplayDate(date)).join(", ");
    const displayNoChangeDates = noChangeDates.map((date) => formatDisplayDate(date)).join(", ");
    const lines = [
        `Daily debtor credit limit change report for ${displayReportDates}.`,
        `Credit-limit changes: ${rows.length}.`,
        "Please find the detailed changes in the attached Excel report.",
    ];
    if (noChangeDates.length) lines.push(`No credit limit changes for: ${displayNoChangeDates}.`);
    return lines.join("\n");
}

async function executeSend(mode) {
    const settings = await debtor1MailDb.getSettings();
    const recipients = validateRecipients(settings.recipientEmail);
    const reportDates = await getPendingDates();
    if (!reportDates.length) return { mode, skipped: true, reason: "nothing_pending", rowCount: 0 };

    const fromDate = startOfDate(reportDates[0]);
    const toDate = startOfNextDate(reportDates[reportDates.length - 1]);
    await debtor1MailDb.markRunStarted();

    try {
        const rows = await debtor1MailDb.getCreditLimitChanges(fromDate, toDate);
        const workbookBuffer = await generateDebtorCreditLimitWorkbook(rows);
        const firstDate = reportDates[0];
        const lastDate = reportDates[reportDates.length - 1];
        const displayLastDate = formatDisplayDate(lastDate);
        const fileDate = firstDate === lastDate
            ? formatDisplayDate(firstDate, "-")
            : `${formatDisplayDate(firstDate, "-")}_to_${formatDisplayDate(lastDate, "-")}`;

        await sendMail({
            to: recipients,
            // subject: `Daily Debtor Credit Limit Changes - ${displayLastDate}`,
            subject: `Daily Debtor Credit Limit Changes`,
            text: buildMailText(reportDates, rows),
            attachments: [{
                filename: `Debtor_Credit_Limit_Changes_${fileDate}.xlsx`,
                content: workbookBuffer,
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }],
        });

        await Promise.all(reportDates.map((reportDate) => debtor1MailDb.markDelivery(reportDate, "sent", rows.filter((row) => row.change_date === reportDate).length)));
        await debtor1MailDb.markRunSucceeded(rows.length, lastDate);
        return { mode, reportDates, rowCount: rows.length };
    } catch (error) {
        await Promise.all(reportDates.map((reportDate) => debtor1MailDb.markDelivery(reportDate, "failed", 0, error.message)));
        await debtor1MailDb.markRunFailed(error.message);
        throw error;
    }
}

async function runMailJob(mode) {
    if (activeSendPromise) return { skipped: true, reason: "already_running", ...getRuntimeState() };
    activeRunState = { isRunning: true, startedAt: new Date(), mode };
    activeSendPromise = executeSend(mode);
    try { return await activeSendPromise; }
    finally {
        activeSendPromise = null;
        activeRunState = { isRunning: false, startedAt: null, mode: null };
    }
}

async function scheduleFromSettings(settings) {
    clearScheduler();
    if (!settings.isEnabled || !isValidTimeHhmm(settings.sendTimeHhmm)) return;
    nextRunAt = computeNextRunDate(settings.sendTimeHhmm);
    schedulerTimer = setTimeout(async () => {
        nextRunAt = null;
        try { await runMailJob("scheduled"); }
        catch (error) { console.error("Debtor1 mail scheduled send failed:", error.message || error); }
        finally {
            try { await scheduleFromSettings(await debtor1MailDb.getSettings()); }
            catch (error) { console.error("Debtor1 mail scheduler reschedule failed:", error.message || error); }
        }
    }, Math.max(nextRunAt.getTime() - Date.now(), 1000));
}

async function initializeScheduler() {
    await debtor1MailDb.ensureSetup();
    await scheduleFromSettings(await debtor1MailDb.getSettings());
}
async function getStatus() {
    await debtor1MailDb.ensureSetup();
    const settings = await debtor1MailDb.getSettings();
    return { settings, pendingReportDates: await getPendingDates(), runtime: getRuntimeState() };
}
async function updateSettings({ recipientEmail, isEnabled, sendTimeHhmm }) {
    validateRecipients(recipientEmail);
    if (!isValidTimeHhmm(sendTimeHhmm)) throw new Error("Send time must be in HH:mm format");
    const settings = await debtor1MailDb.updateSettings({ recipientEmail: String(recipientEmail).trim(), isEnabled, sendTimeHhmm });
    await scheduleFromSettings(settings);
    return { settings, pendingReportDates: await getPendingDates(), runtime: getRuntimeState() };
}
async function runNow() { return runMailJob("manual"); }

module.exports = { initializeScheduler, getStatus, updateSettings, runNow };
