const { query, execute } = require("./mssql");
const { sql, getAwsPool, awsQuery } = require("./awsMssql");
const { attendanceSourceQuery } = require("./attendanceSourceMssql");
const { ensureAttendanceSyncTables } = require("../scripts/create-attendance-sync-table");

const DB_NAME = process.env.DB_NAME;
const SETTINGS_ROW_ID = 1;
const RECENT_MONTH_WINDOW = 2;
const LOCAL_SCAN_CHUNK_SIZE = 5000;
const AWS_EXISTENCE_CHUNK_SIZE = 600;
const CHECKINOUT_COLUMNS = [
    "USERID",
    "CHECKTIME",
    "CHECKTYPE",
    "VERIFYCODE",
    "SENSORID",
    "WorkCode",
    "sn",
    "UserExtFmt",
    "Memoinfo",
];

const CHECKINOUT_INSERT_COLUMNS = [
    ...CHECKINOUT_COLUMNS,
];

let cachedCheckinoutSchema = null;
let cachedAwsCheckinoutKeyColumns = null;
let setupPromise = null;
let indexesPromise = null;
let indexesEnsured = false;

function parsePendingPreview(value) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function normalizeSettings(row = {}) {
    return {
        isEnabled: Boolean(row.is_enabled),
        intervalMinutes: Number(row.interval_minutes) || 15,
        lastRunAt: row.last_run_at || null,
        lastSuccessAt: row.last_success_at || null,
        lastError: row.last_error || "",
        lastSyncedChecktime: row.last_synced_checktime || null,
        pendingCount: Number(row.pending_count || 0),
        pendingPreviewRows: parsePendingPreview(row.pending_preview_json),
        pendingSnapshotAt: row.pending_snapshot_at || null,
        pendingScanStatus: row.pending_scan_status || "idle",
        pendingScanStartedAt: row.pending_scan_started_at || null,
        pendingScanFinishedAt: row.pending_scan_finished_at || null,
        pendingScanDurationMs: row.pending_scan_duration_ms ?? null,
        pendingScanError: row.pending_scan_error || "",
        updatedAt: row.updated_at || null,
    };
}

function buildLogFilters({ mode, status, limit }) {
    const clauses = [];
    const params = {
        limit: Number.isInteger(limit) && limit > 0 ? limit : 25,
    };

    if (mode) {
        clauses.push("l.run_mode = @mode");
        params.mode = mode;
    }

    if (status) {
        clauses.push("l.status = @status");
        params.status = status;
    }

    return {
        whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
        params,
    };
}
 
function mapSchemaType(column) {
    const dataType = String(column.DATA_TYPE || "").toLowerCase();
    const maxLength = Number(column.CHARACTER_MAXIMUM_LENGTH);
    const precision = Number(column.NUMERIC_PRECISION);
    const scale = Number(column.NUMERIC_SCALE);

    switch (dataType) {
        case "bigint":
            return sql.BigInt;
        case "int":
            return sql.Int;
        case "smallint":
            return sql.SmallInt;
        case "tinyint":
            return sql.TinyInt;
        case "bit":
            return sql.Bit;
        case "datetime":
            return sql.DateTime;
        case "datetime2":
            return sql.DateTime2(scale >= 0 ? scale : 7);
        case "smalldatetime":
            return sql.SmallDateTime;
        case "date":
            return sql.Date;
        case "time":
            return sql.Time(scale >= 0 ? scale : 7);
        case "decimal":
        case "numeric":
            return sql.Decimal(precision || 18, scale || 0);
        case "float":
            return sql.Float;
        case "real":
            return sql.Real;
        case "money":
            return sql.Money;
        case "smallmoney":
            return sql.SmallMoney;
        case "nvarchar":
            return sql.NVarChar(maxLength < 0 ? sql.MAX : maxLength || 255);
        case "varchar":
            return sql.VarChar(maxLength < 0 ? sql.MAX : maxLength || 255);
        case "nchar":
            return sql.NChar(maxLength || 1);
        case "char":
            return sql.Char(maxLength || 1);
        case "text":
            return sql.Text;
        case "ntext":
            return sql.NText;
        default:
            throw new Error(`Unsupported CHECKINOUT column type: ${column.COLUMN_NAME} (${column.DATA_TYPE})`);
    }
}

