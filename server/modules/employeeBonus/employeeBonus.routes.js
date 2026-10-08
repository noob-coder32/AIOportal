// backend/modules/employeeBonus/employeeBonus.routes.js

const express = require("express");
const router = express.Router();

const employeeBonusDb = require("../../db/employeeBonus.db");

/**
 * GET Filter Options
 */
router.get("/filter-options", async (req, res) => {
    try {
        const data = await employeeBonusDb.getFilterOptions();
        res.json(data);
    } catch (err) {
        console.error("Filter options error:", err);
        res.status(500).json({
            message: "Failed to fetch filter options",
        });
    }
});

/**
 * POST Save Employee Bonus
 */
router.post("/", async (req, res) => {
    try {
        const {
            employee_code,
            name,
            bonus,
            division,
            category,
            sub_category,
            effective_date
        } = req.body;

        if (!employee_code || !name || !bonus || !division || !category || !sub_category || !effective_date) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        await employeeBonusDb.saveEmployeeBonus({
            employee_code,
            name,
            bonus: parseFloat(bonus),
            division,
            category,
            sub_category,
            effective_date
        });

        res.json({ message: "Employee bonus saved successfully" });
    } catch (err) {
        console.error("Save error:", err);
        res.status(500).json({
            message: "Failed to save employee bonus",
        });
    }
});

/**
 * GET Employee Bonuses
 */
router.get("/", async (req, res) => {
    try {
        const bonuses = await employeeBonusDb.getEmployeeBonuses();
        res.json(bonuses);
    } catch (err) {
        console.error("Fetch bonuses error:", err);
        res.status(500).json({
            message: "Failed to fetch employee bonuses",
        });
    }
});

module.exports = router;