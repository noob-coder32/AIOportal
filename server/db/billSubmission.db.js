const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

async function getRequests() {
    return query(
        DB_NAME,
        `
        SELECT
            id,
            bill_submission_reference_no,
            division,
            bill_submission_date,
            supplier_code,
            total_bill_amount,
            created_by,
            created_at
        FROM bill_submission_requests
        ORDER BY id DESC
        `
    );
}

async function createRequest(data) {
    return execute(
        DB_NAME,
        `
        INSERT INTO bill_submission_requests
        (
            bill_submission_reference_no,
            division,
            bill_submission_date,
            supplier_code,
            total_bill_amount,
            created_by
        )
        VALUES
        (
            @bill_submission_reference_no,
            @division,
            @bill_submission_date,
            @supplier_code,
            @total_bill_amount,
            @created_by
        )
        `,
        data
    );
}

module.exports = {
    getRequests,
    createRequest
};
