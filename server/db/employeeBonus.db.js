// backend/db/employeeBonus.db.js
const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/**
 * Get filter options (divisions and categories)
 */
async function getFilterOptions() {
    const divisions = await query(
        DB_NAME,
        `
        SELECT DISTINCT division_name
        FROM payslipdata
        ORDER BY division_name
        `
    );

    const categories = await query(
        DB_NAME,
        `
        SELECT DISTINCT category_name
        FROM payslipdata
        ORDER BY category_name
        `
    );

    return {
        divisions: divisions.map(row => row.division_name),
        categories: categories.map(row => row.category_name),
    };
}

/**
 * Save employee bonus
 */
async function saveEmployeeBonus(data) {

    const {
        employee_code,
        name,
        bonus,
        division,
        category,
        sub_category,
        effective_date
    } = data;
    
    return execute(
        DB_NAME,
        `
        INSERT INTO employee_bonus
        (
            employee_code,
            name,
            bonus,
            division,
            category,
            sub_category,
            effective_date,
            created_at
        )
        VALUES
        (
            @employee_code,
            @name,
            @bonus,
            @division,
            @category,
            @sub_category,
            @effective_date,
            GETDATE()
        )
        `,
        {
            employee_code,
            name,
            bonus,
            division,
            category,
            sub_category,
            effective_date,
        }
    );
}

/**
 * Get all employee bonuses
 */
async function getEmployeeBonuses() {
    return query(
        DB_NAME,
        `
        SELECT
            id,
            employee_code,
            name,
            bonus,
            division,
            category,
            sub_category,
            effective_date,
            created_at
        FROM employee_bonus
        ORDER BY created_at DESC
        `
    );
}

module.exports = {
    getFilterOptions,
    saveEmployeeBonus,
    getEmployeeBonuses,
};