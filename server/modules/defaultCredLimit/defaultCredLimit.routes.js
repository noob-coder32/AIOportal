const express = require("express");
const router = express.Router();

const Db = require("../../db/defaultCredLimit.db");
const scheduler = require("../../services/defaultCredLimitScheduler.service");

function parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
}

function isValidTimeHhmm(value) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

router.get("/", async (req, res) => {
    try {
        const search = req.query.search || "";
        const rows = await Db.getEntries(search);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching default credit limit entries:", err);
        res.status(500).json({ message: "Failed to fetch entries" });
    }
});

router.get("/scheduler/status", async (req, res) => {
    try {
        res.json(await scheduler.getStatus());
    } catch (err) {
        console.error("Error fetching default credit limit scheduler status:", err);
        res.status(500).json({ message: "Failed to fetch scheduler status" });
    }
});

router.post("/scheduler/settings", async (req, res) => {
    const runTimeHhmm = req.body.runTimeHhmm || req.body.run_time_hhmm;
    const hasEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        || Object.prototype.hasOwnProperty.call(req.body, "is_enabled");
    const rawEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        ? req.body.isEnabled
        : req.body.is_enabled;

    if (!hasEnabled || !isValidTimeHhmm(runTimeHhmm)) {
        return res.status(400).json({ message: "A valid isEnabled flag and HH:mm run time are required" });
    }

    try {
        res.json({
            message: "Default credit limit scheduler settings saved",
            ...(await scheduler.updateSettings({
                isEnabled: parseBoolean(rawEnabled),
                runTimeHhmm,
            })),
        });
    } catch (err) {
        console.error("Error updating default credit limit scheduler:", err);
        res.status(500).json({ message: err.message || "Failed to save scheduler settings" });
    }
});

router.post("/scheduler/run-now", async (req, res) => {
    try {
        const result = await scheduler.runNow();
        if (result.skipped) {
            return res.status(409).json({ message: "A scheduler run is already in progress", ...result });
        }

        res.json({ message: "Default credit limits updated", ...result });
    } catch (err) {
        console.error("Error running default credit limit scheduler:", err);
        res.status(500).json({ message: err.message || "Failed to update default credit limits" });
    }
});

router.get("/logs", async (req, res) => {
    try {
        const search = req.query.search || "";
        res.json(await Db.getUpdateLogs(search));
    } catch (err) {
        console.error("Error fetching default credit limit logs:", err);
        res.status(500).json({ message: "Failed to fetch default credit limit logs" });
    }
});

router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const rawLimit = req.body.default_cred_limit;
    const defaultCredLimit =
        rawLimit === "" || rawLimit === null || rawLimit === undefined
            ? null
            : Number(rawLimit);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid debtor id" });
    }

    if (rawLimit !== "" && rawLimit !== null && rawLimit !== undefined && Number.isNaN(defaultCredLimit)) {
        return res.status(400).json({ message: "Default credit limit must be a valid number" });
    }

    try {
        const existing = await Db.getEntryById(id);

        if (!existing) {
            return res.status(404).json({ message: "Debtor not found" });
        }

        const affectedRows = await Db.updateEntry(id, defaultCredLimit);

        if (!affectedRows) {
            return res.status(404).json({ message: "Debtor not found" });
        }

        await Db.insertUpdateLog({
            debtorId: existing.debtor_id,
            debtorCode: existing.debtor_code,
            debtorName: existing.debtor_name,
            oldDefaultCredLimit: existing.default_cred_limit,
            newDefaultCredLimit: defaultCredLimit,
            updatedBy: req.user.id,
        });

        res.json({ message: "Default credit limit updated successfully" });
    } catch (err) {
        console.error("Error updating default credit limit:", err);
        res.status(500).json({ message: "Failed to update default credit limit" });
    }
});

module.exports = router;
