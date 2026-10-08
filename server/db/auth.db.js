// backend/db/auth.db.js
const db = require("./mssql");

const AUTH_DB = process.env.DB_NAME;

/**
 * Fetch user by username (for login)
 */

async function getUserByUsername(username) {
  const rows = await db.query(
    AUTH_DB,
    `
        SELECT TOP 1
            id,
            username,
            full_name,
            password_hash,
            is_active
        FROM users
        WHERE username COLLATE Latin1_General_CS_AS = @username
        `,
    { username }
  );

  return rows.length ? rows[0] : null;
}

/**
 * Fetch roles for a given user
 */
async function getUserRoles(userId) {
  const rows = await db.query(
    AUTH_DB,
    `
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = @userId
    `,
    { userId }
  );

  return rows.map((r) => r.name);
}

/**
 * Fetch all roles (admin screen)
 */
async function getAllRoles() {
  const rows = await db.query(
    AUTH_DB,
    `
    SELECT name
    FROM roles
    ORDER BY name
    `
  );

  return rows.map((r) => r.name);
}

/**
 * Fetch all users with roles (admin screen)
**/
async function getAllUsers() {
  const rows = await db.query(
    AUTH_DB,
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
    ORDER BY u.username
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

/**
 * Create a new user
 */
async function createUser(username, fullName, passwordHash) {
  await db.execute(
    AUTH_DB,
    `
    INSERT INTO users (username, full_name, password_hash, is_active)
    VALUES (@username, @fullName, @passwordHash, 1)
    `,
    { username, fullName, passwordHash }
  );
}

/**
 * Assign roles to user (overwrite existing)
 */
async function setUserRoles(userId, roles) {
  // Remove old roles
  await db.execute(
    AUTH_DB,
    `DELETE FROM user_roles WHERE user_id = @userId`,
    { userId }
  );

  // Insert new roles
  for (const roleId of roles) {
    await db.execute(
      AUTH_DB,
      `
      INSERT INTO user_roles (user_id, role_id)
      VALUES (@userId, @roleId)
      `,
      { userId, roleId }
    );
  }
}

/**
 * Update user active status
 */
async function updateUserStatus(userId, isActive) {
  await db.execute(
    AUTH_DB,
    `
    UPDATE users
    SET is_active = @isActive
    WHERE id = @userId
    `,
    { userId, isActive }
  );
}

module.exports = {
  getUserByUsername,
  getUserRoles,
  getAllRoles,
  getAllUsers,
  createUser,
  setUserRoles,
  updateUserStatus,
};
