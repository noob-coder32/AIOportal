require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { execute, query } = require("../db/mssql");

const DB_NAME = process.env.DB_NAME;

async function ensureMedicalAllowanceTables() {
    if (!DB_NAME) {
        throw new Error("DB_NAME is missing in backend/.env");
    }

    await execute(DB_NAME, `
        IF OBJECT_ID('dbo.payslip_medical_allowance', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.payslip_medical_allowance (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                payroll_cycle_name NVARCHAR(100) NOT NULL,
                payroll_cycle_id BIGINT NULL,
                month_cycle_days INT NULL,
                employee_id BIGINT NOT NULL,
                employee_code NVARCHAR(100) NOT NULL,
                emp_name NVARCHAR(255) NULL,
                division_name NVARCHAR(255) NULL,
                category_name NVARCHAR(255) NULL,
                sub_category_name NVARCHAR(255) NULL,
                department_name NVARCHAR(255) NULL,
                payable_days DECIMAL(18,2) NULL,
                total_basic_cons DECIMAL(18,2) NOT NULL,
                medical_allowance_rate DECIMAL(18,0) NOT NULL,
                payable_medical_allowance DECIMAL(18,0) NULL,
                created_at DATETIME2(0) NOT NULL
                    CONSTRAINT DF_payslip_medical_allowance_created_at DEFAULT SYSUTCDATETIME()
            );

            CREATE UNIQUE INDEX UX_payslip_medical_allowance_employee_cycle
                ON dbo.payslip_medical_allowance (payroll_cycle_name, employee_id);
        END
    `);

    await execute(DB_NAME, `
        IF OBJECT_ID('dbo.payslip_medical_allowance', 'U') IS NOT NULL
        BEGIN
            ALTER TABLE dbo.payslip_medical_allowance
            ALTER COLUMN medical_allowance_rate DECIMAL(18,0) NOT NULL;

            ALTER TABLE dbo.payslip_medical_allowance
            ALTER COLUMN payable_medical_allowance DECIMAL(18,0) NULL;
        END
    `);

    await execute(DB_NAME, `
        IF OBJECT_ID('dbo.medical_allowance_master', 'U') IS NULL
        BEGIN
            CREATE TABLE dbo.medical_allowance_master (
                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                employee_id BIGINT NOT NULL,
                employee_code NVARCHAR(100) NOT NULL,
                emp_name NVARCHAR(255) NULL,
                division_name NVARCHAR(255) NULL,
                category_name NVARCHAR(255) NULL,
                sub_category_name NVARCHAR(255) NULL,
                department_name NVARCHAR(255) NULL,
                is_active BIT NOT NULL
                    CONSTRAINT DF_medical_allowance_master_is_active DEFAULT 1,
                created_at DATETIME2(0) NOT NULL
                    CONSTRAINT DF_medical_allowance_master_created_at DEFAULT SYSUTCDATETIME(),
                updated_at DATETIME2(0) NULL
            );

            CREATE UNIQUE INDEX UX_medical_allowance_master_employee
                ON dbo.medical_allowance_master (employee_id);
        END
    `);

    await seedMedicalAllowanceMasterIfEmpty();
}

async function seedMedicalAllowanceMasterIfEmpty() {
    await execute(DB_NAME, `
        IF EXISTS (
            SELECT 1
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'payslip_medical_allowance'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM dbo.medical_allowance_master
        )
        BEGIN
            ;WITH seed_rows AS (
                SELECT
                    employee_id,
                    MAX(employee_code) AS employee_code,
                    MAX(emp_name) AS emp_name,
                    MAX(division_name) AS division_name,
                    MAX(category_name) AS category_name,
                    MAX(sub_category_name) AS sub_category_name,
                    MAX(department_name) AS department_name
                FROM dbo.payslip_medical_allowance
                GROUP BY employee_id
            )
            INSERT INTO dbo.medical_allowance_master (
                employee_id,
                employee_code,
                emp_name,
                division_name,
                category_name,
                sub_category_name,
                department_name,
                is_active
            )
            SELECT
                employee_id,
                employee_code,
                emp_name,
                division_name,
                category_name,
                sub_category_name,
                department_name,
                1
            FROM seed_rows;
        END
    `);
}