async function ensureAttendanceIndexes() {
    if (indexesEnsured) {
        return;
    }

    if (indexesPromise) {
        return indexesPromise;
    }

    indexesPromise = (async () => {
        await attendanceSourceQuery(
            `
            IF NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE object_id = OBJECT_ID('dbo.checkinout')
                  AND name = 'IX_checkinout_attendance_sync'
            )
            BEGIN
                DECLARE @includeColumns NVARCHAR(MAX);

                SELECT @includeColumns = STUFF((
                    SELECT ', ' + QUOTENAME(c.name)
                    FROM sys.columns c
                    INNER JOIN sys.types t
                        ON c.user_type_id = t.user_type_id
                    WHERE c.object_id = OBJECT_ID('dbo.checkinout')
                      AND c.name IN ('VERIFYCODE', 'SENSORID', 'WorkCode', 'sn', 'UserExtFmt', 'Memoinfo')
                      AND t.name NOT IN ('text', 'ntext', 'image')
                    FOR XML PATH(''), TYPE
                ).value('.', 'NVARCHAR(MAX)'), 1, 2, '');

                DECLARE @sql NVARCHAR(MAX) = N'CREATE INDEX IX_checkinout_attendance_sync ON dbo.checkinout (CHECKTIME, USERID, CHECKTYPE)';

                IF @includeColumns IS NOT NULL AND LEN(@includeColumns) > 0
                BEGIN
                    SET @sql = @sql + N' INCLUDE (' + @includeColumns + N')';
                END

                EXEC sp_executesql @sql;
            END
            `
        );

        await awsQuery(
            `
            IF NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE object_id = OBJECT_ID('dbo.CHECKINOUT')
                  AND name = 'IX_CHECKINOUT_attendance_sync'
            )
            BEGIN
                CREATE INDEX IX_CHECKINOUT_attendance_sync
                    ON dbo.CHECKINOUT (CHECKTIME, USERID, CHECKTYPE);
            END
            `
        );

        indexesEnsured = true;
    })().catch((error) => {
        indexesPromise = null;
        throw error;
    });

    return indexesPromise;
}

async function ensureSetup() {
    if (setupPromise) {
        return setupPromise;
    }

    setupPromise = (async () => {
        await ensureAttendanceSyncTables();
    })().catch((error) => {
        setupPromise = null;
        throw error;
    });

    return setupPromise;
}

async function ensureAppSetup() {
    await ensureAttendanceSyncTables();
}

async function getSettings() {
    await ensureSetup();

    const rows = await query(
        DB_NAME,
        `
        SELECT
            id,
            is_enabled,
            interval_minutes,
            last_run_at,
            last_success_at,
            last_error,
            last_synced_checktime,
            pending_count,
            pending_preview_json,
            pending_snapshot_at,
            pending_scan_status,
            pending_scan_started_at,
            pending_scan_finished_at,
            pending_scan_duration_ms,
            pending_scan_error,
            updated_at
        FROM dbo.attendance_sync_settings
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );

    return normalizeSettings(rows[0]);
}

async function getPendingSnapshot() {
    await ensureAppSetup();

    const rows = await query(
        DB_NAME,
        `
        SELECT
            pending_count,
            pending_preview_json,
            pending_snapshot_at,
            pending_scan_status,
            pending_scan_started_at,
            pending_scan_finished_at,
            pending_scan_duration_ms,
            pending_scan_error
        FROM dbo.attendance_sync_settings
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );

    const settings = normalizeSettings(rows[0]);

    return {
        pendingCount: settings.pendingCount,
        previewRows: settings.pendingPreviewRows,
        pendingSnapshotAt: settings.pendingSnapshotAt,
        pendingScanStatus: settings.pendingScanStatus,
        pendingScanStartedAt: settings.pendingScanStartedAt,
        pendingScanFinishedAt: settings.pendingScanFinishedAt,
        pendingScanDurationMs: settings.pendingScanDurationMs,
        pendingScanError: settings.pendingScanError,
    };
}

