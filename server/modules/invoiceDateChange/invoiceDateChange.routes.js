// backend/modules/invoiceDateChange/invoiceDateChange.routes.js

const express = require("express");
const router = express.Router();
const db = require("../../db/invoiceDateChange.db");

// 🔹 CREATE REQUEST
router.post("/", async (req, res) => {
    try {
        const {
            invoice_no,
            invoice_date,
            to_be_invoice_date,
            division_id,
            party_code,
            invoice_type
        } = req.body;

        const requested_by = req.user.username;

        if (
            !invoice_no ||
            !invoice_date ||
            !to_be_invoice_date ||
            !division_id ||
            !party_code ||
            !invoice_type
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        await db.createRequest({
            invoice_no,
            invoice_date,
            to_be_invoice_date,
            division_id,
            party_code,
            invoice_type,
            requested_by
        });

        res.json({ message: "Request submitted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to create request"
        });
    }
});

// 🔹 GET REQUESTS
router.get("/", async (req, res) => {
    try {
        const rows = await db.getRequests();
        res.json(rows);
    } catch (err) {
        res.status(500).json({
            message: "Failed to fetch requests"
        });
    }
});

module.exports = router;