const { query, execute } = require("./mssql");
const { ensureComplaintMailTables } = require("../scripts/create-complaints-mail-table");

const DB_NAME = process.env.DB_NAME;
const SETTINGS_ROW_ID = 1;

let setupPromise = null;

function normalizeSettings(row = {}) {
    return {
        recipientEmail: row.recipient_email || "",
        isEnabled: Boolean(row.is_enabled),
        sendTimeHhmm: row.send_time_hhmm || "08:30",
        lastRunAt: row.last_run_at || null,
        lastSuccessAt: row.last_success_at || null,
        lastError: row.last_error || "",
        updatedAt: row.updated_at || null,
    };
}

async function ensureSetup() {
    if (setupPromise) {
        return setupPromise;
    }

    setupPromise = (async () => {
        await ensureComplaintMailTables();
    })().catch((error) => {
        setupPromise = null;
        throw error;
    });

    return setupPromise;
}

async function getSettings() {
    await ensureSetup();

    const rows = await query(
        DB_NAME,
        `
        SELECT
            id,
            recipient_email,
            is_enabled,
            send_time_hhmm,
            last_run_at,
            last_success_at,
            last_error,
            updated_at
        FROM dbo.complaint_mail_settings
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );

    return normalizeSettings(rows[0]);
}

async function updateSettings({ recipientEmail, isEnabled, sendTimeHhmm }) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_settings
        SET
            recipient_email = @recipientEmail,
            is_enabled = @isEnabled,
            send_time_hhmm = @sendTimeHhmm,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            recipientEmail: recipientEmail || null,
            isEnabled: isEnabled ? 1 : 0,
            sendTimeHhmm,
        }
    );

    return getSettings();
}

async function markRunStarted() {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_settings
        SET
            last_run_at = GETDATE(),
            last_error = NULL,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markRunSucceeded() {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_settings
        SET
            last_success_at = GETDATE(),
            last_error = NULL,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markRunFailed(errorMessage) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_settings
        SET
            last_error = @lastError,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            lastError: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function createMailLog({
    runMode,
    status = "running",
    recipientEmail = null,
    triggeredByUserId = null,
    pendingCount = 0,
    completedCount = 0,
    allCount = 0,
    errorMessage = null,
}) {
    await ensureSetup();

    const rows = await query(
        DB_NAME,
        `
        INSERT INTO dbo.complaint_mail_logs (
            run_mode,
            status,
            recipient_email,
            started_at,
            finished_at,
            duration_ms,
            pending_count,
            completed_count,
            all_count,
            error_message,
            triggered_by_user_id
        )
        OUTPUT INSERTED.id
        VALUES (
            @runMode,
            @status,
            @recipientEmail,
            GETDATE(),
            CASE WHEN @status = 'skipped' THEN GETDATE() ELSE NULL END,
            CASE WHEN @status = 'skipped' THEN 0 ELSE NULL END,
            @pendingCount,
            @completedCount,
            @allCount,
            @errorMessage,
            @triggeredByUserId
        )
        `,
        {
            runMode,
            status,
            recipientEmail: recipientEmail || null,
            triggeredByUserId,
            pendingCount,
            completedCount,
            allCount,
            errorMessage: errorMessage ? String(errorMessage).slice(0, 1000) : null,
        }
    );

    return rows[0]?.id || null;
}

async function finalizeMailLogSuccess(logId, { pendingCount, completedCount, allCount }) {
    if (!logId) {
        return;
    }

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_logs
        SET
            status = 'success',
            finished_at = GETDATE(),
            duration_ms = DATEDIFF_BIG(MILLISECOND, started_at, GETDATE()),
            pending_count = @pendingCount,
            completed_count = @completedCount,
            all_count = @allCount,
            error_message = NULL
        WHERE id = @logId
        `,
        {
            logId,
            pendingCount,
            completedCount,
            allCount,
        }
    );
}

async function finalizeMailLogFailure(logId, { pendingCount, completedCount, allCount, errorMessage }) {
    if (!logId) {
        return;
    }

    await execute(
        DB_NAME,
        `
        UPDATE dbo.complaint_mail_logs
        SET
            status = 'failed',
            finished_at = GETDATE(),
            duration_ms = DATEDIFF_BIG(MILLISECOND, started_at, GETDATE()),
            pending_count = @pendingCount,
            completed_count = @completedCount,
            all_count = @allCount,
            error_message = @errorMessage
        WHERE id = @logId
        `,
        {
            logId,
            pendingCount,
            completedCount,
            allCount,
            errorMessage: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function getMailLogs(limit = 20) {
    await ensureSetup();

    return query(
        DB_NAME,
        `
        SELECT TOP (@limit)
            l.id,
            l.run_mode,
            l.status,
            l.recipient_email,
            l.started_at,
            l.finished_at,
            l.duration_ms,
            l.pending_count,
            l.completed_count,
            l.all_count,
            l.error_message,
            l.triggered_by_user_id,
            u.username AS triggered_by_username
        FROM dbo.complaint_mail_logs l
        LEFT JOIN dbo.users u
            ON u.id = l.triggered_by_user_id
        ORDER BY l.started_at DESC, l.id DESC
        `,
        {
            limit: Number.isInteger(limit) && limit > 0 ? limit : 20,
        }
    );
}

module.exports = {
    ensureSetup,
    getSettings,
    updateSettings,
    markRunStarted,
    markRunSucceeded,
    markRunFailed,
    createMailLog,
    finalizeMailLogSuccess,
    finalizeMailLogFailure,
    getMailLogs,
};
