const express = require("express");
const router = express.Router();

const thicknessDb = require("../../db/thickness2.db");

// GET
router.get("/", async (req, res) => {
    try {
        const rows = await thicknessDb.getAllThickness();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to fetch data"
        });
    }
});

// POST
router.post("/", async (req, res) => {
    try {
        await thicknessDb.addThickness(
            req.body.thickness,
            req.body.width,
            req.body.min_range,
            req.body.max_range
        );

        res.json({
            message: "Entry added successfully"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to add entry"
        });
    }
});

// PUT
router.put("/:id", async (req, res) => {
    try {
        await thicknessDb.updateThickness(
            Number(req.params.id),
            req.body.thickness,
            req.body.width,
            req.body.min_range,
            req.body.max_range
        );

        res.json({
            message: "Entry updated successfully"
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to update entry"
        });
    }
});

module.exports = router;