// backend/db/hr.db.js
const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/* =========================
   EMPLOYEES
========================= */

async function getActiveEmployees() {
    return query(
        DB_NAME,
        `
        SELECT id, employee_code, employee_name
        FROM employees
        WHERE is_active = 1
        `
    );
}

async function getAllEmployees() {
    return query(
        DB_NAME,
        `
        SELECT id, employee_code, employee_name, is_active
        FROM employees
        `
    );
}

async function addEmployee(employee_code, employee_name) {
    return execute(
        DB_NAME,
        `
        INSERT INTO employees (employee_code, employee_name)
        VALUES (@employee_code, @employee_name)
        `,
        { employee_code, employee_name }
    );
}

async function updateEmployee(id, employee_code, employee_name) {
    return execute(
        DB_NAME,
        `
        UPDATE employees
        SET employee_code = @employee_code,
            employee_name = @employee_name
        WHERE id = @id
        `,
        { id, employee_code, employee_name }
    );
}

async function deactivateEmployee(id) {
    return execute(
        DB_NAME,
        `
        UPDATE employees
        SET is_active = 0
        WHERE id = @id
        `,
        { id }
    );
}

async function activateEmployee(id) {
    return execute(
        DB_NAME,
        `
        UPDATE employees
        SET is_active = 1
        WHERE id = @id
        `,
        { id }
    );
}

/* =========================
   HODS
========================= */

async function getActiveHods() {
    return query( 
        DB_NAME,
        `
        SELECT id, hod_name
        FROM hods
        WHERE is_active = 1
        `
    );
}

async function getAllHods() {
    return query(
        DB_NAME,
        `
        SELECT id, hod_name, is_active
        FROM hods
        `
    );
}

async function addHod(hod_name) {
    return execute(
        DB_NAME,
        `
        INSERT INTO hods (hod_name)
        VALUES (@hod_name)
        `,
        { hod_name }
    );
}

async function updateHod(id, hod_name) {
    return execute(
        DB_NAME,
        `
        UPDATE hods
        SET hod_name = @hod_name
        WHERE id = @id
        `,
        { id, hod_name }
    );
}

async function setHodStatus(id, is_active) {
    return execute(
        DB_NAME,
        `
        UPDATE hods
        SET is_active = @is_active
        WHERE id = @id
        `,
        { id, is_active: is_active ? 1 : 0 }
    );
}

/* =========================
   EMPLOYEE–HOD ASSIGNMENT
========================= */
/* =========================
   EMPLOYEE–HOD ASSIGNMENT
========================= */

async function getAssignmentByEmployee(employeeId) {
    const rows = await query(
        DB_NAME,
        `
        SELECT id
        FROM employee_hod_assignments
        WHERE employee_id = @employeeId
        `,
        { employeeId }
    );

    return rows[0];
}

async function updateAssignment(employeeId, hodId, assignedBy) {
    return execute(
        DB_NAME,
        `
        UPDATE employee_hod_assignments
        SET 
            hod_id = @hodId,
            assigned_at = GETDATE(),
            assigned_by = @assignedBy
        WHERE employee_id = @employeeId
        `,
        { employeeId, hodId, assignedBy }
    );
}

async function createAssignment(employeeId, hodId, assignedBy) {
    return execute(
        DB_NAME,
        `
        INSERT INTO employee_hod_assignments 
            (employee_id, hod_id, assigned_by)
        VALUES 
            (@employeeId, @hodId, @assignedBy)
        `,
        { employeeId, hodId, assignedBy }
    );
}

async function getAllAssignments() {
    return query(
        DB_NAME,
        `
        SELECT
            a.id,
            e.employee_code,
            e.employee_name,
            h.hod_name,
            a.assigned_at,
            a.assigned_by
        FROM employee_hod_assignments a
        JOIN employees e ON a.employee_id = e.id
        JOIN hods h ON a.hod_id = h.id
        ORDER BY a.assigned_at DESC
        `
    );
}

module.exports = {
    getActiveEmployees,
    getAllEmployees,
    addEmployee,
    updateEmployee,
    deactivateEmployee,
    activateEmployee,

    getActiveHods,
    getAllHods,
    addHod,
    updateHod,
    setHodStatus,

    getAssignmentByEmployee,
    updateAssignment,
    createAssignment,
    getAllAssignments,
};
