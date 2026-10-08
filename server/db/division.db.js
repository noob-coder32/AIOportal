const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // ⚠️ same DB where you created table

// 🔹 GET all records
async function getAllRequests() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM payrollUpd_request
        ORDER BY id DESC
        `
    );
}

// 🔹 CREATE new record
async function createRequest(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO payrollUpd_request
        (division_id, month_id, year_id, month_name, employee_code, requested_by)
        VALUES (@division_id, @month_id, @year_id, @month_name, @employee_code, @requested_by)
        `,
        data
    );
}

// 🔹 DELETE record
async function deleteRequest(id) {
    return execute(
        DB_NAME,
        `
        DELETE FROM payrollUpd_request
        WHERE id = @id
        `,
        { id }
    );
}

module.exports = {
    getAllRequests,
    createRequest,
};