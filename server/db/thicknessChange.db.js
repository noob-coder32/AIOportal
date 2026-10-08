const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

async function createRequest(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO thickness_change_request
        (coil_no, thickness, qty,
         to_be_thickness,
         width, bundle_weight, remark,
         requested_by)
        VALUES
        (@coil_no, @thickness, @qty,
         @to_be_thickness,
         @width, @bundle_weight, @remark,
         @requested_by)
        `,
        data
    );
}

async function getRequests() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM thickness_change_request
        ORDER BY requested_at DESC
        `
    );
}

module.exports = {
    createRequest,
    getRequests
};  