const express = require("express");
const router = express.Router();

const Db = require("../../db/debtClsUpd.db");

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
            div_id,
            app_date,
            src_dbtClassId,
            tgt_dbtClassId
        } = req.body;

        const requested_by = req.user.username; // 🔥 important

        if (
            !div_id ||
            !app_date ||
            !src_dbtClassId ||
            !tgt_dbtClassId
        ) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        await Db.insertEntry({
            div_id,
            app_date,
            src_dbtClassId,
            tgt_dbtClassId,
            requested_by
        });

        res.json({ message: "Request saved successfully" });
    } catch (err) {
        console.error("Error saving request:", err);
        res.status(500).json({ message: "Failed to save request" });
    }
});

module.exports = router;