function getRefreshSourceSql() {
    return `
        ;WITH employee_cycle AS (
            SELECT
                src.payroll_cycle_name,
                src.payroll_cycle_id,
                CASE UPPER(LEFT(LTRIM(RTRIM(src.payroll_cycle_name)), 3))
                    WHEN 'JAN' THEN 1 WHEN 'FEB' THEN 2 WHEN 'MAR' THEN 3 WHEN 'APR' THEN 4
                    WHEN 'MAY' THEN 5 WHEN 'JUN' THEN 6 WHEN 'JUL' THEN 7 WHEN 'AUG' THEN 8
                    WHEN 'SEP' THEN 9 WHEN 'OCT' THEN 10 WHEN 'NOV' THEN 11 WHEN 'DEC' THEN 12
                END AS month_no,
                TRY_CONVERT(INT, RIGHT(LTRIM(RTRIM(src.payroll_cycle_name)), 4)) AS cycle_year,
                src.employee_id,
                MAX(src.employee_code) AS employee_code,
                MAX(src.emp_name) AS emp_name,
                MAX(src.division_name) AS division_name,
                MAX(src.category_name) AS category_name,
                MAX(src.sub_category_name) AS sub_category_name,
                MAX(src.department_name) AS department_name,
                MAX(src.payable_Days) AS payable_days,
                SUM(CASE
                    WHEN src.head_type = 'ERN'
                     AND UPPER(REPLACE(LTRIM(RTRIM(src.head_name)), '.', '')) IN (
                        'BASIC & DA',
                        'CONS SALARY',
                        'BASIC 1',
                        'BASIC 2',
                        'ADD CONS SALARY'  
                     )
                    THEN CONVERT(DECIMAL(18,2), src.head_default_amount)
                    ELSE 0
                END) AS total_basic_cons,
                
                SUM(CASE
                    WHEN src.head_type = 'ERN'
                    AND UPPER(REPLACE(LTRIM(RTRIM(src.head_name)), '.', '')) IN (
                        'BASIC & DA',
                        'CONS SALARY',
                        'BASIC 1',
                        'BASIC 2',
                        'ADD CONS SALARY'
                    )
                    THEN CONVERT(DECIMAL(18,2), src.head_actual_amount)
                    ELSE 0
                END) AS total_basic_cons_actual

            FROM dbo.payslipdata AS src
            INNER JOIN dbo.medical_allowance_master AS master
                ON master.employee_id = src.employee_id
               AND master.is_active = 1
            WHERE (@cycle IS NULL OR src.payroll_cycle_name = @cycle)
            GROUP BY
                src.payroll_cycle_name,
                src.payroll_cycle_id,
                src.employee_id
        ),
        calculated AS (
            SELECT
                payroll_cycle_name,
                payroll_cycle_id,
                CASE
                    WHEN month_no IS NULL OR cycle_year IS NULL THEN NULL
                    ELSE DAY(EOMONTH(DATEFROMPARTS(cycle_year, month_no, 1)))
                END AS month_cycle_days,
                employee_id,
                employee_code,
                emp_name,
                division_name,
                category_name,
                sub_category_name,
                department_name,
                payable_days,
                total_basic_cons,
                total_basic_cons_actual,
                ROUND(total_basic_cons / 12.0, 0) AS medical_allowance_rate
            FROM employee_cycle
        )
        MERGE dbo.payslip_medical_allowance AS target
        USING (
            SELECT
                payroll_cycle_name,
                payroll_cycle_id,
                month_cycle_days,
                employee_id,
                employee_code,
                emp_name,
                division_name,
                category_name,
                sub_category_name,
                department_name,
                payable_days,
                total_basic_cons,
                medical_allowance_rate,
                CASE
                    WHEN month_cycle_days IS NULL OR month_cycle_days = 0 OR payable_days IS NULL THEN NULL
                    ELSE ROUND((total_basic_cons_actual) / 12, 0)
                END AS payable_medical_allowance
            FROM calculated
        ) AS source
        ON target.payroll_cycle_name = source.payroll_cycle_name
           AND target.employee_id = source.employee_id
        WHEN MATCHED THEN
            UPDATE SET
                payroll_cycle_id = source.payroll_cycle_id,
                month_cycle_days = source.month_cycle_days,
                employee_code = source.employee_code,
                emp_name = source.emp_name,
                division_name = source.division_name,
                category_name = source.category_name,
                sub_category_name = source.sub_category_name,
                department_name = source.department_name,
                payable_days = source.payable_days,
                total_basic_cons = source.total_basic_cons,
                medical_allowance_rate = source.medical_allowance_rate,
                payable_medical_allowance = source.payable_medical_allowance
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (
                payroll_cycle_name,
                payroll_cycle_id,
                month_cycle_days,
                employee_id,
                employee_code,
                emp_name,
                division_name,
                category_name,
                sub_category_name,
                department_name,
                payable_days,
                total_basic_cons,
                medical_allowance_rate,
                payable_medical_allowance
            )
            VALUES (
                source.payroll_cycle_name,
                source.payroll_cycle_id,
                source.month_cycle_days,
                source.employee_id,
                source.employee_code,
                source.emp_name,
                source.division_name,
                source.category_name,
                source.sub_category_name,
                source.department_name,
                source.payable_days,
                source.total_basic_cons,
                source.medical_allowance_rate,
                source.payable_medical_allowance
            );
    `;
}

