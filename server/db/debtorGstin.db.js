const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/* =========================
   SEARCH DEBTOR BY CODE
   (For autofill debtor_name)
========================= */
async function searchDebtorByCode(code = "") {
    return query(
        DB_NAME,
        `
        SELECT
            debtor_code,
            NULLIF(LTRIM(RTRIM(debtor_name)), '') AS debtor_name
        FROM fa_debtor_master
        WHERE LTRIM(RTRIM(debtor_code)) = LTRIM(RTRIM(@code))
        ORDER BY debtor_name
        `,
        { code }
    );
}

/* =========================
   INSERT NEW GSTIN REQUEST
========================= */
async function insertRequest(debtor_code, debtor_name, gstin, state, userId) {
    return execute(
        DB_NAME,
        `
        INSERT INTO debtor_gstin_requests
        (
            debtor_code,
            debtor_name,
            gstin,
            state,
            created_by,
            created_on
        )
        VALUES
        (
            @debtor_code,
            @debtor_name,
            @gstin,
            @state,
            @userId,
            GETDATE()
        )
        `,
        {
            debtor_code,
            debtor_name,
            gstin,
            state,
            userId
        }
    );
}

/* =========================
   GET ALL REQUESTS
========================= */
async function getAllRequests(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            r.id,
            r.debtor_code,
            r.debtor_name,
            r.gstin,
            r.state,
            r.created_by,
            u.username AS created_by_username,
            r.created_on,
            r.updated_by,
            r.updated_on
        FROM debtor_gstin_requests r
        LEFT JOIN users u
            ON r.created_by = u.id
        WHERE
            r.debtor_code LIKE @search
            OR r.debtor_name LIKE @search
        ORDER BY r.created_on DESC
        `,
        { search: `${search}%` }
    );
}

/* =========================
   GET REQUEST BY ID
========================= */
async function getRequestById(id) {
    const rows = await query(
        DB_NAME,
        `
        SELECT
            id,
            debtor_code,
            debtor_name,
            gstin,
            state,
            created_by,
            created_on,
            updated_by,
            updated_on
        FROM debtor_gstin_requests
        WHERE id = @id
        `,
        { id }
    );

    return rows[0];
}

/* =========================
   UPDATE REQUEST
========================= */
async function updateRequest(id, gstin, state, userId) {
    return execute(
        DB_NAME,
        `
        UPDATE debtor_gstin_requests
        SET
            gstin = COALESCE(@gstin, gstin),
            state = COALESCE(@state, state),
            updated_by = @userId,
            updated_on = GETDATE()
        WHERE id = @id
        `,
        { id, gstin, state, userId }
    );
}

/* =========================
   INSERT AUDIT LOG
========================= */
async function insertLog(requestId, fieldName, oldValue, newValue, userId) {
    return execute(
        DB_NAME,
        `
        INSERT INTO debtor_gstin_requests_logs
        (
            request_id,
            field_name,
            old_value,
            new_value,
            updated_by,
            updated_on
        )
        VALUES
        (
            @requestId,
            @fieldName,
            @oldValue,
            @newValue,
            @userId,
            GETDATE()
        )
        `,
        {
            requestId,
            fieldName,
            oldValue,
            newValue,
            userId
        }
    );
}

/* =========================
   GET ALL LOGS
========================= */
async function getLogs() {
    return query(
        DB_NAME,
        `
        SELECT
            l.id,
            r.debtor_code,
            r.debtor_name,
            l.field_name,
            l.old_value,
            l.new_value,
            u.username AS updated_by,
            l.updated_on
        FROM debtor_gstin_requests_logs l
        LEFT JOIN debtor_gstin_requests r
            ON l.request_id = r.id
        LEFT JOIN users u
            ON l.updated_by = u.id
        ORDER BY l.updated_on DESC
        `
    );
}

module.exports = {
    searchDebtorByCode,
    insertRequest,
    getAllRequests,
    getRequestById,
    updateRequest,
    insertLog,
    getLogs
};
