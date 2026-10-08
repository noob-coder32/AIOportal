// backend/modules/medicalAllowance/medicalAllowance.routes.js

const express = require("express");
const router = express.Router();

const medicalAllowanceDb = require("../../db/medicalAllowance.db");
const { generateMedicalAllowanceExcel } = require("./excel.generator");

/**
 * GET Payroll Cycles
 */
router.get("/cycles", async (req, res) => {
    try {
        const rows = await medicalAllowanceDb.getCycles();
        res.json(rows);
    } catch (err) {
        console.error("Medical Allowance Cycles Error:", err);
        res.status(500).json({ message: "Failed to fetch cycles" });
    }
});

/**
 * GET Filter Options (by cycle)
 */
router.get("/filter-options", async (req, res) => {
    const { cycle } = req.query;

    if (!cycle) {
        return res.status(400).json({
            message: "Payroll cycle is required"
        });
    }

    try {
        const data = await medicalAllowanceDb.getFilterOptions(cycle);
        res.json(data);
    } catch (err) {
        console.error("Filter options error:", err);
        res.status(500).json({
            message: "Failed to fetch filter options"
        });
    }
});

/**
 * GET Medical Allowance Records (with filters)
 */
router.get("/records", async (req, res) => {
    try {
        const filters = {
            cycle: req.query.cycle,
            division: req.query.division,
            category: req.query.category,
            department: req.query.department,
        };

        if (!filters.cycle) {
            return res.status(400).json({
                message: "Payroll cycle is required"
            });
        }

        const records = await medicalAllowanceDb.getMedicalAllowanceRecords(filters);
        res.json(records);
    } catch (err) {
        console.error("Get records error:", err);
        res.status(500).json({
            message: "Failed to fetch medical allowance records"
        });
    }
});

/**
 * POST Generate Medical Allowance Excel
 */
router.post("/generate-excel", async (req, res) => {
    try {
        const filters = {
            cycle: req.body.cycle,
            division: req.body.division,
            category: req.body.category,
            department: req.body.department,
        };

        if (!filters.cycle) {
            return res.status(400).json({
                message: "Payroll cycle is required"
            });
        }

        const records = await medicalAllowanceDb.getMedicalAllowanceRecords(filters);

        if (records.length === 0) {
            return res.status(400).json({
                message: "No records found for the selected filters",
            });
        }

        const filePath = await generateMedicalAllowanceExcel(filters.cycle, records);

        res.download(filePath, `Medical_Allowance_${filters.cycle}.xlsx`, (err) => {
            if (err) {
                console.error("Download error:", err);
            }
        });
    } catch (err) {
        console.error("Generate Excel error:", err);
        res.status(500).json({
            message: "Failed to generate Excel",
            error: err.message,
        });
    }
});

router.get("/selection/cycles", async (req, res) => {
    try {
        const rows = await medicalAllowanceDb.getSelectionCycles();
        res.json(rows);
    } catch (err) {
        console.error("Selection cycles error:", err);
        res.status(500).json({ message: "Failed to fetch source payroll cycles" });
    }
});

router.get("/selection/source-employees", async (req, res) => {
    const { cycle } = req.query;

    if (!cycle) {
        return res.status(400).json({ message: "Payroll cycle is required" });
    }

    try {
        const rows = await medicalAllowanceDb.getSourceEmployees({
            cycle,
            search: req.query.search,
            division: req.query.division,
            category: req.query.category,
            department: req.query.department,
            showSelectedOnly: req.query.showSelectedOnly === "true",
        });
        res.json(rows);
    } catch (err) {
        console.error("Source employees error:", err);
        res.status(500).json({ message: "Failed to fetch source employees" });
    }
});

router.get("/selection/master", async (req, res) => {
    try {
        const rows = await medicalAllowanceDb.getMasterEmployees({
            search: req.query.search,
            division: req.query.division,
            category: req.query.category,
            department: req.query.department,
        });
        res.json(rows);
    } catch (err) {
        console.error("Master employees error:", err);
        res.status(500).json({ message: "Failed to fetch master employees" });
    }
});

router.post("/selection/save", async (req, res) => {
    try {
        const { cycle, addEmployeeIds = [], removeEmployeeIds = [] } = req.body;

        const result = await medicalAllowanceDb.saveSelection({
            cycle,
            addEmployeeIds,
            removeEmployeeIds,
        });

        res.json({
            message: "Medical allowance master list updated",
            ...result,
        });
    } catch (err) {
        console.error("Save selection error:", err);
        res.status(500).json({ message: err.message || "Failed to save selection" });
    }
});

router.post("/refresh-cycle", async (req, res) => {
    const { cycle } = req.body;

    if (!cycle) {
        return res.status(400).json({ message: "Payroll cycle is required" });
    }

    try {
        const result = await medicalAllowanceDb.refreshCycle(cycle);
        res.json({
            message: `Cycle ${cycle} refreshed successfully`,
            ...result,
        });
    } catch (err) {
        console.error("Refresh cycle error:", err);
        res.status(500).json({ message: err.message || "Failed to refresh cycle" });
    }
});

module.exports = router;
