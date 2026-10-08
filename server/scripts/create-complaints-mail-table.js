require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureComplaintMailTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.complaint_mail_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.complaint_mail_settings (
                id INT NOT NULL PRIMARY KEY,
                recipient_email NVARCHAR(1000) NULL,
                is_enabled BIT NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_is_enabled DEFAULT 0,
                send_time_hhmm CHAR(5) NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_send_time DEFAULT '08:30',
                last_run_at DATETIME2 NULL,
                last_success_at DATETIME2 NULL,
                last_error NVARCHAR(1000) NULL,
                updated_at DATETIME2 NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_updated_at DEFAULT GETDATE()
            );
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'recipient_email') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD recipient_email NVARCHAR(1000) NULL;
        END

        IF EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.complaint_mail_settings')
              AND name = 'recipient_email'
              AND max_length < 2000
        )
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ALTER COLUMN recipient_email NVARCHAR(1000) NULL;
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'is_enabled') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD is_enabled BIT NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_is_enabled_v2 DEFAULT 0;
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'send_time_hhmm') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD send_time_hhmm CHAR(5) NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_send_time_v2 DEFAULT '08:30';
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'last_run_at') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD last_run_at DATETIME2 NULL;
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'last_success_at') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD last_success_at DATETIME2 NULL;
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'last_error') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD last_error NVARCHAR(1000) NULL;
        END

        IF COL_LENGTH('dbo.complaint_mail_settings', 'updated_at') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_settings
                ADD updated_at DATETIME2 NOT NULL
                    CONSTRAINT DF_complaint_mail_settings_updated_at_v2 DEFAULT GETDATE();
        END

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.complaint_mail_settings
            WHERE id = 1
        )
        BEGIN
            INSERT INTO dbo.complaint_mail_settings (
                id,
                recipient_email,
                is_enabled,
                send_time_hhmm
            )
            VALUES (1, NULL, 0, '08:30');
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.complaint_mail_logs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.complaint_mail_logs (
                id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                run_mode NVARCHAR(20) NOT NULL,
                status NVARCHAR(20) NOT NULL,
                recipient_email NVARCHAR(1000) NULL,
                started_at DATETIME2 NOT NULL,
                finished_at DATETIME2 NULL,
                duration_ms BIGINT NULL,
                pending_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_pending_count DEFAULT 0,
                completed_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_completed_count DEFAULT 0,
                all_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_all_count DEFAULT 0,
                error_message NVARCHAR(1000) NULL,
                triggered_by_user_id INT NULL
            );
        END

        IF COL_LENGTH('dbo.complaint_mail_logs', 'recipient_email') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_logs
                ADD recipient_email NVARCHAR(1000) NULL;
        END

        IF EXISTS (
            SELECT 1
            FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.complaint_mail_logs')
              AND name = 'recipient_email'
              AND max_length < 2000
        )
        BEGIN
            ALTER TABLE dbo.complaint_mail_logs
                ALTER COLUMN recipient_email NVARCHAR(1000) NULL;
        END

        IF COL_LENGTH('dbo.complaint_mail_logs', 'pending_count') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_logs
                ADD pending_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_pending_count_v2 DEFAULT 0;
        END

        IF COL_LENGTH('dbo.complaint_mail_logs', 'completed_count') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_logs
                ADD completed_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_completed_count_v2 DEFAULT 0;
        END

        IF COL_LENGTH('dbo.complaint_mail_logs', 'all_count') IS NULL
        BEGIN
            ALTER TABLE dbo.complaint_mail_logs
                ADD all_count INT NOT NULL
                    CONSTRAINT DF_complaint_mail_logs_all_count_v2 DEFAULT 0;
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'IX_complaint_mail_logs_started_at'
              AND object_id = OBJECT_ID('dbo.complaint_mail_logs')
        )
        BEGIN
            CREATE INDEX IX_complaint_mail_logs_started_at
                ON dbo.complaint_mail_logs (started_at DESC, id DESC);
        END
        `
    );
}

if (require.main === module) {
    ensureComplaintMailTables().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    ensureComplaintMailTables,
};
