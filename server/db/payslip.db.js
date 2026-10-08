// backend/db/payslip.db.js

const { query } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/**
 * ------------------------------------------
 * Get all payroll cycles
 * ------------------------------------------
 * Used to populate dropdown in frontend
 */
async function getPayrollCycles() {
    return query(
        DB_NAME,
        `
        SELECT DISTINCT payroll_cycle_name
        FROM payslipdata
        ORDER BY payroll_cycle_name DESC
        `
    );
}

/**
 * ------------------------------------------
 * Get employees with flexible filters
 * ------------------------------------------
 * filters = {
 *   cycle: "JAN 2026",            // REQUIRED
 *   division: "ARL STEEL...",     // OPTIONAL
 *   category: "Worker",           // OPTIONAL
 *   subCategory: "Permanent",     // OPTIONAL
 *   department: "Production"      // OPTIONAL
 * }
 */


async function getEmployees(filters) {
    if (!filters?.cycle) {
        throw new Error("Payroll cycle is required");
    }

    let sql = `
        SELECT DISTINCT
            employee_id,
            employee_code,
            emp_name AS employee_name,
            division_name,
            category_name,
            sub_category_name,
            department_name
        FROM payslipdata
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

    if (filters.subCategory) {
        sql += ` AND sub_category_name = @subCategory`;
        params.subCategory = filters.subCategory;
    }

    if (filters.department) {
        sql += ` AND department_name = @department`;
        params.department = filters.department;
    }

    sql += ` ORDER BY emp_name`;

    return query(DB_NAME, sql, params);
}

/**
 * ------------------------------------------
 * Get filter dropdown options for a cycle
 * ------------------------------------------
 */
async function getFilterOptions(cycle) {
    if (!cycle) {
        throw new Error("Payroll cycle is required");
    }

    const divisions = await query(DB_NAME, `
        SELECT DISTINCT division_name
        FROM payslipdata
        WHERE payroll_cycle_name = @cycle
        ORDER BY division_name
    `, { cycle });

    const categories = await query(DB_NAME, `
        SELECT DISTINCT category_name
        FROM payslipdata
        WHERE payroll_cycle_name = @cycle
        ORDER BY category_name
    `, { cycle });

    const subCategories = await query(DB_NAME, `
        SELECT DISTINCT sub_category_name
        FROM payslipdata
        WHERE payroll_cycle_name = @cycle
        ORDER BY sub_category_name
    `, { cycle });

    const departments = await query(DB_NAME, `
        SELECT DISTINCT department_name
        FROM payslipdata
        WHERE payroll_cycle_name = @cycle
        ORDER BY department_name
    `, { cycle });

    return {
        divisions: divisions.map(r => r.division_name),
        categories: categories.map(r => r.category_name),
        subCategories: subCategories.map(r => r.sub_category_name),
        departments: departments.map(r => r.department_name),
    };
}

/**
 * ------------------------------------------
 * Get full payslip rows for one employee
 * ------------------------------------------
 * Returns MULTIPLE rows (one per salary head)
 */

async function getPayslipRows(employeeId, cycle) {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM payslipdata
        WHERE employee_id = @employeeId
          AND payroll_cycle_name = @cycle
        ORDER BY
        CASE 
            -- EARNINGS
            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) IN ('BASIC 1')
                THEN -2
                
            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) = 'BASIC 2'
                THEN -1

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) IN ('BASIC & DA','CONS. SALARY')
                THEN 0

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) IN ('ADD CONS SALARY')
                THEN 1

            WHEN head_type = 'ERN'  
                AND UPPER(LTRIM(RTRIM(head_name))) = 'VDA 1'
                THEN 2
            
            WHEN head_type = 'ERN'  
                AND UPPER(LTRIM(RTRIM(head_name))) = 'VDA 2'
                THEN 3

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) IN ('SPL. ALLW.','TRAINEE ALLOW')
                THEN 4

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) = 'H.R.A.'
                THEN 5

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'SHIFT ALLOW%'
                THEN 6

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'WASH%'
                THEN 7

            WHEN head_type = 'ERN' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'MED%'
                THEN 8


            -- DEDUCTIONS
            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'PROVIDENT%'
                THEN 101

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'E.S.I%'
                THEN 102

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'PROFESSIONAL%'
                THEN 103

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'CANTEEN%'
                THEN 104

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'FESTIVAL%'
                THEN 105

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'ADV%'
                THEN 106

            WHEN head_type = 'DED' 
                AND UPPER(LTRIM(RTRIM(head_name))) LIKE 'CO-OP%'
                THEN 107

            ELSE 999
        END,
        UPPER(LTRIM(RTRIM(head_name)))

        `,
        { employeeId, cycle }
    );
}


module.exports = {
    getPayrollCycles,
    getEmployees,
    getPayslipRows,
    getFilterOptions,
};
