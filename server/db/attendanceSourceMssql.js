const sql = require("mssql");

let attendanceSourcePoolPromise = null;

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return String(value).toLowerCase() === "true";
}

function buildAttendanceSourceConfig({ preferInstance = false } = {}) {
    const server = process.env.ATT_SOURCE_DB_SERVER;
    const user = process.env.ATT_SOURCE_DB_USER;
    const password = process.env.ATT_SOURCE_DB_PASSWORD;
    const database = process.env.ATT_SOURCE_DB_NAME;
    const instanceName = process.env.ATT_SOURCE_DB_INSTANCE;
    const port = Number(process.env.ATT_SOURCE_DB_PORT);

    if (!server || !user || !password || !database) {
        throw new Error("Attendance source database configuration is incomplete");
    }

    const config = {
        user,
        password,
        server,
        database,
        connectionTimeout: Number(process.env.ATT_SOURCE_DB_CONNECTION_TIMEOUT) || 15000,
        requestTimeout: Number(process.env.ATT_SOURCE_DB_REQUEST_TIMEOUT) || 300000,
        options: {
            encrypt: parseBoolean(process.env.ATT_SOURCE_DB_ENCRYPT, false),
            trustServerCertificate: parseBoolean(process.env.ATT_SOURCE_DB_TRUST_CERT, true),
            useUTC: false,
        },
        pool: {
            max: Number(process.env.ATT_SOURCE_DB_POOL_MAX) || 4,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    };

    if (preferInstance && instanceName) {
        config.options.instanceName = instanceName;
    } else if (Number.isFinite(port) && port > 0) {
        config.port = port;
    } else if (instanceName) {
        config.options.instanceName = instanceName;
    } else {
        config.port = 1433;
    }

    return config;
}

function getAttendanceSourceConfig() {
    return buildAttendanceSourceConfig();
}

async function getAttendanceSourcePool() {
    if (attendanceSourcePoolPromise) {
        return attendanceSourcePoolPromise;
    }

    attendanceSourcePoolPromise = (async () => {
        try {
            return await new sql.ConnectionPool(buildAttendanceSourceConfig()).connect();
        } catch (error) {
            const hasInstanceFallback = Boolean(process.env.ATT_SOURCE_DB_INSTANCE);
            const shouldRetryWithInstance = hasInstanceFallback
                && !/Port for .* not found/i.test(error.message || "");

            if (!shouldRetryWithInstance) {
                throw error;
            }

            return new sql.ConnectionPool(
                buildAttendanceSourceConfig({ preferInstance: true })
            ).connect();
        }
    })().catch((error) => {
        attendanceSourcePoolPromise = null;
        throw error;
    });

    return attendanceSourcePoolPromise;
}

async function attendanceSourceQuery(sqlQuery, params = {}) {
    const pool = await getAttendanceSourcePool();
    const request = pool.request();

    for (const key of Object.keys(params)) {
        request.input(key, params[key]);
    }

    const result = await request.query(sqlQuery);
    return result.recordset;
}

module.exports = {
    getAttendanceSourceConfig,
    getAttendanceSourcePool,
    attendanceSourceQuery,
};
