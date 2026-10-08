require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureDebtor1MailTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.debtor1_mail_settings', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.debtor1_mail_settings (
                id INT NOT NULL PRIMARY KEY,
                recipient_email NVARCHAR(2000) NULL,
                is_enabled BIT NOT NULL
                    CONSTRAINT DF_debtor1_mail_settings_enabled DEFAULT 0,
                send_time_hhmm CHAR(5) NOT NULL
                    CONSTRAINT DF_debtor1_mail_settings_time DEFAULT '08:30',
                last_run_at DATETIME2 NULL,
                last_success_at DATETIME2 NULL,
                last_error NVARCHAR(1000) NULL,
                last_row_count INT NOT NULL
                    CONSTRAINT DF_debtor1_mail_settings_row_count DEFAULT 0,
                last_successful_report_date DATE NULL,
                updated_at DATETIME2 NOT NULL
                    CONSTRAINT DF_debtor1_mail_settings_updated DEFAULT GETDATE()
            );
        END

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'recipient_email') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD recipient_email NVARCHAR(2000) NULL;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'is_enabled') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD is_enabled BIT NOT NULL CONSTRAINT DF_debtor1_mail_settings_enabled_v2 DEFAULT 0;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'send_time_hhmm') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD send_time_hhmm CHAR(5) NOT NULL CONSTRAINT DF_debtor1_mail_settings_time_v2 DEFAULT '08:30';

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'last_run_at') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD last_run_at DATETIME2 NULL;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'last_success_at') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD last_success_at DATETIME2 NULL;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'last_error') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD last_error NVARCHAR(1000) NULL;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'last_row_count') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD last_row_count INT NOT NULL CONSTRAINT DF_debtor1_mail_settings_row_count_v2 DEFAULT 0;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'last_successful_report_date') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD last_successful_report_date DATE NULL;

        IF COL_LENGTH('dbo.debtor1_mail_settings', 'updated_at') IS NULL
            ALTER TABLE dbo.debtor1_mail_settings ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_debtor1_mail_settings_updated_v2 DEFAULT GETDATE();

        IF NOT EXISTS (
            SELECT 1 FROM dbo.debtor1_mail_settings WHERE id = 1
        )
        BEGIN
            INSERT INTO dbo.debtor1_mail_settings (id, recipient_email, is_enabled, send_time_hhmm)
            VALUES (1, NULL, 0, '08:30');
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.debtor1_mail_delivery_log', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.debtor1_mail_delivery_log (
                report_date DATE NOT NULL PRIMARY KEY,
                status NVARCHAR(20) NOT NULL,
                attempted_at DATETIME2 NULL,
                sent_at DATETIME2 NULL,
                row_count INT NOT NULL
                    CONSTRAINT DF_debtor1_mail_delivery_row_count DEFAULT 0,
                error_message NVARCHAR(1000) NULL
            );

            CREATE INDEX IX_debtor1_mail_delivery_status
                ON dbo.debtor1_mail_delivery_log (status, report_date);
        END
        `
    );
}

module.exports = { ensureDebtor1MailTables };
