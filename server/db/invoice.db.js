const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // ⚠️ change this


// =========================
// INSERT INVOICE
// =========================
async function insertInvoice(data) {
    return execute(
        DB_NAME,
        ` 
        INSERT INTO invoice_requests (
            invoice_no,
            invoice_date,
            division_id,
            party_code,
            bill_amount,
            invoice_type,
            requested_by
        )
        VALUES (
            @invoice_no,
            @invoice_date,
            @division_id,
            @party_code,
            @bill_amount,
            @invoice_type,
            @requested_by
        )
        `,
        data
    );
}

// =========================
// GET ALL INVOICES
// =========================
async function getInvoices() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM invoice_requests
        ORDER BY created_at DESC
        `
    );
}

module.exports = {
    insertInvoice,
    getInvoices,
}; 