const express = require("express");
const router = express.Router();

const Db = require("../../db/debtorUpd.db");

// =========================
// GET ENTRIES
// =========================
router.get("/", async (req, res) => {
    try {
        const rows = await Db.getEntries();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching entries:", err);
        res.status(500).json({ message: "Failed to fetch entries" });
    }
});

// =========================
// POST ENTRIES
// =========================
router.post("/", async (req, res) => {
    try {
        const {
            division_id,
            target_div_id,
            acc_type,
            party_code,
            party_name,
            gl_code,
            gl_name,
        } = req.body;

        const requested_by = req.user.username; // 🔥 important

        if (
            !division_id ||
            !target_div_id ||
            !acc_type ||
            !party_code ||
            !party_name ||
            !gl_code ||
            !gl_name
        ) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        await Db.insertEntry({
            division_id,
            target_div_id,
            acc_type,
            party_code,
            party_name,
            gl_code,
            gl_name,
            requested_by
        });

        res.json({ message: "Request saved successfully" });
    } catch (err) {
        console.error("Error saving request:", err);
        res.status(500).json({ message: "Failed to save request" });
    }
});

module.exports = router;