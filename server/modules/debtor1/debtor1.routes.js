const express = require("express");
const router = express.Router();

const Db = require("../../db/debtor1.db"); // ✅ correct
const debtor1MailService = require("../../services/debtor1Mail.service");

function parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
}

// =========================
// GET ENTRIES
// =========================
router.get("/", async (req, res) => {
    try {
        const search = req.query.search || ""; // ✅ ADD THIS
        const rows = await Db.getEntries(search); // ✅ PASS SEARCH
        res.json(rows);
    } catch (err) {
        console.error("Error fetching entries:", err);
        res.status(500).json({ message: "Failed to fetch entries" });
    }
});

router.get("/mail/status", async (req, res) => {
    try {
        res.json(await debtor1MailService.getStatus());
    } catch (err) {
        console.error("Error fetching debtor1 mail status:", err);
        res.status(500).json({ message: "Failed to fetch debtor1 mail status" });
    }
});

router.post("/mail/settings", async (req, res) => {
    const recipientEmail = req.body.recipientEmail || req.body.recipient_email;
    const sendTimeHhmm = req.body.sendTimeHhmm || req.body.send_time_hhmm;
    const hasEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        || Object.prototype.hasOwnProperty.call(req.body, "is_enabled");
    const rawEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        ? req.body.isEnabled
        : req.body.is_enabled;

    if (!hasEnabled) {
        return res.status(400).json({ message: "isEnabled is required" });
    }

    try {
        res.json({
            message: "Debtor1 mail settings saved",
            ...(await debtor1MailService.updateSettings({
                recipientEmail,
                isEnabled: parseBoolean(rawEnabled),
                sendTimeHhmm,
            })),
        });
    } catch (err) {
        console.error("Error updating debtor1 mail settings:", err);
        res.status(400).json({ message: err.message || "Failed to save debtor1 mail settings" });
    }
});

router.post("/mail/send-now", async (req, res) => {
    try {
        const result = await debtor1MailService.runNow();
        if (result.skipped && result.reason === "already_running") {
            return res.status(409).json({ message: "A debtor1 mail send is already running", ...result });
        }

        if (result.skipped && result.reason === "nothing_pending") {
            return res.json({ message: "There are no pending report dates", ...result });
        }

        res.json({ message: "Debtor1 credit limit report sent", ...result });
    } catch (err) {
        console.error("Error sending debtor1 credit limit report:", err);
        res.status(500).json({ message: err.message || "Failed to send debtor1 credit limit report" });
    }
});

// =========================
// UPDATE ENTRY
// =========================
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { credit_limit, credit_days } = req.body;

    try {
        const existing = await Db.getById(id);

        if (!existing) {
            return res.status(404).json({ message: "Not found" });
        }

        // update first
        await Db.updateEntry(id, credit_limit, credit_days);

        // 🔹 log only changed fields
        if (existing.credit_limit != credit_limit) {
            await Db.insertLog(
                id,
                "credit_limit",
                existing.credit_limit,
                credit_limit,
                req.user.id
            );
        }

        if (existing.credit_days != credit_days) {
            await Db.insertLog(
                id,
                "credit_days",
                existing.credit_days,
                credit_days,
                req.user.id
            );
        }

        res.json({ message: "Updated successfully" });

    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Update failed" });
    }
});

// =========================
// GET LOGS
// =========================
router.get("/logs", async (req, res) => {
    try {
        const search = req.query.search || "";
        const rows = await Db.getLogs(search);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching logs:", err);
        res.status(500).json({ message: "Failed to fetch logs" });
    }
});


module.exports = router;
