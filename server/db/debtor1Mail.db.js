const { query, execute } = require("./mssql");
const { ensureDebtor1MailTables } = require("../scripts/create-debtor1-mail-table");

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
        lastRowCount: Number(row.last_row_count) || 0,
        lastSuccessfulReportDate: row.last_successful_report_date || null,
        updatedAt: row.updated_at || null,
    };
}

async function ensureSetup() {
    if (setupPromise) return setupPromise;

    setupPromise = ensureDebtor1MailTables().catch((error) => {
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
            recipient_email,
            is_enabled,
            send_time_hhmm,
            last_run_at,
            last_success_at,
            last_error,
            last_row_count,
            last_successful_report_date,
            updated_at
        FROM dbo.debtor1_mail_settings
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
        UPDATE dbo.debtor1_mail_settings
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
    await execute(
        DB_NAME,
        `
        UPDATE dbo.debtor1_mail_settings
        SET last_run_at = GETDATE(), last_error = NULL, updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markRunSucceeded(rowCount, reportDate) {
    await execute(
        DB_NAME,
        `
        UPDATE dbo.debtor1_mail_settings
        SET
            last_success_at = GETDATE(),
            last_row_count = @rowCount,
            last_successful_report_date = @reportDate,
            last_error = NULL,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID, rowCount, reportDate }
    );
}

async function markRunFailed(errorMessage) {
    await execute(
        DB_NAME,
        `
        UPDATE dbo.debtor1_mail_settings
        SET last_error = @lastError, updated_at = GETDATE()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            lastError: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function getReportRows() {
    throw new Error("getReportRows is no longer used; use getCreditLimitChanges instead");
}

async function getCreditLimitChanges(fromDate, toDate) {
    return query(
        DB_NAME,
        `
        SELECT
            CONVERT(varchar(10), l.updated_on, 23) AS change_date,
            d.debtor_code,
            NULLIF(LTRIM(RTRIM(d.debtor_name)), '') AS debtor_name,
            l.old_value,
            l.new_value,
            u.full_name AS updated_by,
            l.updated_on
        FROM dbo.debtor1_update_logs l
        LEFT JOIN dbo.debtor d ON l.debtor_id = d.debtor_id
        LEFT JOIN dbo.users u ON l.updated_by = u.id
        WHERE l.field_name = 'credit_limit'
          AND l.updated_on >= @fromDate
          AND l.updated_on < @toDate
        ORDER BY l.updated_on, d.debtor_code
        `,
        { fromDate, toDate }
    );
}

async function getDeliveryStatuses(fromDate, toDate) {
    await ensureSetup();
    return query(
        DB_NAME,
        `
        SELECT report_date, status, row_count, error_message
        FROM dbo.debtor1_mail_delivery_log
        WHERE report_date >= @fromDate AND report_date <= @toDate
        `,
        { fromDate, toDate }
    );
}

async function markDelivery(reportDate, status, rowCount = 0, errorMessage = null) {
    await ensureSetup();
    return execute(
        DB_NAME,
        `
        MERGE dbo.debtor1_mail_delivery_log AS target
        USING (SELECT CAST(@reportDate AS date) AS report_date) AS source
        ON target.report_date = source.report_date
        WHEN MATCHED THEN UPDATE SET
            status = @status,
            attempted_at = GETDATE(),
            sent_at = CASE WHEN @status = 'sent' THEN GETDATE() ELSE NULL END,
            row_count = @rowCount,
            error_message = @errorMessage
        WHEN NOT MATCHED THEN INSERT
            (report_date, status, attempted_at, sent_at, row_count, error_message)
        VALUES
            (source.report_date, @status, GETDATE(),
             CASE WHEN @status = 'sent' THEN GETDATE() ELSE NULL END,
             @rowCount, @errorMessage);
        `,
        {
            reportDate,
            status,
            rowCount,
            errorMessage: errorMessage ? String(errorMessage).slice(0, 1000) : null,
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
    getCreditLimitChanges,
    getDeliveryStatuses,
    markDelivery,
};
