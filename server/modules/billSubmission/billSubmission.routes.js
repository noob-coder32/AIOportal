const express = require("express");
const router = express.Router();

const db = require("../../db/billSubmission.db");

const VALID_DIVISIONS = ["ASB", "CGL", "PDP", "NER", "ARL HO", "NER HO", "PDF HO", "ATPL", "LLP"];

function validateRequest(body) {
    const {
        bill_submission_reference_no,
        division,
        bill_submission_date,
        supplier_code,
        total_bill_amount
    } = body;

    if (
        !bill_submission_reference_no ||
        !division ||
        !bill_submission_date ||
        !supplier_code ||
        total_bill_amount === undefined ||
        total_bill_amount === null ||
        total_bill_amount === ""
    ) {
        return "All fields are required";
    }

    if (!VALID_DIVISIONS.includes(division)) {
        return "Invalid division";
    }

    if (Number.isNaN(Number(total_bill_amount))) {
        return "Total bill amount must be a valid number";
    }

    return null;
}

router.get("/", async (req, res) => {
    try {
        const rows = await db.getRequests();
        res.json(rows);
    } catch (err) {
        console.error("Bill submission fetch failed:", err);
        res.status(500).json({ message: "Failed to fetch bill submissions" });
    }
});

router.post("/", async (req, res) => {
    try {
        const validationError = validateRequest(req.body);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        await db.createRequest({
            bill_submission_reference_no: req.body.bill_submission_reference_no,
            division: req.body.division,
            bill_submission_date: req.body.bill_submission_date,
            supplier_code: req.body.supplier_code,
            total_bill_amount: Number(req.body.total_bill_amount),
            created_by: req.user.username
        });

        res.json({ message: "Bill submission saved successfully" });
    } catch (err) {
        console.error("Bill submission save failed:", err);
        res.status(500).json({ message: "Failed to save bill submission" });
    }
});

module.exports = router;
