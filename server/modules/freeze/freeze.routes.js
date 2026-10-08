const express = require("express");
const router = express.Router();
const freezeDb = require("../../db/freeze.db");

// GET all rows
router.get("/", async (req, res) => {
    try {
        const rows = await freezeDb.getAllConfigs();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch data" });
    }
});

// UPDATE freeze date
router.put("/:id", async (req, res) => {
    try {
        const { freeze_till } = req.body;

        await freezeDb.updateFreezeDate(
            Number(req.params.id),
            freeze_till
        );

        res.json({ message: "Updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

module.exports = router;