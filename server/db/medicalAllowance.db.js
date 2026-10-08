const { query, execute } = require("./mssql");
const {
    ensureMedicalAllowanceTables,
    refreshMedicalAllowanceCycle,
} = require("../scripts/create-medical-allowance-table");

const DB_NAME = process.env.DB_NAME;

function normalizeIdList(ids = []) {
    return [...new Set(
        ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

function buildEmployeeFilterSql(filters = {}, alias = "src") {
    let sql = "";
    const params = {};

    if (filters.search) {
        sql += `
            AND (
                ${alias}.employee_code LIKE @search
                OR ${alias}.emp_name LIKE @search
            )
        `;
        params.search = `%${filters.search}%`;
    }

    if (filters.division) {
        sql += ` AND ${alias}.division_name = @division`;
        params.division = filters.division;
    }

    if (filters.category) {
        sql += ` AND ${alias}.category_name = @category`;
        params.category = filters.category;
    }

    if (filters.department) {
        sql += ` AND ${alias}.department_name = @department`;
        params.department = filters.department;
    }

    return { sql, params };
}

async function ensureSetup() {
    await ensureMedicalAllowanceTables();
}

async function getCycles() {
    await ensureSetup();

    return query(
        DB_NAME,
        `
        SELECT DISTINCT payroll_cycle_name
        FROM dbo.payslip_medical_allowance
        ORDER BY payroll_cycle_name DESC
        `
    );
}

async function getSelectionCycles() {
    await ensureSetup();

    return query(
        DB_NAME,
        `
        SELECT DISTINCT payroll_cycle_name
        FROM dbo.payslipdata
        ORDER BY payroll_cycle_name DESC
        `
    );
}

async function getFilterOptions(cycle) {
    await ensureSetup();

    if (!cycle) {
        throw new Error("Payroll cycle is required");
    }

    const divisions = await query(DB_NAME, `
        SELECT DISTINCT division_name
        FROM dbo.payslip_medical_allowance
        WHERE payroll_cycle_name = @cycle
        ORDER BY division_name
    `, { cycle });

    const categories = await query(DB_NAME, `
        SELECT DISTINCT category_name
        FROM dbo.payslip_medical_allowance
        WHERE payroll_cycle_name = @cycle
        ORDER BY category_name
    `, { cycle });

    const departments = await query(DB_NAME, `
        SELECT DISTINCT department_name
        FROM dbo.payslip_medical_allowance
        WHERE payroll_cycle_name = @cycle
        ORDER BY department_name
    `, { cycle });

    return {
        divisions: divisions.map((r) => r.division_name),
        categories: categories.map((r) => r.category_name),
        departments: departments.map((r) => r.department_name),
    };
}

async function getMedicalAllowanceRecords(filters) {
    await ensureSetup();

    if (!filters?.cycle) {
        throw new Error("Payroll cycle is required");
    }

    let sql = `
        SELECT
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
        FROM dbo.payslip_medical_allowance
        WHERE payroll_cycle_name = @cycle
    `;

    const params = { cycle: filters.cycle };

    if (filters.division) {
        sql += ` AND division_name = @division`;
        params.division = filters.division;
    }

    if (filters.category) {
        sql += ` AND category_name = @category`;
        params.category = filters.category;
    }

    if (filters.department) {
        sql += ` AND department_name = @department`;
        params.department = filters.department;
    }

    sql += ` ORDER BY emp_name`;

    return query(DB_NAME, sql, params);
}


async function getSourceEmployees(filters) {
    await ensureSetup();

    if (!filters?.cycle) {
        throw new Error("Payroll cycle is required");
    }

    const filterSql = buildEmployeeFilterSql(filters, "src");
    let sql = `
        ;WITH src AS (
            SELECT
                employee_id,
                MAX(employee_code) AS employee_code,
                MAX(emp_name) AS emp_name,
                MAX(division_name) AS division_name,
                MAX(category_name) AS category_name,
                MAX(sub_category_name) AS sub_category_name,
                MAX(department_name) AS department_name
            FROM dbo.payslipdata
            WHERE payroll_cycle_name = @cycle
            GROUP BY employee_id
        )
        SELECT
            src.employee_id,
            src.employee_code,
            src.emp_name,
            src.division_name,
            src.category_name,
            src.sub_category_name,
            src.department_name,
            CAST(CASE WHEN master.employee_id IS NULL THEN 0 ELSE 1 END AS BIT) AS is_selected
        FROM src
        LEFT JOIN dbo.medical_allowance_master AS master
            ON master.employee_id = src.employee_id
           AND master.is_active = 1
        WHERE 1 = 1
    `;

    const params = { cycle: filters.cycle, ...filterSql.params };
    sql += filterSql.sql;

    if (filters.showSelectedOnly) {
        sql += ` AND master.employee_id IS NOT NULL`;
    }

    sql += ` ORDER BY src.emp_name, src.employee_code`;

    return query(DB_NAME, sql, params);
}

async function getMasterEmployees(filters = {}) {
    await ensureSetup();

    const filterSql = buildEmployeeFilterSql(filters, "master");
    let sql = `
        SELECT
            id,
            employee_id,
            employee_code,
            emp_name,
            division_name,
            category_name,
            sub_category_name,
            department_name,
            is_active,
            created_at,
            updated_at
        FROM dbo.medical_allowance_master AS master
        WHERE is_active = 1
    `;

    sql += filterSql.sql;
    sql += ` ORDER BY master.emp_name, master.employee_code`;

    return query(DB_NAME, sql, filterSql.params);
}

async function saveSelection({ cycle, addEmployeeIds = [], removeEmployeeIds = [] }) {
    await ensureSetup();

    const normalizedAddIds = normalizeIdList(addEmployeeIds);
    const normalizedRemoveIds = normalizeIdList(removeEmployeeIds);

    if (normalizedAddIds.length > 0 && !cycle) {
        throw new Error("Payroll cycle is required when adding employees");
    }

    let added = 0;
    let removed = 0;

    if (normalizedAddIds.length > 0) {
        const addCsv = normalizedAddIds.join(",");

        await execute(DB_NAME, `
            ;WITH requested AS (
                SELECT TRY_CONVERT(BIGINT, value) AS employee_id
                FROM STRING_SPLIT(@addCsv, ',')
                WHERE TRY_CONVERT(BIGINT, value) IS NOT NULL
            ),
            src AS (
                SELECT
                    p.employee_id,
                    MAX(p.employee_code) AS employee_code,
                    MAX(p.emp_name) AS emp_name,
                    MAX(p.division_name) AS division_name,
                    MAX(p.category_name) AS category_name,
                    MAX(p.sub_category_name) AS sub_category_name,
                    MAX(p.department_name) AS department_name
                FROM dbo.payslipdata AS p
                INNER JOIN requested AS requested
                    ON requested.employee_id = p.employee_id
                WHERE p.payroll_cycle_name = @cycle
                GROUP BY p.employee_id
            )
            MERGE dbo.medical_allowance_master AS target
            USING src AS source
            ON target.employee_id = source.employee_id
            WHEN MATCHED THEN
                UPDATE SET
                    employee_code = source.employee_code,
                    emp_name = source.emp_name,
                    division_name = source.division_name,
                    category_name = source.category_name,
                    sub_category_name = source.sub_category_name,
                    department_name = source.department_name,
                    is_active = 1,
                    updated_at = SYSUTCDATETIME()
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
                    employee_id,
                    employee_code,
                    emp_name,
                    division_name,
                    category_name,
                    sub_category_name,
                    department_name,
                    is_active,
                    updated_at
                )
                VALUES (
                    source.employee_id,
                    source.employee_code,
                    source.emp_name,
                    source.division_name,
                    source.category_name,
                    source.sub_category_name,
                    source.department_name,
                    1,
                    SYSUTCDATETIME()
                );
        `, { addCsv, cycle });

        const addResult = await query(DB_NAME, `
            SELECT COUNT_BIG(*) AS rows
            FROM dbo.medical_allowance_master
            WHERE is_active = 1
              AND employee_id IN (
                  SELECT TRY_CONVERT(BIGINT, value)
                  FROM STRING_SPLIT(@addCsv, ',')
                  WHERE TRY_CONVERT(BIGINT, value) IS NOT NULL
              )
        `, { addCsv });

        added = Number(addResult[0]?.rows || 0);
    }

    if (normalizedRemoveIds.length > 0) {
        const removeCsv = normalizedRemoveIds.join(",");

        removed = await execute(DB_NAME, `
            UPDATE dbo.medical_allowance_master
            SET
                is_active = 0,
                updated_at = SYSUTCDATETIME()
            WHERE is_active = 1
              AND employee_id IN (
                  SELECT TRY_CONVERT(BIGINT, value)
                  FROM STRING_SPLIT(@removeCsv, ',')
                  WHERE TRY_CONVERT(BIGINT, value) IS NOT NULL
              )
        `, { removeCsv });
    }

    return {
        added,
        removed,
    };
}

async function refreshCycle(cycle) {
    await ensureSetup();

    const rows = await refreshMedicalAllowanceCycle(cycle);
    return { cycle, rows };
}

module.exports = {
    getCycles,
    getSelectionCycles,
    getFilterOptions,
    getMedicalAllowanceRecords,
    getSourceEmployees,
    getMasterEmployees,
    saveSelection,
    refreshCycle,
    ensureSetup,
};
