const express = require("express");
const router = express.Router();

const divisionDb = require("../../db/division.db");

// 🔹 GET all entries
router.get("/", async (req, res) => {
    try {
        const rows = await divisionDb.getAllRequests();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching division entries:", err);
        res.status(500).json({ message: "Failed to fetch data" });
    }
});

// 🔹 CREATE entry
router.post("/", async (req, res) => {
    try {
        const { division_id, month_id, year_id, month_name, employee_code } = req.body;

        if (!division_id || !month_id || !year_id || !month_name || !employee_code) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 🔥 GET USER FROM TOKEN (VERY IMPORTANT)
        const requested_by = req.user.username;

        await divisionDb.createRequest({
            division_id,
            month_id,
            year_id,
            month_name,
            employee_code,
            requested_by
        });

        res.json({ message: "Saved successfully" });
    } catch (err) {
        console.error("Error saving entry:", err);
        res.status(500).json({ message: "Save failed" });
    }
});

module.exports = router;