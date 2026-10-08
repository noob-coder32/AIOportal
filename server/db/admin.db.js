// backend/db/admin.db.js

const { query, execute } = require("./mssql");

const DB_NAME = process.env.DB_NAME;

/**
 * ------------------------------------
 * Fetch all roles
 * ------------------------------------
 */
async function getAllRoles() {
    return query(
        DB_NAME,
        `
        SELECT name
        FROM roles
        ORDER BY name
        `
    );
}

/**
 * ------------------------------------
 * Keep role names unique
 * ------------------------------------
 */
async function ensureRolesNameUniqueIndex() {
    await execute(
        DB_NAME,
        `
        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = 'UX_roles_name'
              AND object_id = OBJECT_ID('dbo.roles')
        )
        BEGIN
            CREATE UNIQUE INDEX UX_roles_name
            ON dbo.roles(name)
        END
        `
    );
}

/**
 * ------------------------------------
 * Insert missing application roles
 * ------------------------------------
 */
async function syncRequiredRoles(roleNames) {
    const uniqueRoleNames = [...new Set(roleNames.filter(Boolean))];

    await ensureRolesNameUniqueIndex();

    for (const roleName of uniqueRoleNames) {
        await execute(
            DB_NAME,
            `
            IF NOT EXISTS (
                SELECT 1
                FROM roles WITH (UPDLOCK, HOLDLOCK)
                WHERE name = @roleName
            )
            BEGIN
                INSERT INTO roles (name)
                VALUES (@roleName)
            END
            `,
            { roleName }
        );
    }
}

/**
 * ------------------------------------
 * Ensure users can store full names
 * ------------------------------------
 */
async function ensureUsersFullNameColumn() {
    await execute(
        DB_NAME,
        `
        IF COL_LENGTH('dbo.users', 'full_name') IS NULL
        BEGIN
            ALTER TABLE dbo.users
            ADD full_name NVARCHAR(150) NULL
        END
        `
    );
}

/**
 * ------------------------------------
 * Fetch all users with roles
 * ------------------------------------
 */
async function getAllUsersWithRoles() {
    const rows = await query(
        DB_NAME,
        `
        SELECT
            u.id,
            u.username,
            u.full_name,
            u.is_active,
            STRING_AGG(r.name, ',') AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        GROUP BY u.id, u.username, u.full_name, u.is_active
        `
    );

    return rows.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name || "",
        is_active: u.is_active,
        roles: u.roles ? u.roles.split(",") : [],
    }));
}

async function usernameExists(username) {
    const rows = await query(
        DB_NAME,
        `
        SELECT TOP 1 id
        FROM users
        WHERE username COLLATE Latin1_General_CS_AS = @username
        `,
        { username }
    );

    return rows.length > 0;
}

/**
 * ------------------------------------
 * Create user (RETURN new ID)
 * ------------------------------------
 */
async function createUser(username, fullName, passwordHash) {
    const rows = await query(
        DB_NAME,
        `
        INSERT INTO users (username, full_name, password_hash, is_active)
        OUTPUT INSERTED.id
        VALUES (@username, @full_name, @password_hash, 1)
        `,
        { username, full_name: fullName, password_hash: passwordHash }
    );

    return rows[0].id;
}

/**
 * ------------------------------------
 * Get role IDs by names
 * ------------------------------------
 */
async function getRoleIdsByNames(roleNames) {
    if (!roleNames.length) return [];

    const uniqueRoleNames = [...new Set(roleNames)];
    const placeholders = uniqueRoleNames.map((_, i) => `@r${i}`).join(", ");
    const params = {};

    uniqueRoleNames.forEach((name, i) => {
        params[`r${i}`] = name;
    });

    const rows = await query(
        DB_NAME,
        `
        SELECT id
        FROM roles
        WHERE name IN (${placeholders})
        `,
        params
    );

    return rows.map((r) => r.id);
}

async function validateRoleNames(roleNames) {
    const uniqueRoleNames = [...new Set(roleNames)];
    const rows = await getAllRoles();
    const knownRoles = new Set(rows.map((role) => role.name));

    return uniqueRoleNames.filter((roleName) => !knownRoles.has(roleName));
}

/**
 * ------------------------------------
 * Assign roles to user
 * ------------------------------------
 */
async function assignRolesToUser(userId, roleIds) {
    if (!roleIds.length) return;

    const values = roleIds
        .map((_, i) => `(@uid, @rid${i})`)
        .join(", ");

    const params = { uid: userId };
    roleIds.forEach((rid, i) => {
        params[`rid${i}`] = rid;
    });

    await execute(
        DB_NAME,
        `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ${values}
        `,
        params
    );
}

/**
 * ------------------------------------
 * Remove all roles for user
 * ------------------------------------
 */
async function removeRolesForUser(userId) {
    await execute(
        DB_NAME,
        `
        DELETE FROM user_roles
        WHERE user_id = @userId
        `,
        { userId }
    );
}

/**
 * ------------------------------------
 * Count admin users
 * ------------------------------------
 */
async function countAdmins() {
    const rows = await query(
        DB_NAME,
        `
        SELECT COUNT(DISTINCT u.id) AS adminCount
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
        `
    );

    return rows[0]?.adminCount || 0;
}

/**
 * ------------------------------------
 * Count ACTIVE admin users
 * ------------------------------------
 */
async function countActiveAdmins() {
    const rows = await query(
        DB_NAME,
        `
        SELECT COUNT(DISTINCT u.id) AS activeAdminCount
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name = 'admin'
          AND u.is_active = 1
        `
    );

    return rows[0]?.activeAdminCount || 0;
}

/**
 * ------------------------------------
 * Update user status
 * ------------------------------------
 */
async function updateUserStatus(userId, isActive) {
    await execute(
        DB_NAME,
        `
        UPDATE users
        SET is_active = @isActive
        WHERE id = @userId
        `,
        {
            userId,
            isActive: isActive ? 1 : 0,
        }
    );
}

async function updateUserFullName(userId, fullName) {
    await execute(
        DB_NAME,
        `
        UPDATE users
        SET full_name = @fullName
        WHERE id = @userId
        `,
        { userId, fullName }
    );
}

async function updateUserPassword(userId, passwordHash) {
    await execute(
        DB_NAME,
        `
        UPDATE users
        SET password_hash = @passwordHash
        WHERE id = @userId
        `,
        { userId, passwordHash }
    );
}

module.exports = {
    getAllRoles,
    syncRequiredRoles,
    ensureUsersFullNameColumn,
    getAllUsersWithRoles,
    usernameExists,
    createUser,
    getRoleIdsByNames,
    validateRoleNames,
    assignRolesToUser,
    removeRolesForUser,
    countAdmins,
    countActiveAdmins,
    updateUserStatus,
    updateUserFullName,
    updateUserPassword,
};
