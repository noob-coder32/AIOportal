const express = require("express");
const router = express.Router();

const invoiceDb = require("../../db/invoice.db");

// =========================
// GET INVOICES
// =========================
router.get("/", async (req, res) => {
    try {
        const rows = await invoiceDb.getInvoices();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({ message: "Failed to fetch invoices" });
    }
});

// =========================
// POST INVOICE
// =========================
router.post("/", async (req, res) => {
    try {
        const {
            invoice_no,
            invoice_date,
            division_id,
            party_code,
            bill_amount,
            invoice_type,
        } = req.body;

        const requested_by = req.user.username; // 🔥 important

        if (
            !invoice_no ||
            !invoice_date ||
            !division_id ||
            !party_code ||
            !bill_amount ||
            !invoice_type
        ) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }


        await invoiceDb.insertInvoice({
            invoice_no,
            invoice_date,
            division_id,
            party_code,
            bill_amount,
            invoice_type,
            requested_by,
        });

        res.json({ message: "Invoice saved successfully" });
    } catch (err) {
        console.error("Error saving invoice:", err);
        res.status(500).json({ message: "Failed to save invoice" });
    }
});

module.exports = router;