require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureAttendanceSyncTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.attendance_sync_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.attendance_sync_settings (
                id INT NOT NULL PRIMARY KEY,
                is_enabled BIT NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_is_enabled DEFAULT 0,
                interval_minutes INT NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_interval_minutes DEFAULT 15,
                last_run_at DATETIME2 NULL,
                last_success_at DATETIME2 NULL,
                last_error NVARCHAR(1000) NULL,
                last_synced_checktime DATETIME NULL,
                pending_count BIGINT NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_pending_count DEFAULT 0,
                pending_preview_json NVARCHAR(MAX) NULL,
                pending_snapshot_at DATETIME2 NULL,
                pending_scan_status NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_pending_scan_status DEFAULT 'idle',
                pending_scan_started_at DATETIME2 NULL,
                pending_scan_finished_at DATETIME2 NULL,
                pending_scan_duration_ms BIGINT NULL,
                pending_scan_error NVARCHAR(1000) NULL,
                updated_at DATETIME2 NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_updated_at DEFAULT SYSUTCDATETIME()
            );
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_count') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_count BIGINT NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_pending_count DEFAULT 0;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_preview_json') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_preview_json NVARCHAR(MAX) NULL;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_snapshot_at') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_snapshot_at DATETIME2 NULL;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_scan_status') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_scan_status NVARCHAR(20) NOT NULL
                    CONSTRAINT DF_attendance_sync_settings_pending_scan_status DEFAULT 'idle';
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_scan_started_at') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_scan_started_at DATETIME2 NULL;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_scan_finished_at') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_scan_finished_at DATETIME2 NULL;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_scan_duration_ms') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_scan_duration_ms BIGINT NULL;
        END

        IF COL_LENGTH('dbo.attendance_sync_settings', 'pending_scan_error') IS NULL
        BEGIN
            ALTER TABLE dbo.attendance_sync_settings
                ADD pending_scan_error NVARCHAR(1000) NULL;
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.attendance_sync_settings
            WHERE id = 1
        )
        BEGIN
            INSERT INTO dbo.attendance_sync_settings (
                id,
                is_enabled,
                interval_minutes
            )
            VALUES (
                1,
                0,
                15
            )
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.attendance_sync_logs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.attendance_sync_logs (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                run_mode NVARCHAR(20) NOT NULL,
                status NVARCHAR(20) NOT NULL,
                triggered_by_user_id INT NULL,
                started_at DATETIME2 NOT NULL
                    CONSTRAINT DF_attendance_sync_logs_started_at DEFAULT GETDATE(),
                finished_at DATETIME2 NULL,
                duration_ms BIGINT NULL,
                batch_size INT NOT NULL,
                processed_batches INT NOT NULL
                    CONSTRAINT DF_attendance_sync_logs_processed_batches DEFAULT 0,
                inserted_count INT NOT NULL
                    CONSTRAINT DF_attendance_sync_logs_inserted_count DEFAULT 0,
                remaining_count INT NULL,
                aws_latest_checktime_before_run DATETIME NULL,
                last_synced_checktime_after_run DATETIME NULL,
                error_message NVARCHAR(1000) NULL,
                skip_reason NVARCHAR(200) NULL
            );

            CREATE INDEX IX_attendance_sync_logs_started_at
                ON dbo.attendance_sync_logs (started_at DESC, id DESC);
        END
        `
    );
}

if (require.main === module) {
    ensureAttendanceSyncTables().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    ensureAttendanceSyncTables,
};
