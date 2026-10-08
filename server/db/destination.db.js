const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME; // change if destinations table is in another DB

/* =========================
   SEARCH DESTINATIONS
========================= */

async function searchDestinations(search = "") {
    return query(
        DB_NAME,
        `
        SELECT
            destination_id,
            destination_code,
            destination_name,
            NULLIF(LTRIM(RTRIM(distname)), '') AS distname,
            NULLIF(LTRIM(RTRIM(pincode)), '') AS pincode
        FROM destinations
        WHERE
            destination_name LIKE @search
            OR destination_code LIKE @search
        ORDER BY destination_name
        `,
        { search: `${search}%` }
    );
}

/* =========================
   GET DESTINATION BY ID
========================= */

async function getDestinationById(id) {
    const rows = await query(
        DB_NAME,
        `
        SELECT
            destination_id,
            NULLIF(LTRIM(RTRIM(distname)), '') AS distname,
            NULLIF(LTRIM(RTRIM(pincode)), '') AS pincode
        FROM destinations
        WHERE destination_id = @id
        `,
        { id }
    );

    return rows[0];
}

/* =========================
   UPDATE DESTINATION
========================= */

async function updateDestination(id, distname, pincode) {
    return execute(
        DB_NAME,
        `
        UPDATE destinations
        SET
            distname = COALESCE(@distname, distname),
            pincode = COALESCE(@pincode, pincode)
        WHERE destination_id = @id
        `,
        { id, distname, pincode }
    );
}

async function insertDestinationLog(destinationId, fieldName, oldValue, newValue, userId) {
    return execute(
        DB_NAME,
        `
        INSERT INTO destination_update_logs
        (
            destination_id,
            field_name,
            old_value,
            new_value,
            updated_by
        )
        VALUES
        (
            @destinationId,
            @fieldName,
            @oldValue,
            @newValue,
            @userId
        )
        `,
        {
            destinationId,
            fieldName,
            oldValue,
            newValue,
            userId
        }
    );
}

async function  getDestinationLogs() {
    return query(
        DB_NAME,
        `
        SELECT
            d.destination_id,
            d.destination_code,
            l.field_name,
            l.old_value,
            l.new_value,
            u.username,
            l.updated_on,
            l.log_id
        FROM destination_update_logs l
        LEFT JOIN destinations d
            ON l.destination_id = d.destination_id
        LEFT JOIN users u
            ON l.updated_by = u.id
        ORDER BY l.updated_on DESC
        `
    );
}
module.exports = {
    searchDestinations,
    getDestinationById,
    updateDestination,
    insertDestinationLog,
    getDestinationLogs
};