async function markPendingScanStarted() {
    await ensureAppSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            pending_scan_status = 'running',
            pending_scan_started_at = GETDATE(),
            pending_scan_finished_at = NULL,
            pending_scan_duration_ms = NULL,
            pending_scan_error = NULL,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markPendingScanSucceeded({ pendingCount, previewRows }) {
    await ensureAppSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            pending_count = @pendingCount,
            pending_preview_json = @previewRowsJson,
            pending_snapshot_at = GETDATE(),
            pending_scan_status = 'success',
            pending_scan_finished_at = GETDATE(),
            pending_scan_duration_ms = DATEDIFF_BIG(MILLISECOND, pending_scan_started_at, GETDATE()),
            pending_scan_error = NULL,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            pendingCount,
            previewRowsJson: JSON.stringify(previewRows || []),
        }
    );
}

async function markPendingScanFailed(errorMessage) {
    await ensureAppSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            pending_scan_status = 'failed',
            pending_scan_finished_at = GETDATE(),
            pending_scan_duration_ms = DATEDIFF_BIG(MILLISECOND, pending_scan_started_at, GETDATE()),
            pending_scan_error = @errorMessage,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            errorMessage: String(errorMessage || "Pending scan failed").slice(0, 1000),
        }
    );
}

async function updateSettings({ isEnabled, intervalMinutes }) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            is_enabled = @isEnabled,
            interval_minutes = @intervalMinutes,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            isEnabled: isEnabled ? 1 : 0,
            intervalMinutes,
        }
    );

    return getSettings();
}

async function markSyncRunStarted() {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            last_run_at = GETDATE(),
            last_error = NULL,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        { id: SETTINGS_ROW_ID }
    );
}

async function markSyncRunSucceeded(lastSyncedChecktime) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            last_success_at = GETDATE(),
            last_error = NULL,
            last_synced_checktime = @lastSyncedChecktime,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            lastSyncedChecktime: lastSyncedChecktime || null,
        }
    );
}

async function markSyncRunFailed(errorMessage) {
    await ensureSetup();

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_settings
        SET
            last_error = @lastError,
            updated_at = SYSUTCDATETIME()
        WHERE id = @id
        `,
        {
            id: SETTINGS_ROW_ID,
            lastError: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function createSyncLog({
    runMode,
    status = "success",
    triggeredByUserId = null,
    batchSize,
    awsLatestChecktimeBeforeRun = null,
    skipReason = null,
    processedBatches = 0,
    insertedCount = 0,
    remainingCount = null,
    lastSyncedChecktimeAfterRun = null,
    errorMessage = null,
}) {
    await ensureSetup();

    const rows = await query(
        DB_NAME,
        `
        INSERT INTO dbo.attendance_sync_logs (
            run_mode,
            status,
            triggered_by_user_id,
            started_at,
            finished_at,
            duration_ms,
            batch_size,
            processed_batches,
            inserted_count,
            remaining_count,
            aws_latest_checktime_before_run,
            last_synced_checktime_after_run,
            error_message,
            skip_reason
        )
        OUTPUT INSERTED.id
        VALUES (
            @runMode,
            @status,
            @triggeredByUserId,
            GETDATE(),
            CASE WHEN @status = 'skipped' THEN GETDATE() ELSE NULL END,
            CASE WHEN @status = 'skipped' THEN 0 ELSE NULL END,
            @batchSize,
            @processedBatches,
            @insertedCount,
            @remainingCount,
            @awsLatestChecktimeBeforeRun,
            @lastSyncedChecktimeAfterRun,
            @errorMessage,
            @skipReason
        )
        `,
        {
            runMode,
            status,
            triggeredByUserId,
            batchSize,
            processedBatches,
            insertedCount,
            remainingCount,
            awsLatestChecktimeBeforeRun,
            lastSyncedChecktimeAfterRun,
            errorMessage: errorMessage ? String(errorMessage).slice(0, 1000) : null,
            skipReason: skipReason ? String(skipReason).slice(0, 200) : null,
        }
    );

    return rows[0]?.id || null;
}

async function finalizeSyncLogSuccess(logId, {
    processedBatches,
    insertedCount,
    remainingCount,
    lastSyncedChecktimeAfterRun,
}) {
    if (!logId) {
        return;
    }

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_logs
        SET
            status = 'success',
            finished_at = GETDATE(),
            duration_ms = DATEDIFF_BIG(MILLISECOND, started_at, GETDATE()),
            processed_batches = @processedBatches,
            inserted_count = @insertedCount,
            remaining_count = @remainingCount,
            last_synced_checktime_after_run = @lastSyncedChecktimeAfterRun,
            error_message = NULL,
            skip_reason = NULL
        WHERE id = @logId
        `,
        {
            logId,
            processedBatches,
            insertedCount,
            remainingCount,
            lastSyncedChecktimeAfterRun,
        }
    );
}

