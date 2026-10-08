const express = require("express");

const attendanceSyncService = require("../../services/attendanceSync.service");

const router = express.Router();

function parseBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }

    return Boolean(value);
}

router.get("/status", async (req, res) => {
    try {
        const status = await attendanceSyncService.getStatus();
        res.json(status);
    } catch (error) {
        console.error("Attendance sync status error:", error);
        res.status(500).json({
            message: error.message || "Failed to load attendance sync status",
        });
    }
});

router.get("/settings", async (req, res) => {
    try {
        const snapshot = await attendanceSyncService.getSettingsSnapshot();
        res.json(snapshot);
    } catch (error) {
        console.error("Attendance sync settings error:", error);
        res.status(500).json({
            message: error.message || "Failed to load attendance sync settings",
        });
    }
});

router.get("/logs", async (req, res) => {
    try {
        const logs = await attendanceSyncService.getLogs({
            mode: req.query.mode || null,
            status: req.query.status || null,
            limit: Number(req.query.limit) || 25,
        });
        res.json(logs);
    } catch (error) {
        console.error("Attendance sync logs error:", error);
        res.status(500).json({
            message: error.message || "Failed to load attendance sync logs",
        });
    }
});

router.post("/settings", async (req, res) => {
    const hasEnabledFlag = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        || Object.prototype.hasOwnProperty.call(req.body, "is_enabled");
    const rawEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        ? req.body.isEnabled
        : req.body.is_enabled;
    const intervalMinutes = Number(
        Object.prototype.hasOwnProperty.call(req.body, "intervalMinutes")
            ? req.body.intervalMinutes
            : req.body.interval_minutes
    );

    if (!hasEnabledFlag) {
        return res.status(400).json({
            message: "isEnabled is required",
        });
    }

    if (!Number.isInteger(intervalMinutes)) {
        return res.status(400).json({
            message: "intervalMinutes must be 2, 15, 30, or 60",
        });
    }

    try {
        const snapshot = await attendanceSyncService.updateSettings({
            isEnabled: parseBoolean(rawEnabled),
            intervalMinutes,
        });

        res.json({
            message: "Attendance sync settings saved",
            ...snapshot,
        });
    } catch (error) {
        console.error("Attendance sync save settings error:", error);
        res.status(500).json({
            message: error.message || "Failed to save attendance sync settings",
        });
    }
});

router.post("/sync", async (req, res) => {
    try {
        const hostIp = req.ip
            || req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            || req.socket?.remoteAddress
            || null;

        const result = await attendanceSyncService.runManualSync({
            triggeredByUserId: req.user?.id || null,
            hostIp,
        });

        if (result?.skipped && result.reason === "already_running") {
            return res.status(409).json({
                message: "Attendance sync is already running",
                ...result,
            });
        }

        res.json({
            message: result.hasMorePending
                ? "Sync finished for this run. More rows are still pending."
                : "Attendance sync completed successfully",
            ...result,
        });
    } catch (error) {
        console.error("Attendance sync run error:", error);
        res.status(500).json({
            message: error.message || "Attendance sync failed",
        });
    }
});

module.exports = router;