async function refreshMedicalAllowanceCycle(cycle) {
    if (!cycle) {
        throw new Error("Payroll cycle is required");
    }

    await ensureMedicalAllowanceTables();

    await execute(DB_NAME, getRefreshSourceSql(), { cycle });

    await execute(DB_NAME, `
        DELETE target
        FROM dbo.payslip_medical_allowance AS target
        WHERE target.payroll_cycle_name = @cycle
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.payslipdata AS src
              INNER JOIN dbo.medical_allowance_master AS master
                  ON master.employee_id = src.employee_id
                 AND master.is_active = 1
              WHERE src.payroll_cycle_name = @cycle
                AND src.employee_id = target.employee_id
          );
    `, { cycle });

    const count = await query(DB_NAME, `
        SELECT COUNT_BIG(*) AS rows
        FROM dbo.payslip_medical_allowance
        WHERE payroll_cycle_name = @cycle
    `, { cycle });

    return Number(count[0]?.rows || 0);
}

async function refreshMedicalAllowanceAllCycles() {
    await ensureMedicalAllowanceTables();

    const cycles = await query(DB_NAME, `
        SELECT DISTINCT payroll_cycle_name
        FROM dbo.payslipdata
        ORDER BY payroll_cycle_name
    `);

    const results = [];

    for (const row of cycles) {
        const cycle = row.payroll_cycle_name;
        const rows = await refreshMedicalAllowanceCycle(cycle);
        results.push({ cycle, rows });
    }

    return results;
}

async function main() {
    const cycleArg = process.argv.slice(2).join(" ").trim() || null;

    await ensureMedicalAllowanceTables();

    if (cycleArg) {
        const rows = await refreshMedicalAllowanceCycle(cycleArg);
        console.log(`Refreshed dbo.payslip_medical_allowance for ${cycleArg} with ${rows} rows.`);
        return;
    }

    const results = await refreshMedicalAllowanceAllCycles();
    const totalRows = results.reduce((sum, item) => sum + item.rows, 0);
    console.log(`Refreshed ${results.length} cycle(s) with ${totalRows} total rows.`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    ensureMedicalAllowanceTables,
    refreshMedicalAllowanceCycle,
    refreshMedicalAllowanceAllCycles,
};
