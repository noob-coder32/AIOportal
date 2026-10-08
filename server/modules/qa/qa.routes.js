// backend/modules/qa/qa.routes.js
const express = require("express");
const router = express.Router();

const qaDb = require("../../db/qa.db");

/**
 * --------------------------------
 * GET COILS (with optional search)
 * GET /qa/coils
 * --------------------------------
 */
router.get("/coils", async (req, res) => {
    try {
        const search = req.query.search || "";
        const rows = await qaDb.getCoils(search);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching coils:", err);
        res.status(500).json({ message: "Failed to fetch coils" });
    }
});

/**
 * ------------------------------------------------
 * DELETE COIL (dispatch check + audit logging)
 * DELETE /qa/coils/:id
 * ------------------------------------------------
 */
router.delete("/coils/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const currentUser = req.user.username;

        // 1️⃣ Read from VIEW
        const coil = await qaDb.getCoilById(id);

        if (!coil) {
            return res.status(404).json({ message: "Coil not found" });
        }

        // 2️⃣ Block delete if dispatched
        if (coil.despach_ok == 1) {
            return res.status(400).json({
                message: "Cannot delete: Coil already dispatched",
            });
        }

        // 3️⃣ Insert audit log
        await qaDb.insertAuditLog(
            coil.id,
            coil.coil_no,
            "DELETE",
            currentUser
        );

        // 4️⃣ Delete from master table
        await qaDb.deleteCoil(coil.id);

        res.json({ message: "Coil deleted and logged successfully" });
    } catch (err) {
        console.error("Error deleting coil:", err);
        res.status(500).json({ message: "Delete failed" });
    }
});

/**
 * ------------------------------
 * GET AUDIT LOGS
 * GET /qa/audit-logs
 * ------------------------------
 */
router.get("/audit-logs", async (req, res) => {
    try {
        const search = req.query.search || "";
        const rows = await qaDb.getAuditLogs(search);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching audit logs:", err);
        res.status(500).json({ message: "Failed to fetch audit logs" });
    }
});

router.post("/requests", async (req, res) => {
    try {
        const { coil_no, thickness, qty, length } = req.body;
        const username = req.user.username;

        // Required field validation (length is optional)
        if (!coil_no || thickness == null || qty == null) {
            return res.status(400).json({
                message: "Coil number, thickness and quantity are required"
            });
        }

        // Convert to numbers
        const thicknessNum = Number(thickness);
        const qtyNum = Number(qty);

        // Length optional
        let lengthNum = null;
        if (length !== undefined && length !== null && length !== "") {
            lengthNum = Number(length);

            if (isNaN(lengthNum)) {
                return res.status(400).json({
                    message: "Invalid length value"
                });
            }
        }

        // Validate numeric conversions
        if (isNaN(thicknessNum) || isNaN(qtyNum)) {
            return res.status(400).json({
                message: "Invalid numeric values"
            });
        }

        // Business rule validations
        // if (thicknessNum < 0.001 || thicknessNum > 0.999) {
        //     return res.status(400).json({
        //         message: "Thickness must be between 0.001 and 0.999"
        //     });
        // }

        // if (qtyNum <= 0 || qtyNum >= 10) {
        //     return res.status(400).json({
        //         message: "Quantity must be greater than 0 and less than 10 MT"
        //     });
        // }

        // Insert into DB
        await qaDb.createCoilRequest({
            coil_no,
            thickness: thicknessNum,
            qty: qtyNum,
            length: lengthNum, // null if not provided
            requested_by: username
        });

        res.json({ message: "Request submitted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to submit request"
        });
    }
});

router.get("/requests", async (req, res) => {
    try {
        const username = req.user.username;
        const isAdmin = req.user.roles.includes("admin");

        const rows = await qaDb.getCoilRequests(username, isAdmin);

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to fetch requests"
        });
    }
});

module.exports = router;

