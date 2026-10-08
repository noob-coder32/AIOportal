// backend/auth.routes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authDb = require("./db/auth.db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// LOGIN
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1️⃣ Fetch user (NO role here) — SAME LOGIC
        const user = await authDb.getUserByUsername(username);

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 🚫 Block inactive users — SAME CHECK
        if (user.is_active === 0 || user.is_active === false) {
            return res.status(403).json({
                message: "Your account is inactive. Please contact administrator.",
            });
        }

        // 2️⃣ Check password — SAME bcrypt logic
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3️⃣ Fetch roles (MULTI-ROLE SUPPORT) — SAME BEHAVIOR
        const roles = await authDb.getUserRoles(user.id);

        if (!roles || roles.length === 0) {
            return res.status(403).json({
                message: "No roles assigned. Contact administrator.",
            });
        }

        // 4️⃣ Sign JWT with roles array — SAME PAYLOAD
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                fullName: user.full_name || user.username,
                roles: roles,
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Login failed" });
    }
});

module.exports = router;
