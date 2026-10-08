const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;
const SETTINGS_ROW_ID = 1;
let setupPromise = null;

function normalizeSchedulerSettings(row = {}) {
    return {
        isEnabled: Boolean(row.is_enabled),
        runTimeHhmm: row.run_time_hhmm || "23:00",
        lastRunAt: row.last_run_at || null,
        lastSuccessAt: row.last_success_at || null,
        lastError: row.last_error || "",
        lastUpdatedCount: Number(row.last_updated_count) || 0,
        updatedAt: row.updated_at || null,
    };
}

async function ensureSetup() {
    if (setupPromise) {
        return setupPromise;
    }

    setupPromise = (async () => {
        const { ensureDefaultCredLimitSchedulerTable } = require("../scripts/create-default-cred-limit-scheduler-table");
        await ensureDefaultCredLimitSchedulerTable();
    })().catch((error) => {
        setupPromise = null;
        throw error;
    });

    return setupPromise;
}

async function getEntries(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            debtor_id,
            debtor_code,
            NULLIF(LTRIM(RTRIM(debtor_name)), '') AS debtor_name,
            default_cred_limit
        FROM debtor
        WHERE
            debtor_code LIKE @search
            OR debtor_name LIKE @search
        ORDER BY debtor_name
        `,
        { search: `%${search}%` }
    );
}

async function updateEntry(id, default_cred_limit) {
    return execute(
        DB_NAME,
        `
        UPDATE debtor
        SET default_cred_limit = @default_cred_limit
        WHERE debtor_id = @id
        `,
        { id, default_cred_limit }
    );
}

async function getEntryById(id) {
    const rows = await query(
        DB_NAME,
        `
        SELECT
            debtor_id,
            debtor_code,
            NULLIF(LTRIM(RTRIM(debtor_name)), '') AS debtor_name,
            default_cred_limit
        FROM debtor
        WHERE debtor_id = @id
        `,
        { id }
    );

    return rows[0];
}

async function insertUpdateLog({
    debtorId,
    debtorCode,
    debtorName,
    oldDefaultCredLimit,
    newDefaultCredLimit,
    updatedBy,
}) {
    return execute(
        DB_NAME,
        `
        INSERT INTO dbo.default_cred_limit_update_logs
        (
            debtor_id,
            debtor_code,
            debtor_name,
            old_default_cred_limit,
            new_default_cred_limit,
            updated_by
        )
        VALUES
        (
            @debtorId,
            @debtorCode,
            @debtorName,
            @oldDefaultCredLimit,
            @newDefaultCredLimit,
            @updatedBy
        )
        `,
        {
            debtorId,
            debtorCode,
            debtorName,
            oldDefaultCredLimit,
            newDefaultCredLimit,
            updatedBy,
        }
    );
}

async function getUpdateLogs(search = "") {
    await ensureSetup();

    return query(
        DB_NAME,
        `
        SELECT TOP (500)
            l.id,
            l.debtor_id,
            l.debtor_code,
            l.debtor_name,
            l.old_default_cred_limit,
            l.new_default_cred_limit,
            u.username AS updated_by,
            l.updated_on
        FROM dbo.default_cred_limit_update_logs l
        LEFT JOIN dbo.users u
            ON u.id = l.updated_by
        WHERE
            l.debtor_code LIKE @search
            OR l.debtor_name LIKE @search
        ORDER BY l.updated_on DESC, l.id DESC
        `,
        { search: `%${search}%` }
    );
}

async function getSchedulerSettings() {
    await ensureSetup();

    const rows = await query(
        DB_NAME,
        `
        SELECT
            is_enabled,
            run_time_hhmm,
            last_run_at,
            last_success_at,
            last_error,
            last_updated_count,
            updated_at
        FROM dbo.default_cred_limit_scheduler_settings
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );

    return normalizeSchedulerSettings(rows[0]);
}

async function updateSchedulerSettings({ isEnabled, runTimeHhmm }) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.default_cred_limit_scheduler_settings
        SET
            is_enabled = @isEnabled,
            run_time_hhmm = @runTimeHhmm,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            isEnabled: isEnabled ? 1 : 0,
            runTimeHhmm,
        }
    );

    return getSchedulerSettings();
}

async function markSchedulerRunStarted() {
    await execute(
        DB_NAME,
        `
        UPDATE dbo.default_cred_limit_scheduler_settings
        SET last_run_at = GETDATE(), last_error = NULL, updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markSchedulerRunSucceeded(updatedCount) {
    await execute(
        DB_NAME,
        `
        UPDATE dbo.default_cred_limit_scheduler_settings
        SET
            last_success_at = GETDATE(),
            last_updated_count = @updatedCount,
            last_error = NULL,
            updated_at = GETDATE()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID, updatedCount }
    );
}

async function markSchedulerRunFailed(errorMessage) {
    await execute(
        DB_NAME,
        `
        UPDATE dbo.default_cred_limit_scheduler_settings
        SET last_error = @lastError, updated_at = GETDATE()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            lastError: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function applyDefaultCreditLimits() {
    await ensureSetup();

    return execute(
        DB_NAME,
        `
        UPDATE debtor
        SET credit_limit = default_cred_limit
        WHERE default_cred_limit IS NOT NULL
        `
    );
}

module.exports = {
    ensureSetup,
    getEntries,
    updateEntry,
    getEntryById,
    insertUpdateLog,
    getUpdateLogs,
    getSchedulerSettings,
    updateSchedulerSettings,
    markSchedulerRunStarted,
    markSchedulerRunSucceeded,
    markSchedulerRunFailed,
    applyDefaultCreditLimits,
};
