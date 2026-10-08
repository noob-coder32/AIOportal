const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/* ===============================
   GET ACTIVE EMPLOYEES
=============================== */
async function getEmployees() {
    return query(
        DB_NAME,
        `
        SELECT
            id,
            employee_code,
            employee_name,
            email,
            unit_name,
            created_at
        FROM testmail
        WHERE is_active = 1
        ORDER BY employee_code
        `
    );
}

/* ===============================
   ADD EMPLOYEE
=============================== */
async function addEmployee(
    employee_code,
    employee_name,
    email,
    unit_name
) {
    return execute(
        DB_NAME,
        `
        INSERT INTO testmail
        (
            employee_code,
            employee_name,
            email,
            unit_name
        )
        VALUES
        (
            @employee_code,
            @employee_name,
            @email,
            @unit_name
        )
        `,
        {
            employee_code,
            employee_name,
            email,
            unit_name
        }
    );
}

/* ===============================
   UPDATE EMPLOYEE
=============================== */
async function updateEmployee(
    id,
    employee_code,
    employee_name,
    email,
    unit_name
) {
    return execute(
        DB_NAME,
        `
        UPDATE testmail
        SET
            employee_code = @employee_code,
            employee_name = @employee_name,
            email = @email,
            unit_name = @unit_name
        WHERE id = @id
        `,
        {
            id,
            employee_code,
            employee_name,
            email,
            unit_name
        }
    );
}

/* ===============================
   SOFT DELETE
=============================== */
async function deleteEmployee(id) {
    return execute(
        DB_NAME,
        `
        UPDATE testmail
        SET is_active = 0
        WHERE id = @id
        `,
        { id }
    );
}

module.exports = {
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee
};