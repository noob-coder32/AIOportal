const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

// ✅ UPDATED TABLE NAME
async function getAllConfigs() {
    return query(DB_NAME, `
        SELECT id, module_name, functionality, freeze_till
        FROM date_freeze
        ORDER BY module_name
    `);
}

async function updateFreezeDate(id, freeze_till) {
    return execute(DB_NAME, `
        UPDATE date_freeze
        SET freeze_till = @freeze_till
        WHERE id = @id
    `, { id, freeze_till });
}

module.exports = {
    getAllConfigs,
    updateFreezeDate
};