async function finalizeSyncLogFailure(logId, {
    processedBatches,
    insertedCount,
    remainingCount,
    lastSyncedChecktimeAfterRun,
    errorMessage,
}) {
    if (!logId) {
        return;
    }

    await execute(
        DB_NAME,
        `
        UPDATE dbo.attendance_sync_logs
        SET
            status = 'failed',
            finished_at = GETDATE(),
            duration_ms = DATEDIFF_BIG(MILLISECOND, started_at, GETDATE()),
            processed_batches = @processedBatches,
            inserted_count = @insertedCount,
            remaining_count = @remainingCount,
            last_synced_checktime_after_run = @lastSyncedChecktimeAfterRun,
            error_message = @errorMessage
        WHERE id = @logId
        `,
        {
            logId,
            processedBatches,
            insertedCount,
            remainingCount,
            lastSyncedChecktimeAfterRun,
            errorMessage: String(errorMessage || "Unknown error").slice(0, 1000),
        }
    );
}

async function getSyncLogs({ mode, status, limit }) {
    await ensureSetup();

    const filters = buildLogFilters({
        mode,
        status,
        limit,
    });

    return query(
        DB_NAME,
        `
        SELECT TOP (@limit)
            l.id,
            l.run_mode,
            l.status,
            l.triggered_by_user_id,
            u.username AS triggered_by_username,
            l.started_at,
            l.finished_at,
            l.duration_ms,
            l.batch_size,
            l.processed_batches,
            l.inserted_count,
            l.remaining_count,
            l.aws_latest_checktime_before_run,
            l.last_synced_checktime_after_run,
            l.error_message,
            l.skip_reason
        FROM dbo.attendance_sync_logs l
        LEFT JOIN dbo.users u
            ON l.triggered_by_user_id = u.id
        ${filters.whereSql}
        ORDER BY l.started_at DESC, l.id DESC
        `,
        filters.params
    );
}

async function getLatestLocalCheckTime() {
    const rows = await attendanceSourceQuery(
        `
        SELECT MAX(CHECKTIME) AS latestLocalCheckTime
        FROM dbo.checkinout
        `
    );

    return rows[0]?.latestLocalCheckTime || null;
}

async function getLatestAwsCheckTime() {
    const rows = await awsQuery(
        `
        SELECT MAX(CHECKTIME) AS latestAwsCheckTime
        FROM dbo.CHECKINOUT
        `
    );

    return rows[0]?.latestAwsCheckTime || null;
}

function buildRecentScopeParams(afterRow) {
    return {
        afterCheckTime: afterRow?.CHECKTIME || null,
        afterUserId: afterRow?.USERID || null,
        afterCheckType: afterRow?.CHECKTYPE || null,
    };
}

function normalizeKeyValue(value) {
    if (value instanceof Date) {
        return value.getTime();
    }

    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime()) && String(value).includes(":")) {
        return parsedDate.getTime();
    }

    return value ?? "";
}

function createRowKey(row, keyColumns = ["USERID", "CHECKTIME"]) {
    return keyColumns
        .map((columnName) => normalizeKeyValue(row[columnName]))
        .join("|");
}

function normalizeInsertRow(row, createdByHostIp) {
    return {
        ...row,
    };
}

async function getRecentLocalCandidates({ afterRow = null, limit = LOCAL_SCAN_CHUNK_SIZE }) {
    return attendanceSourceQuery(
        `
        SELECT TOP (@limit)
            ${CHECKINOUT_COLUMNS.join(", ")}
        FROM dbo.checkinout
        WHERE CHECKTIME >= DATEADD(MONTH, -${RECENT_MONTH_WINDOW}, GETDATE())
          AND (
              @afterCheckTime IS NULL
              OR CHECKTIME > @afterCheckTime
              OR (
                  CHECKTIME = @afterCheckTime
                  AND USERID > @afterUserId
              )
              OR (
                  CHECKTIME = @afterCheckTime
                  AND USERID = @afterUserId
                  AND CHECKTYPE > @afterCheckType
              )
          )
        ORDER BY CHECKTIME ASC, USERID ASC, CHECKTYPE ASC
        `,
        {
            limit,
            ...buildRecentScopeParams(afterRow),
        }
    );
}

