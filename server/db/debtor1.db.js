const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // ⚠️ set this correctly

/* =========================
   GET ENTRIES
========================= */
async function getEntries(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            debtor_id,
            debtor_code,
            NULLIF(LTRIM(RTRIM(debtor_name)), '') AS debtor_name,
            credit_limit,
            credit_days
        FROM debtor
        WHERE
            debtor_name LIKE @search
            OR debtor_code LIKE @search
        ORDER BY debtor_name
        `,
        { search: `${search}%` }
    );
}

/* =========================
   GET BY ID
========================= */
async function getById(id) {
    const rows = await query(
        DB_NAME,
        `
        SELECT
            debtor_id,
            debtor_code,
            NULLIF(LTRIM(RTRIM(debtor_name)), '') AS debtor_name,
            credit_limit,
            credit_days
        FROM debtor
        WHERE debtor_id = @id
        `,
        { id }
    );

    return rows[0];
}

/* =========================
   UPDATE ENTRY
========================= */
async function updateEntry(id, credit_limit, credit_days) {
    return execute(
        DB_NAME,
        `
        UPDATE debtor
        SET
            credit_limit = @credit_limit,
            credit_days = @credit_days
        WHERE debtor_id = @id
        `,
        { id, credit_limit, credit_days }
    );
}

/* =========================
   INSERT LOG
========================= */
async function insertLog(debtorId, fieldName, oldValue, newValue, userId) {
    return execute(
        DB_NAME,
        `
        INSERT INTO debtor1_update_logs
        (
            debtor_id,
            field_name,
            old_value,
            new_value,
            updated_by
        )
        VALUES
        (
            @debtorId,
            @fieldName,
            @oldValue,
            @newValue,
            @userId
        )
        `,
        {
            debtorId,
            fieldName,
            oldValue,
            newValue,
            userId
        }
    );
}


// =========================
// GET LOGS
// =========================    
async function getLogs(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            d.debtor_code,
            l.field_name,
            l.old_value,
            l.new_value,
            u.username AS updated_by,
            l.updated_on
        FROM debtor1_update_logs l
        LEFT JOIN debtor d
            ON l.debtor_id = d.debtor_id
        LEFT JOIN users u
            ON l.updated_by = u.id
        WHERE d.debtor_code LIKE @search
        ORDER BY l.updated_on DESC
        `,
        { search: `%${search}%` }
    );
}

module.exports = {
    getEntries,
    getById,
    updateEntry,
    insertLog,
    getLogs
};
