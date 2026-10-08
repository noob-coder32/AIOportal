const { query } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

async function createEntry(payload) {
    const rows = await query(
        DB_NAME,
        `
        INSERT INTO coil_detail_entries (
            coil_no,
            division_code,
            production_line,
            existing_thickness,
            existing_item_code,
            existing_output_qty,
            existing_output_width,
            existing_output_length,
            existing_output_grade,
            existing_output_bw,
            existing_output_logo,
            existing_output_print_thickness,
            existing_output_remarks,
            to_be_thickness,
            to_be_item_code,
            to_be_output_qty,
            to_be_output_width,
            to_be_output_length,
            to_be_output_grade,
            to_be_output_bw,
            to_be_output_logo,
            to_be_output_print_thickness,
            to_be_output_remarks,
            created_by,
            created_on
        )
        OUTPUT
            INSERTED.id,
            INSERTED.coil_no,
            INSERTED.division_code,
            INSERTED.production_line,
            INSERTED.created_on
        VALUES (
            @coil_no,
            @division_code,
            @production_line,
            @existing_thickness,
            @existing_item_code,
            @existing_output_qty,
            @existing_output_width,
            @existing_output_length,
            @existing_output_grade,
            @existing_output_bw,
            @existing_output_logo,
            @existing_output_print_thickness,
            @existing_output_remarks,
            @to_be_thickness,
            @to_be_item_code,
            @to_be_output_qty,
            @to_be_output_width,
            @to_be_output_length,
            @to_be_output_grade,
            @to_be_output_bw,
            @to_be_output_logo,
            @to_be_output_print_thickness,
            @to_be_output_remarks,
            @created_by,
            GETDATE()
        )
        `,
        payload
    );

    return rows[0];
}

async function searchEntries({ coil_no, division_code, production_line }) {
    return query(
        DB_NAME,
        `
        SELECT
            e.*,
            u.username AS created_by_name
        FROM coil_detail_entries e
        LEFT JOIN users u
            ON e.created_by = u.id
        WHERE e.coil_no = @coil_no
          AND (@division_code IS NULL OR e.division_code = @division_code)
          AND (@production_line IS NULL OR e.production_line = @production_line)
        ORDER BY e.created_on DESC, e.id DESC
        `,
        {
            coil_no,
            division_code,
            production_line,
        }
    );
}

async function getRecentEntries(limit) {
    return query(
        DB_NAME,
        `
        SELECT TOP (@limit)
            e.id,
            e.coil_no,
            e.division_code,
            e.production_line,
            e.existing_item_code,
            e.to_be_item_code,
            e.existing_output_grade,
            e.to_be_output_grade,
            e.created_on,
            u.username AS created_by_name
        FROM coil_detail_entries e
        LEFT JOIN users u
            ON e.created_by = u.id
        ORDER BY e.created_on DESC, e.id DESC
        `,
        { limit }
    );
}

module.exports = {
    createEntry,
    searchEntries,
    getRecentEntries,
};