async function getAwsCheckinoutKeyColumns() {
    if (cachedAwsCheckinoutKeyColumns) {
        return cachedAwsCheckinoutKeyColumns;
    }

    const rows = await awsQuery(
        `
        SELECT c.name AS column_name
        FROM sys.key_constraints kc
        INNER JOIN sys.index_columns ic
            ON kc.parent_object_id = ic.object_id
           AND kc.unique_index_id = ic.index_id
        INNER JOIN sys.columns c
            ON ic.object_id = c.object_id
           AND ic.column_id = c.column_id
        WHERE kc.parent_object_id = OBJECT_ID('dbo.CHECKINOUT')
          AND kc.type = 'PK'
        ORDER BY ic.key_ordinal
        `
    );

    const supportedColumns = new Set(CHECKINOUT_COLUMNS);
    const keyColumns = rows
        .map((row) => row.column_name)
        .filter((columnName) => supportedColumns.has(columnName));

    cachedAwsCheckinoutKeyColumns = keyColumns.length
        ? keyColumns
        : ["USERID", "CHECKTIME"];

    return cachedAwsCheckinoutKeyColumns;
}

async function getExistingAwsKeys(rows) {
    if (!rows.length) {
        return new Set();
    }

    const keyColumns = await getAwsCheckinoutKeyColumns();
    const existenceChunkSize = Math.max(
        1,
        Math.min(AWS_EXISTENCE_CHUNK_SIZE, Math.floor(2000 / keyColumns.length))
    );
    const uniqueRows = [];
    const seenKeys = new Set();

    rows.forEach((row) => {
        const key = createRowKey(row, keyColumns);

        if (seenKeys.has(key)) {
            return;
        }

        seenKeys.add(key);
        uniqueRows.push(row);
    });

    const existingKeys = new Set();

    for (let offset = 0; offset < uniqueRows.length; offset += existenceChunkSize) {
        const chunk = uniqueRows.slice(offset, offset + existenceChunkSize);
        const params = {};
        const valuesColumnsSql = keyColumns.map((columnName) => `[${columnName}]`).join(", ");
        const valuesSql = chunk
            .map((row, index) => {
                keyColumns.forEach((columnName) => {
                    params[`${columnName}${index}`] = row[columnName];
                });

                return `(${keyColumns.map((columnName) => `@${columnName}${index}`).join(", ")})`;
            })
            .join(", ");
        const joinSql = keyColumns
            .map((columnName) => `a.[${columnName}] = b.[${columnName}]`)
            .join(" AND ");

        const rowsFound = await awsQuery(
            `
            WITH batch_keys (${valuesColumnsSql}) AS (
                SELECT *
                FROM (VALUES ${valuesSql}) AS src(${valuesColumnsSql})
            )
            SELECT
                ${keyColumns.map((columnName) => `a.[${columnName}]`).join(",\n                ")}
            FROM dbo.CHECKINOUT a
            INNER JOIN batch_keys b
                ON ${joinSql}
            `,
            params
        );

        rowsFound.forEach((row) => existingKeys.add(createRowKey(row, keyColumns)));
    }

    return existingKeys;
}

async function filterUnmatchedRows(rows) {
    if (!rows.length) {
        return [];
    }

    const keyColumns = await getAwsCheckinoutKeyColumns();
    const existingKeys = await getExistingAwsKeys(rows);
    const pendingKeys = new Set();

    return rows.filter((row) => {
        const key = createRowKey(row, keyColumns);

        if (existingKeys.has(key) || pendingKeys.has(key)) {
            return false;
        }

        pendingKeys.add(key);
        return true;
    });
}

