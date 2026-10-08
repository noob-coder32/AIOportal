const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

async function getAllEntries() {
    return query(
        DB_NAME,
        `
        SELECT
            e.id,
            e.coil_no,
            e.production_line,
            e.updated_date_time,
            e.created_on,
            u.username AS created_by
        FROM coil_line_entries e
        LEFT JOIN users u
            ON e.created_by = u.id
        ORDER BY e.created_on DESC, e.id DESC
        `
    );
}

async function createEntry({ coil_no, production_line, created_by }) {
    const rows = await query(
        DB_NAME,
        `
        INSERT INTO coil_line_entries
        (
            coil_no,
            production_line,
            updated_date_time,
            created_by,
            created_on
        )
        OUTPUT INSERTED.id
        VALUES
        (
            @coil_no,
            @production_line,
            NULL,
            @created_by,
            GETDATE()
        )
        `,
        {
            coil_no,
            production_line,
            created_by,
        }
    );

    return rows[0];
}

async function insertLog(entryId, action, fieldName, oldValue, newValue, userId) {
    return execute(
        DB_NAME,
        `
        INSERT INTO coil_line_entry_logs
        (
            entry_id,
            action,
            field_name,
            old_value,
            new_value,
            updated_by,
            updated_on
        )
        VALUES
        (
            @entryId,
            @action,
            @fieldName,
            @oldValue,
            @newValue,
            @userId,
            GETDATE()
        )
        `,
        {
            entryId,
            action,
            fieldName,
            oldValue,
            newValue,
            userId,
        }
    );
}

async function getLogs() {
    return query(
        DB_NAME,
        `
        SELECT
            l.id,
            l.entry_id,
            e.coil_no,
            e.production_line,
            l.action,
            l.field_name,
            l.old_value,
            l.new_value,
            u.username AS updated_by,
            l.updated_on
        FROM coil_line_entry_logs l
        LEFT JOIN coil_line_entries e
            ON l.entry_id = e.id
        LEFT JOIN users u
            ON l.updated_by = u.id
        ORDER BY l.updated_on DESC, l.id DESC
        `
    );
}

module.exports = {
    getAllEntries,
    createEntry,
    insertLog,
    getLogs,
};
