const express = require("express");
const router = express.Router();

const coilLineEntryDb = require("../../db/coilLineEntry.db");

const PRODUCTION_LINES = ["CCL Line", "CORRUGATION", "ETL (ARL)", "C.R. Coil Side Slitting"];

router.get("/", async (req, res) => {
    try {
        const rows = await coilLineEntryDb.getAllEntries();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching coil line entries:", err);
        res.status(500).json({ message: "Failed to fetch entries" });
    }
});

router.get("/logs", async (req, res) => {
    try {
        const rows = await coilLineEntryDb.getLogs();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching coil line entry logs:", err);
        res.status(500).json({ message: "Failed to fetch logs" });
    }
});

router.post("/", async (req, res) => {
    try {
        const coil_no = req.body.coil_no?.trim();
        const production_line = req.body.production_line?.trim();

        if (!coil_no || !production_line) {
            return res.status(400).json({
                message: "coil_no and production_line are required",
            });
        }

        if (!PRODUCTION_LINES.includes(production_line)) {
            return res.status(400).json({
                message: "Invalid production line selected",
            });
        }

        const userId = req.user?.id || null;
        const entry = await coilLineEntryDb.createEntry({
            coil_no,
            production_line,
            created_by: userId,
        });

        await coilLineEntryDb.insertLog(
            entry.id,
            "CREATE",
            "coil_no",
            null,
            coil_no,
            userId
        );

        await coilLineEntryDb.insertLog(
            entry.id,
            "CREATE",
            "production_line",
            null,
            production_line,
            userId
        );                   

        res.json({ message: "Entry created successfully" });
    } catch (err) {
        console.error("Error creating coil line entry:", err);
        res.status(500).json({ message: "Failed to create entry" });
    }
});

module.exports = router;