async function getPendingOverview(limit = 25) {
    await ensureAttendanceIndexes();

    const pendingRows = [];
    let afterRow = null;
    let pendingCount = 0;

    while (true) {
        const candidates = await getRecentLocalCandidates({
            afterRow,
            limit: LOCAL_SCAN_CHUNK_SIZE,
        });

        if (!candidates.length) {
            break;
        }

        const unmatchedRows = await filterUnmatchedRows(candidates);
        pendingCount += unmatchedRows.length;

        if (pendingRows.length < limit) {
            const available = limit - pendingRows.length;
            pendingRows.push(...unmatchedRows.slice(0, available));
        }

        afterRow = candidates[candidates.length - 1];
    }

    return {
        pendingCount,
        previewRows: pendingRows.slice(0, limit),
    };
}

async function getPendingCount() {
    return getPendingOverview().then((overview) => overview.pendingCount);
}

async function getPendingPreview(limit = 25) {
    return getPendingOverview(limit).then((overview) => overview.previewRows);
}

async function getPendingBatch({ afterRow = null, batchSize = 500 }) {
    await ensureAttendanceIndexes();

    const pendingRows = [];
    let cursor = afterRow;

    while (pendingRows.length < batchSize) {
        const candidates = await getRecentLocalCandidates({
            afterRow: cursor,
            limit: Math.min(batchSize - pendingRows.length, LOCAL_SCAN_CHUNK_SIZE),
        });

        if (!candidates.length) {
            return {
                rows: pendingRows,
                nextCursor: cursor,
                exhausted: true,
            };
        }

        const unmatchedRows = await filterUnmatchedRows(candidates);
        pendingRows.push(...unmatchedRows);
        cursor = candidates[candidates.length - 1];
    }

    return {
        rows: pendingRows.slice(0, batchSize),
        nextCursor: cursor,
        exhausted: false,
    };
}

async function getCheckinoutSchema() {
    if (cachedCheckinoutSchema) {
        return cachedCheckinoutSchema;
    }

    const rows = await awsQuery(
        `
        SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = 'CHECKINOUT'
          AND COLUMN_NAME IN (${CHECKINOUT_INSERT_COLUMNS.map((_, index) => `@column${index}`).join(", ")})
        ORDER BY ORDINAL_POSITION
        `,
        CHECKINOUT_INSERT_COLUMNS.reduce((params, columnName, index) => {
            params[`column${index}`] = columnName;
            return params;
        }, {})
    );

    if (rows.length !== CHECKINOUT_INSERT_COLUMNS.length) {
        throw new Error("AWS CHECKINOUT schema does not match the expected attendance sync insert columns");
    }

    cachedCheckinoutSchema = rows;
    return cachedCheckinoutSchema;
}

async function buildBulkTable(rows, createdByHostIp) {
    const schema = await getCheckinoutSchema();
    const table = new sql.Table("dbo.CHECKINOUT");
    table.create = false;

    schema.forEach((column) => {
        table.columns.add(
            column.COLUMN_NAME,
            mapSchemaType(column),
            {
                nullable: String(column.IS_NULLABLE).toUpperCase() === "YES",
            }
        );
    });

    rows.forEach((row) => {
        const insertRow = normalizeInsertRow(row, createdByHostIp);
        table.rows.add(...CHECKINOUT_INSERT_COLUMNS.map((columnName) => insertRow[columnName] ?? null));
    });

    return table;
}

async function insertBatchToAws(rows, createdByHostIp = null) {
    if (!rows.length) {
        return 0;
    }

    const pool = await getAwsPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
        const bulkTable = await buildBulkTable(rows, createdByHostIp);
        const request = new sql.Request(transaction);
        await request.bulk(bulkTable);
        await transaction.commit();
        return rows.length;
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error("Attendance sync rollback failed:", rollbackError.message);
        }

        throw error;
    }
}

module.exports = {
    CHECKINOUT_COLUMNS,
    ensureSetup,
    getSettings,
    getPendingSnapshot,
    markPendingScanStarted,
    markPendingScanSucceeded,
    markPendingScanFailed,
    updateSettings,
    markSyncRunStarted,
    markSyncRunSucceeded,
    markSyncRunFailed,
    createSyncLog,
    finalizeSyncLogSuccess,
    finalizeSyncLogFailure,
    getSyncLogs,
    getLatestLocalCheckTime,
    getLatestAwsCheckTime,
    getPendingCount,
    getPendingPreview,
    getPendingOverview,
    getPendingBatch,
    insertBatchToAws,
};
