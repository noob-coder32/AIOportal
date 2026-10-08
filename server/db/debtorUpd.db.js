const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // ⚠️ change this

// =========================
// INSERT ENTRY
// =========================
async function insertEntry(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO debtorUpd (
           division_id,
           target_div_id,
           acc_type,
           party_code,
           party_name,
           gl_code,
           gl_name,
           requested_by
        )
        VALUES (
           @division_id,
           @target_div_id,
           @acc_type,
           @party_code,
           @party_name,
           @gl_code,
           @gl_name,
           @requested_by
        )
        `,
        data
    );
}

// =========================
// GET ALL ENTRIES
// =========================
async function getEntries() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM debtorUpd
        ORDER BY created_at DESC
        `
    );
}

module.exports = {
    insertEntry,
    getEntries,
}; 