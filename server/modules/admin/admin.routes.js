const express = require("express");
const bcrypt = require("bcrypt");

const adminDb = require("../../db/admin.db");
const { getRoleMetadata } = require("../moduleAccess");

const router = express.Router();

function isDuplicateKeyError(err) {
    return err?.number === 2601 || err?.number === 2627;
}

function validatePasswordResetPayload(password) {
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    if (cleanPassword.length < 6) {
        return {
            valid: false,
            message: "Password must be at least 6 characters",
        };
    }

    return {
        valid: true,
        password: cleanPassword,
    };
}

/**
 * ------------------------------------
 * FETCH ALL ROLES
 * GET /admin/roles
 * ------------------------------------
 */
router.get("/roles", async (req, res) => {
    try {
        const rows = await adminDb.getAllRoles();
        res.json(rows.map((role) => getRoleMetadata(role.name)));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch roles" });
    }
});

/**
 * ------------------------------------
 * LIST ALL USERS (ADMIN VIEW)
 * GET /admin/users
 * ------------------------------------
 */
router.get("/users", async (req, res) => {
    try {
        const users = await adminDb.getAllUsersWithRoles();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

/**
 * ------------------------------------
 * CREATE USER WITH MULTIPLE ROLES
 * POST /admin/users
 * ------------------------------------
 */
router.post("/users", async (req, res) => {
    const { username, fullName, password, roles } = req.body;
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanFullName = typeof fullName === "string" ? fullName.trim() : "";

    if (!cleanUsername || !cleanFullName || !password || !Array.isArray(roles)) {
        return res.status(400).json({ message: "Invalid input" });
    }

    try {
        const userAlreadyExists = await adminDb.usernameExists(cleanUsername);

        if (userAlreadyExists) {
            return res.status(409).json({
                message: "Username already exists",
            });
        }

        const unknownRoles = await adminDb.validateRoleNames(roles);

        if (unknownRoles.length) {
            return res.status(400).json({
                message: `Unknown role(s): ${unknownRoles.join(", ")}`,
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await adminDb.createUser(
            cleanUsername,
            cleanFullName,
            passwordHash
        );

        if (roles.length > 0) {
            const roleIds = await adminDb.getRoleIdsByNames(roles);
            await adminDb.assignRolesToUser(userId, roleIds);
        }

        res.json({ message: "User created successfully" });
    } catch (err) {
        console.error(err);

        if (isDuplicateKeyError(err)) {
            return res.status(409).json({
                message: "Username already exists",
            });
        }

        res.status(500).json({ message: "User creation failed" });
    }
});

/**
 * ------------------------------------
 * UPDATE USER ROLES (FIXED VERSION)
 * PUT /admin/users/:id/roles
 * ------------------------------------
 */
router.put("/users/:id/roles", async (req, res) => {
    const { roles } = req.body;
    const targetUserId = Number(req.params.id);
    const currentUserId = req.user.id;

    if (!Array.isArray(roles)) {
        return res.status(400).json({ message: "Roles must be an array" });
    }

    try {
        const unknownRoles = await adminDb.validateRoleNames(roles);

        if (unknownRoles.length) {
            return res.status(400).json({
                message: `Unknown role(s): ${unknownRoles.join(", ")}`,
            });
        }

        // 1️⃣ Get current roles of target user
        const users = await adminDb.getAllUsersWithRoles();
        const targetUser = users.find(u => u.id === targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const targetHadAdmin = targetUser.roles.includes("admin");
        const removingAdmin = targetHadAdmin && !roles.includes("admin");
        const isSelf = targetUserId === currentUserId;

        // 2️⃣ Prevent self admin removal
        if (isSelf && removingAdmin) {
            return res.status(400).json({
                message: "You cannot remove admin role from yourself",
            });
        }

        // 3️⃣ Ensure at least ONE admin remains
        if (removingAdmin) {
            const adminCount = await adminDb.countAdmins();

            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "System must have at least one admin user",
                });
            }
        }

        // 4️⃣ Replace roles
        await adminDb.removeRolesForUser(targetUserId);

        if (roles.length > 0) {
            const roleIds = await adminDb.getRoleIdsByNames(roles);
            await adminDb.assignRolesToUser(targetUserId, roleIds);
        }

        res.json({ message: "Roles updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update roles" });
    }
});

/**
 * ------------------------------------
 * UPDATE USER FULL NAME
 * PUT /admin/users/:id/profile
 * ------------------------------------
 */
router.put("/users/:id/profile", async (req, res) => {
    const targetUserId = Number(req.params.id);
    const fullName = typeof req.body.fullName === "string"
        ? req.body.fullName.trim()
        : "";

    if (!fullName) {
        return res.status(400).json({ message: "Full name is required" });
    }

    try {
        await adminDb.updateUserFullName(targetUserId, fullName);
        res.json({ message: "Full name updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update full name" });
    }
});

/**
 * ------------------------------------
 * ENABLE / DISABLE USER
 * PUT /admin/users/:id/status
 * ------------------------------------
 */
router.put("/users/:id/status", async (req, res) => {
    const targetUserId = Number(req.params.id);
    const currentUserId = req.user.id;
    const is_active = Boolean(req.body.is_active);

    try {
        // 1️⃣ Prevent self-disable
        if (targetUserId === currentUserId && !is_active) {
            return res.status(400).json({
                message: "You cannot disable your own account",
            });
        }

        // 2️⃣ Get target user's roles
        const users = await adminDb.getAllUsersWithRoles();
        const targetUser = users.find(u => u.id === targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const isTargetAdmin = targetUser.roles.includes("admin");

        // 3️⃣ If disabling an admin, ensure at least one active admin remains
        if (!is_active && isTargetAdmin) {
            const activeAdminCount = await adminDb.countActiveAdmins();

            if (activeAdminCount <= 1) {
                return res.status(400).json({
                    message: "System must have at least one active admin user",
                });
            }
        }

        // 4️⃣ Update status
        await adminDb.updateUserStatus(targetUserId, is_active);

        res.json({ message: "User status updated" });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to update status",
        });
    }
});

router.put("/users/:id/reset-password", async (req, res) => {
    const targetUserId = Number(req.params.id);
    const validation = validatePasswordResetPayload(req.body.password);

    if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
    }

    try {
        const users = await adminDb.getAllUsersWithRoles();
        const targetUser = users.find((user) => user.id === targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const passwordHash = await bcrypt.hash(validation.password, 10);
        await adminDb.updateUserPassword(targetUserId, passwordHash);

        res.json({ message: "Password reset successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to reset password" });
    }
});

router.validatePasswordResetPayload = validatePasswordResetPayload;
module.exports = router;
