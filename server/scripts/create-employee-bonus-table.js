require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureEmployeeBonusTable() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(DB_NAME, `
        IF OBJECT_ID('dbo.employee_bonus', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.employee_bonus (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                employee_code NVARCHAR(100) NOT NULL,
                name NVARCHAR(255) NOT NULL,
                bonus DECIMAL(18,2) NOT NULL,
                division NVARCHAR(255) NOT NULL,
                category NVARCHAR(255) NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT GETDATE()
            );
        END
    `);

    console.log("Employee bonus table ensured.");
}

ensureEmployeeBonusTable().catch(console.error);