const express = require("express");
const router = express.Router();

const payslipDb = require("../../db/payslip.db");
const { generatePayslips } = require("./payslip.service");

/**
 * GET Payroll Cycles
 */
router.get("/cycles", async (req, res) => {
    try {
        const rows = await payslipDb.getPayrollCycles();
        res.json(rows);
    } catch (err) {
        console.error("CYCLES ERROR:", err);  // 👈 ADD THIS
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
            message: "Payroll cycle is required",
        });
    }

    try {
        const data = await payslipDb.getFilterOptions(cycle);
        res.json(data);
    } catch (err) {
        console.error("Filter options error:", err);
        res.status(500).json({
            message: "Failed to fetch filter options",
        });
    }
});


/**
 * GET Employees (with filters)
 */
router.get("/employees", async (req, res) => {
    try {
        const filters = {
            cycle: req.query.cycle,
            division: req.query.division,
            category: req.query.category,
            subCategory: req.query.subCategory,
            department: req.query.department,
        };

        const rows = await payslipDb.getEmployees(filters);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch employees" });
    }
});

/** 
 * POST Generate Payslips
 */
router.post("/generate", async (req, res) => {
    const { employeeIds, cycle } = req.body;

    if (!Array.isArray(employeeIds) || !cycle) {
        return res.status(400).json({
            message: "employeeIds and cycle are required",
        });
    }

    try {
        const generatedBy = req.user.fullName; // Assuming req.user is set by auth middleware

        const results = await generatePayslips(
            employeeIds,
            cycle,
            generatedBy
        );

        res.json({
            message: "Payslip generation completed",
            total: employeeIds.length,
            results,
        });
    } catch (err) {
        res.status(500).json({
            message: "Payslip generation failed",
        });
    }
});

module.exports = router;
