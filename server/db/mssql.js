// backend/db/mssql.js
const sql = require("mssql");

console.log("MSSQL CONFIG CHECK:", {
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_SERVER: process.env.DB_SERVER,
    DB_PORT: process.env.DB_PORT,

});

// Cache one pool per database
const pools = {};

/**
 * ------------------------------------
 * Get or create MSSQL pool for a DB
 * ------------------------------------
 */
async function getPool(dbName) {
    if (!dbName) {
        throw new Error("Database name is required for MSSQL connection");
    }

    // Return existing pool if already created
    if (pools[dbName]) {
        return pools[dbName];
    }

    // Create NEW isolated pool (IMPORTANT)
    const pool = new sql.ConnectionPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: dbName,
        port: Number(process.env.DB_PORT) || 1433,
        options: {
            encrypt: true,                 // REQUIRED for AWS RDS
            trustServerCertificate: true, // must be false for real cert
            useUTC: false
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    });

    // Connect and cache
    pools[dbName] = await pool.connect();
    return pools[dbName];
}

/**
 * ------------------------------------
 * SELECT queries
 * Returns: result.recordset
 * ------------------------------------
 */
async function query(dbName, sqlQuery, params = {}) {
    const pool = await getPool(dbName);
    const request = pool.request();

    for (const key in params) {
        request.input(key, params[key]);
    }

    const result = await request.query(sqlQuery);
    return result.recordset;
}

/**
 * ------------------------------------
 * INSERT / UPDATE / DELETE
 * Returns: affected rows count
 * ------------------------------------
 */
async function execute(dbName, sqlQuery, params = {}) {
    const pool = await getPool(dbName);
    const request = pool.request();

    for (const key in params) {
        request.input(key, params[key]);
    }

    const result = await request.query(sqlQuery);
    return result.rowsAffected?.[0] || 0;
}

module.exports = {
    sql,     // exposed for advanced use (OUTPUT, transactions if needed)
    getPool,
    query,
    execute,
};
