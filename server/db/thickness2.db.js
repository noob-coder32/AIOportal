const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME ;

// Get all
async function getAllThickness() {
    return query(
        DB_NAME,
        `
        SELECT *
        FROM thickness2
        ORDER BY id DESC
        `
    );
}

// Get matching thickness master by thickness + width
async function getMasterByThicknessAndWidth(thickness, width) {
    return query(
        DB_NAME,
        `
        SELECT TOP 1 *
        FROM thickness2
        WHERE thickness = @thickness
          AND width = @width
        `,
        { thickness, width }
    ).then((rows) => rows[0]);
}

// Add
async function addThickness(
    thickness,
    width,
    min_range,
    max_range
) {
    return execute(
        DB_NAME,
        `
        INSERT INTO thickness2
        (
            thickness,
            width,
            min_range,
            max_range
        )
        VALUES
        (
            @thickness,
            @width,
            @min_range,
            @max_range
        )
        `,
        {
            thickness,
            width,
            min_range,
            max_range,
        }
    );
}

// Update
async function updateThickness(
    id,
    thickness,
    width,
    min_range,
    max_range
) {
    return execute(
        DB_NAME,
        `
        UPDATE thickness2
        SET
            thickness = @thickness,
            width = @width,
            min_range = @min_range,
            max_range = @max_range
        WHERE id = @id
        `,
        {
            id,
            thickness,
            width,
            min_range,
            max_range,
        }
    );
}

module.exports = {
    getAllThickness,
    getMasterByThicknessAndWidth,
    addThickness,
    updateThickness,
};