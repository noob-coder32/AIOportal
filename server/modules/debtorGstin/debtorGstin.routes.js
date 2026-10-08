const express = require("express");
const router = express.Router();

const debtorGstinDb = require("../../db/debtorGstin.db");

/* =========================
   SEARCH DEBTOR BY CODE
   GET /debtorGstin/search?code=
========================= */
router.get("/search", async (req, res) => {
    try {
        const code = req.query.code || "";
        const rows = await debtorGstinDb.searchDebtorByCode(code);
        res.json(rows);
    } catch (err) {
        console.error("Error searching debtor:", err);
        res.status(500).json({ message: "Failed to search debtor" });
    }
});

/* =========================
   GET ALL REQUESTS
   GET /debtorGstin/
========================= */
router.get("/", async (req, res) => {
    try {
        const search = req.query.search || "";
        const rows = await debtorGstinDb.getAllRequests(search);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ message: "Failed to fetch requests" });
    }
});

/* =========================
   GET AUDIT LOGS
   GET /debtorGstin/logs
========================= */
router.get("/logs", async (req, res) => {
    try {
        const rows = await debtorGstinDb.getLogs();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching logs:", err);
        res.status(500).json({ message: "Failed to fetch logs" });
    }
});

/* =========================
   GET SINGLE REQUEST BY ID
   GET /debtorGstin/:id
========================= */
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const request = await debtorGstinDb.getRequestById(id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        res.json(request);
    } catch (err) {
        console.error("Error fetching request:", err);
        res.status(500).json({ message: "Failed to fetch request" });
    }
});

/* =========================
   CREATE NEW REQUEST
   POST /debtorGstin/
========================= */
router.post("/", async (req, res) => {
    try {
        const { debtor_code, debtor_name, gstin, state } = req.body;

        // Validate required fields
        if (!debtor_code || !debtor_name || !gstin || !state) {
            return res.status(400).json({
                message: "All fields (debtor_code, debtor_name, gstin, state) are required"
            });
        }

        const userId = req.user?.id || null;

        // Insert request
        await debtorGstinDb.insertRequest(debtor_code, debtor_name, gstin, state, userId);

        res.json({ message: "Request submitted successfully" });
    } catch (err) {
        console.error("Error creating request:", err);
        res.status(500).json({ message: "Failed to create request" });
    }
});

/* =========================
   UPDATE REQUEST
   PUT /debtorGstin/:id
========================= */
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { gstin, state } = req.body;

        // Fetch existing request
        const request = await debtorGstinDb.getRequestById(id);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        const userId = req.user?.id || null;

        // Update request
        await debtorGstinDb.updateRequest(id, gstin, state, userId);

        // Log changes
        if (gstin !== undefined && gstin !== request.gstin) {
            await debtorGstinDb.insertLog(id, "gstin", request.gstin, gstin, userId);
        }

        if (state !== undefined && state !== request.state) {
            await debtorGstinDb.insertLog(id, "state", request.state, state, userId);
        }

        res.json({ message: "Request updated successfully" });
    } catch (err) {
        console.error("Error updating request:", err);
        res.status(500).json({ message: "Failed to update request" });
    }
});



module.exports = router;
