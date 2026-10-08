const sql = require("mssql");

let awsPoolPromise = null;

function isRetryableConnectionError(error) {
    const message = String(
        error?.originalError?.message
        || error?.message
        || ""
    ).toUpperCase();
    const code = String(error?.code || "").toUpperCase();

    return code === "ESOCKET"
        || message.includes("ECONNRESET")
        || message.includes("FAILED TO CONNECT")
        || message.includes("CONNECTION IS CLOSED")
        || message.includes("SOCKET");
}

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return String(value).toLowerCase() === "true";
}

function getAwsConfig() {
    const server = process.env.AWS_DB_SERVER;
    const user = process.env.AWS_DB_USER;
    const password = process.env.AWS_DB_PASSWORD;
    const database = process.env.AWS_DB_NAME;

    if (!server || !user || !password || !database) {
        throw new Error("AWS attendance sync database configuration is incomplete");
    }

    return {
        user,
        password,
        server,
        database,
        port: Number(process.env.AWS_DB_PORT) || 1433,
        connectionTimeout: Number(process.env.AWS_DB_CONNECTION_TIMEOUT) || 10000,
        requestTimeout: Number(process.env.AWS_DB_REQUEST_TIMEOUT) || 300000,
        options: {
            encrypt: parseBoolean(process.env.AWS_DB_ENCRYPT, true),
            trustServerCertificate: parseBoolean(process.env.AWS_DB_TRUST_CERT, true),
            useUTC: false,
        },
        pool: {
            max: Number(process.env.AWS_DB_POOL_MAX) || 4,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };
}

async function getAwsPool() {
    if (awsPoolPromise) {
        return awsPoolPromise;
    }

    const pool = new sql.ConnectionPool(getAwsConfig());
    awsPoolPromise = pool.connect().catch((error) => {
        awsPoolPromise = null;
        throw error;
    });

    return awsPoolPromise;
}

async function resetAwsPool() {
    if (!awsPoolPromise) {
        return;
    }

    const currentPoolPromise = awsPoolPromise;
    awsPoolPromise = null;

    try {
        const pool = await currentPoolPromise;
        await pool.close();
    } catch (_error) {
        // Ignore pool close errors during recovery.
    }
}

async function awsQuery(sqlQuery, params = {}) {
    try {
        const pool = await getAwsPool();
        const request = pool.request();

        for (const key of Object.keys(params)) {
            request.input(key, params[key]);
        }

        const result = await request.query(sqlQuery);
        return result.recordset;
    } catch (error) {
        if (!isRetryableConnectionError(error)) {
            throw error;
        }

        await resetAwsPool();

        const pool = await getAwsPool();
        const retryRequest = pool.request();

        for (const key of Object.keys(params)) {
            retryRequest.input(key, params[key]);
        }

        const retryResult = await retryRequest.query(sqlQuery);
        return retryResult.recordset;
    }
}

module.exports = {
    sql,
    getAwsConfig,
    getAwsPool,
    resetAwsPool,
    awsQuery,
};
