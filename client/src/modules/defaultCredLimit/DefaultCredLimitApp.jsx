import React, { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";

const DefaultCredLimitApp = () => {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [schedulerStatus, setSchedulerStatus] = useState(null);
    const [schedulerForm, setSchedulerForm] = useState({ isEnabled: false, runTimeHhmm: "23:00" });
    const [schedulerDirty, setSchedulerDirty] = useState(false);
    const [schedulerLoading, setSchedulerLoading] = useState(false);
    const [schedulerSaving, setSchedulerSaving] = useState(false);
    const [schedulerRunning, setSchedulerRunning] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logSearch, setLogSearch] = useState("");

    const fetchSchedulerStatus = async (syncForm = true) => {
        try {
            setSchedulerLoading(true);
            const res = await api.get("/default-cred-limit/scheduler/status");
            setSchedulerStatus(res.data);

            if (syncForm && !schedulerDirty) {
                setSchedulerForm({
                    isEnabled: Boolean(res.data?.settings?.isEnabled),
                    runTimeHhmm: res.data?.settings?.runTimeHhmm || "23:00",
                });
            }
        } catch (err) {
            console.error("Error fetching default credit limit scheduler status:", err);
            showToast("Failed to fetch scheduler status", "error");
        } finally {
            setSchedulerLoading(false);
        }
    };

    const fetchRows = async (searchValue = "") => {
        try {
            setIsLoading(true);
            const res = await api.get(
                `/default-cred-limit?search=${encodeURIComponent(searchValue)}`
            );
            setRows(res.data);
        } catch (err) {
            console.error("Error fetching default credit limits:", err);
            showToast("Failed to fetch records", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async (searchValue = logSearch) => {
        try {
            const res = await api.get(
                `/default-cred-limit/logs?search=${encodeURIComponent(searchValue)}`
            );
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching default credit limit logs:", err);
            showToast("Failed to fetch logs", "error");
        }
    };

    useEffect(() => {
        fetchRows("");
        fetchSchedulerStatus();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => fetchSchedulerStatus(false), 30000);
        return () => clearInterval(timer);
    }, [schedulerDirty]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (showLogs) {
                fetchLogs(logSearch);
            } else {
                fetchRows(search);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [search, showLogs, logSearch]);

    const handleEdit = (row) => {
        setEditingId(row.debtor_id);
        setEditValue(
            row.default_cred_limit === null || row.default_cred_limit === undefined
                ? ""
                : String(row.default_cred_limit)
        );
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue("");
    };

    const handleSave = async (debtorId) => {
        try {
            await api.put(`/default-cred-limit/${debtorId}`, {
                default_cred_limit: editValue.trim(),
            });
            showToast("Default credit limit updated", "success");
            setEditingId(null);
            setEditValue("");
            fetchRows(search);
        } catch (err) {
            console.error("Error updating default credit limit:", err);
            showToast(
                err.response?.data?.message || "Failed to update default credit limit",
                "error"
            );
        }
    };

    const handleSaveScheduler = async () => {
        try {
            setSchedulerSaving(true);
            const res = await api.post("/default-cred-limit/scheduler/settings", schedulerForm);
            setSchedulerStatus(res.data);
            setSchedulerDirty(false);
            showToast("Default credit limit schedule saved", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save scheduler settings", "error");
        } finally {
            setSchedulerSaving(false);
        }
    };

    const handleRunSchedulerNow = async () => {
        try {
            setSchedulerRunning(true);
            const res = await api.post("/default-cred-limit/scheduler/run-now");
            showToast(`${res.data.updatedCount || 0} debtor credit limits updated`, "success");
            await fetchRows(search);
            await fetchSchedulerStatus(false);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to run credit limit update", "error");
        } finally {
            setSchedulerRunning(false);
        }
    };

    const toggleLogs = () => {
        const nextShowLogs = !showLogs;
        setShowLogs(nextShowLogs);

        if (nextShowLogs) {
            setLogSearch("");
            fetchLogs("");
        }
    };

    const formatDateTime = (value) => value
        ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : "-";

    const schedulerSettings = schedulerStatus?.settings || {};

    return (
        <div className="default-cred-limit-page">
            <div className="default-cred-limit-header">
                <div>
                    <h2>Default Credit Limit</h2>
                    <p>Search debtors and set or edit the default credit limit.</p>
                </div>

                <input
                    type="text"
                    placeholder={showLogs ? "Search logs by debtor code or name..." : "Search by debtor code or name..."}
                    value={showLogs ? logSearch : search}
                    onChange={(e) => showLogs ? setLogSearch(e.target.value) : setSearch(e.target.value)}
                />
                <button type="button" className="secondary-btn" onClick={toggleLogs}>
                    {showLogs ? "Back to Defaults" : "View Logs"}
                </button>
            </div>

            {!showLogs ? <>
            <section className="default-cred-limit-scheduler">
                <div className="default-cred-limit-scheduler-head">
                    <div>
                        <h3>Daily Credit Limit Update</h3>
                        <p>Copy configured default limits into debtor credit limits.</p>
                    </div>
                    <span className={`default-cred-limit-status ${schedulerSettings.isEnabled ? "is-enabled" : "is-disabled"}`}>
                        {schedulerSettings.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                </div>

                <div className="default-cred-limit-scheduler-controls">
                    <label className="default-cred-limit-toggle">
                        <input
                            type="checkbox"
                            checked={schedulerForm.isEnabled}
                            onChange={(event) => {
                                setSchedulerDirty(true);
                                setSchedulerForm((current) => ({ ...current, isEnabled: event.target.checked }));
                            }}
                        />
                        <span>Enable daily update</span>
                    </label>

                    <label className="default-cred-limit-time-field">
                        <span>Run time</span>
                        <input
                            type="time"
                            value={schedulerForm.runTimeHhmm}
                            onChange={(event) => {
                                setSchedulerDirty(true);
                                setSchedulerForm((current) => ({ ...current, runTimeHhmm: event.target.value }));
                            }}
                        />
                    </label>

                    <button type="button" className="primary-btn" onClick={handleSaveScheduler} disabled={schedulerSaving || schedulerLoading}>
                        {schedulerSaving ? "Saving..." : "Save Schedule"}
                    </button>
                    <button type="button" className="secondary-btn" onClick={handleRunSchedulerNow} disabled={schedulerRunning || schedulerLoading}>
                        {schedulerRunning ? "Running..." : "Run Now"}
                    </button>
                </div>

                <div className="default-cred-limit-scheduler-status">
                    <span>Next run: <strong>{schedulerStatus?.runtime?.nextRunAt ? formatDateTime(schedulerStatus.runtime.nextRunAt) : "-"}</strong></span>
                    <span>Last run: <strong>{formatDateTime(schedulerSettings.lastRunAt)}</strong></span>
                    <span>Last success: <strong>{formatDateTime(schedulerSettings.lastSuccessAt)}</strong></span>
                    <span>Rows updated: <strong>{schedulerSettings.lastUpdatedCount ?? 0}</strong></span>
                    {schedulerSettings.lastError ? <span className="default-cred-limit-error">Error: {schedulerSettings.lastError}</span> : null}
                </div>
            </section>

            <div className="default-cred-limit-table-wrap">
                <table className="default-cred-limit-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Debtor Code</th>
                            <th>Debtor Name</th>
                            <th>Default Credit Limit</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!isLoading && rows.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="default-cred-limit-empty">
                                    No debtors found
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr key={row.debtor_id}>
                                    <td>{index + 1}</td>
                                    <td>{row.debtor_code}</td>
                                    <td>{row.debtor_name}</td>
                                    <td>
                                        {editingId === row.debtor_id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                            />
                                        ) : (
                                            row.default_cred_limit ?? "-"
                                        )}
                                    </td>
                                    <td className="default-cred-limit-actions">
                                        {editingId === row.debtor_id ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="primary-btn"
                                                    onClick={() => handleSave(row.debtor_id)}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    className="secondary-btn"
                                                    onClick={handleCancel}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className="primary-btn"
                                                onClick={() => handleEdit(row)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            </> : (
                <div className="default-cred-limit-table-wrap">
                    <table className="default-cred-limit-table default-cred-limit-log-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Debtor Code</th>
                                <th>Debtor Name</th>
                                <th>Old Default Limit</th>
                                <th>New Default Limit</th>
                                <th>Edited By</th>
                                <th>Edited On</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="default-cred-limit-empty">No logs found</td>
                                </tr>
                            ) : logs.map((log, index) => (
                                <tr key={log.id || index}>
                                    <td>{index + 1}</td>
                                    <td>{log.debtor_code || "-"}</td>
                                    <td>{log.debtor_name || "-"}</td>
                                    <td>{log.old_default_cred_limit ?? "NULL"}</td>
                                    <td>{log.new_default_cred_limit ?? "NULL"}</td>
                                    <td>{log.updated_by || "-"}</td>
                                    <td>{new Date(log.updated_on).toLocaleString("en-IN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DefaultCredLimitApp;
