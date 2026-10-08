// backend/db/qa.db.js
const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/**
 * --------------------------------
 * Get coils (from view)
 * --------------------------------
 */
async function getCoils(search = "") {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM coil_view
        WHERE coil_no LIKE @search
        `,
        { search: `%${search}%` }
    );
}

/**
 * --------------------------------
 * Get single coil (for delete check)
 * --------------------------------
 */
async function getCoilById(id) {
    const rows = await query(
        DB_NAME,
        `
        SELECT id, coil_no, despach_ok
        FROM coil_view
        WHERE id = @id
        `,
        { id }
    );

    return rows[0];
}

/**
 * --------------------------------
 * Insert audit log
 * --------------------------------
 */
async function insertAuditLog(coilId, coilNo, action, performedBy) {
    return execute(
        DB_NAME,
        `
        INSERT INTO coil_audit_log
            (coil_id, coil_no, action, performed_by)
        VALUES
            (@coilId, @coilNo, @action, @performedBy)
        `,
        {
            coilId,
            coilNo,
            action,
            performedBy,
        }
    );
}

/**
 * --------------------------------
 * Delete coil (hard delete)
 * --------------------------------
 */
async function deleteCoil(id) {
    return execute(
        DB_NAME,
        `
        DELETE FROM coil_master
        WHERE id = @id
        `,
        { id }
    );
}

/**
 * --------------------------------
 * Get audit logs
 * --------------------------------
 */
async function getAuditLogs(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            id,
            coil_no,
            action,
            performed_by,
            performed_at
        FROM coil_audit_log
        WHERE coil_no LIKE @search
        ORDER BY performed_at DESC
        `,
        { search: `%${search}%` }
    );
}

async function createCoilRequest({
    coil_no,
    thickness,
    qty,
    length,
    requested_by
}) {
    return execute(
        DB_NAME,
        `
        INSERT INTO coil_requests
        (coil_no, thickness, qty, length, requested_by)
        VALUES
        (@coil_no, @thickness, @qty, @length, @requested_by)
        `,
        {
            coil_no,
            thickness,
            qty,
            length,
            requested_by
        }
    );
}

// For admin: get all requests, for user: get own requests
async function getCoilRequests(username, isAdmin) {
    if (isAdmin) {
        return query(
            DB_NAME,
            `
            SELECT *
            FROM coil_requests
            ORDER BY requested_at DESC
            `
        );
    }

    return query(
        DB_NAME,
        `
        SELECT *
        FROM coil_requests
        WHERE requested_by = @username
        ORDER BY requested_at DESC
        `,
        { username }
    );
}

module.exports = {
    getCoils,
    getCoilById,
    insertAuditLog,
    deleteCoil,
    getAuditLogs,
    createCoilRequest,
    getCoilRequests
};
