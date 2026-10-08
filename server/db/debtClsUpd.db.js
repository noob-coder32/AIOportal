const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // ⚠️ change this

// =========================
// INSERT ENTRY
// =========================
async function insertEntry(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO debtClsUpd (
            div_id,    
            app_date, 
            src_dbtClassId, 
            tgt_dbtClassId, 
            requested_by 
        )
        VALUES (
           @div_id,
           @app_date,
           @src_dbtClassId,
           @tgt_dbtClassId,
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
        FROM debtClsUpd
        ORDER BY created_at DESC
        `
    );
}

module.exports = {
    insertEntry,
    getEntries,
}; 