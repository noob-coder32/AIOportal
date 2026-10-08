require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureCoilLineEntryTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.coil_line_entries', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.coil_line_entries (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                coil_no NVARCHAR(100) NOT NULL,
                production_line NVARCHAR(100) NOT NULL,
                updated_date_time DATETIME2 NULL,
                created_by INT NULL,
                created_on DATETIME2 NOT NULL DEFAULT GETDATE()
            );
        END
        `
    );

    await execute(
        DB_NAME,
        `
        IF OBJECT_ID('dbo.coil_line_entry_logs', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.coil_line_entry_logs (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                entry_id BIGINT NOT NULL,
                action NVARCHAR(50) NOT NULL,
                field_name NVARCHAR(100) NOT NULL,
                old_value NVARCHAR(MAX) NULL,
                new_value NVARCHAR(MAX) NULL,
                updated_by INT NULL,
                updated_on DATETIME2 NOT NULL DEFAULT GETDATE()
            );
        END
        `
    );

    console.log("Coil line entry tables ensured.");
}

ensureCoilLineEntryTables().catch(console.error);
