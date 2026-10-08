const { query } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

async function getWorkOrderHeaderById(poHdrId) {
    const rows = await query(
        DB_NAME,
        `
        SELECT TOP 1 *
        FROM po_hdr
        WHERE po_hdr_id = @po_hdr_id
        ORDER BY TRY_CONVERT(BIGINT, po_hdr_id) DESC
        `,
        { po_hdr_id: poHdrId }
    );
 
    return rows[0] || null;
}

async function getWorkOrderHeaderByPoNo(poNo) {
    const rows = await query(
        DB_NAME,
        `
        SELECT TOP 1 *
        FROM po_hdr
        WHERE po_no = @po_no
        ORDER BY TRY_CONVERT(BIGINT, po_hdr_id) DESC
        `,
        { po_no: poNo }
    );

    return rows[0] || null;
}

async function getWorkOrderDetails(poHdrId) {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM po_dtl
        WHERE po_hdr_id = @po_hdr_id
        ORDER BY sl_no, rec_id
        `,
        { po_hdr_id: poHdrId }
    );
}

async function getWorkOrderTerms(poHdrId) {
    return query(
        DB_NAME,
        `
        SELECT clause_head, clause_id, clause_text
        FROM po_terms
        WHERE po_hdr_id = @po_hdr_id
        ORDER BY clause_id, clause_head
        `,
        { po_hdr_id: poHdrId }
    );
}

async function getAllWorkOrderHeaders() {
    return query(
        DB_NAME,
        `
        WITH ranked_work_orders AS (
            SELECT *,
                   ROW_NUMBER() OVER (
                       PARTITION BY po_hdr_id
                       ORDER BY TRY_CONVERT(BIGINT, po_hdr_id) DESC, po_no DESC
                   ) AS row_num
            FROM po_hdr
            WHERE UPPER(LTRIM(RTRIM(ISNULL(heading, '')))) IN ('WORK ORDER', 'PURCHASE ORDER')
        )
        SELECT *
        FROM ranked_work_orders
        WHERE row_num = 1
        ORDER BY
            TRY_CONVERT(INT, company_id) ASC,
            CASE
                WHEN TRY_CONVERT(INT, company_id) = 1
                     AND LTRIM(RTRIM(ISNULL(division_name, ''))) = 'ARL ASBESTOS ASSAM DIVISION)' THEN 1
                WHEN TRY_CONVERT(INT, company_id) = 1
                     AND LTRIM(RTRIM(ISNULL(division_name, ''))) = 'ARL STEEL ASSAM DIVISION' THEN 2
                WHEN TRY_CONVERT(INT, company_id) = 2
                     AND LTRIM(RTRIM(ISNULL(division_name, ''))) = 'PDP ASSAM DIVISION' THEN 1
                WHEN TRY_CONVERT(INT, company_id) = 3
                     AND LTRIM(RTRIM(ISNULL(division_name, ''))) = 'NERPL ASSAM DIVISION' THEN 1
                ELSE 999
            END
        `
    );
}

module.exports = {
    getAllWorkOrderHeaders,
    getWorkOrderHeaderById,
    getWorkOrderHeaderByPoNo,
    getWorkOrderDetails,
    getWorkOrderTerms,
};
