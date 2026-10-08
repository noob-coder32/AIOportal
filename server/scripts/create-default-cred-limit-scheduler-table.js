require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureDefaultCredLimitSchedulerTable() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.default_cred_limit_scheduler_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.default_cred_limit_scheduler_settings (
                id INT NOT NULL PRIMARY KEY,
                is_enabled BIT NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_enabled DEFAULT 0,
                run_time_hhmm CHAR(5) NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_time DEFAULT '23:00',
                last_run_at DATETIME2 NULL,
                last_success_at DATETIME2 NULL,
                last_error NVARCHAR(1000) NULL,
                last_updated_count INT NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_count DEFAULT 0,
                updated_at DATETIME2 NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_updated DEFAULT GETDATE()
            );
        END

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'is_enabled') IS NULL
        BEGIN
            ALTER TABLE dbo.default_cred_limit_scheduler_settings
                ADD is_enabled BIT NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_enabled_v2 DEFAULT 0;
        END

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'run_time_hhmm') IS NULL
        BEGIN
            ALTER TABLE dbo.default_cred_limit_scheduler_settings
                ADD run_time_hhmm CHAR(5) NOT NULL
                    CONSTRAINT DF_default_cred_limit_scheduler_time_v2 DEFAULT '23:00';
        END

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'last_run_at') IS NULL
            ALTER TABLE dbo.default_cred_limit_scheduler_settings ADD last_run_at DATETIME2 NULL;

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'last_success_at') IS NULL
            ALTER TABLE dbo.default_cred_limit_scheduler_settings ADD last_success_at DATETIME2 NULL;

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'last_error') IS NULL
            ALTER TABLE dbo.default_cred_limit_scheduler_settings ADD last_error NVARCHAR(1000) NULL;

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'last_updated_count') IS NULL
            ALTER TABLE dbo.default_cred_limit_scheduler_settings ADD last_updated_count INT NOT NULL CONSTRAINT DF_default_cred_limit_scheduler_count_v2 DEFAULT 0;

        IF COL_LENGTH('dbo.default_cred_limit_scheduler_settings', 'updated_at') IS NULL
            ALTER TABLE dbo.default_cred_limit_scheduler_settings ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_default_cred_limit_scheduler_updated_v2 DEFAULT GETDATE();

        IF NOT EXISTS (
            SELECT 1 FROM dbo.default_cred_limit_scheduler_settings WHERE id = 1
        )
        BEGIN
            INSERT INTO dbo.default_cred_limit_scheduler_settings (id, is_enabled, run_time_hhmm)
            VALUES (1, 0, '23:00');
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.default_cred_limit_update_logs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.default_cred_limit_update_logs (
                id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                debtor_id INT NOT NULL,
                debtor_code NVARCHAR(100) NULL,
                debtor_name NVARCHAR(255) NULL,
                old_default_cred_limit DECIMAL(18, 2) NULL,
                new_default_cred_limit DECIMAL(18, 2) NULL,
                updated_by INT NULL,
                updated_on DATETIME2 NOT NULL
                    CONSTRAINT DF_default_cred_limit_update_logs_updated DEFAULT GETDATE()
            );

            CREATE INDEX IX_default_cred_limit_update_logs_updated_on
                ON dbo.default_cred_limit_update_logs (updated_on DESC, id DESC);
        END
        `
    );
}

module.exports = { ensureDefaultCredLimitSchedulerTable };

