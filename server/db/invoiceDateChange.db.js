// backend/db/invoiceDateChange.db.js

const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // same DB you used

async function createRequest(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO invoice_date_change_requests
        (invoice_no, invoice_date, to_be_invoice_date,
         division_id, party_code, invoice_type, requested_by)
        VALUES
        (@invoice_no, @invoice_date, @to_be_invoice_date,
         @division_id, @party_code, @invoice_type, @requested_by)
        `,
        data
    );
}

async function getRequests() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM invoice_date_change_requests
        ORDER BY created_at DESC
        `
    );
}

module.exports = {
    createRequest,
    getRequests
};