import { useEffect, useState } from "react";
import api from "../../api";
import "./debtor1.css"; // ✅ NEW CSS (DO NOT CHANGE)
import { showToast } from "../../utils/toast";

function Debtor1Home() {

    const [debtors, setDebtors] = useState([]);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logSearch, setLogSearch] = useState("");
    const [mailStatus, setMailStatus] = useState(null);
    const [mailForm, setMailForm] = useState({ recipientEmail: "", isEnabled: false, sendTimeHhmm: "08:30" });
    const [mailSettingsDirty, setMailSettingsDirty] = useState(false);
    const [mailSaving, setMailSaving] = useState(false);
    const [mailSending, setMailSending] = useState(false);

    // =========================
    // FETCH DATA
    // =========================
    const fetchDebtors = async (searchValue = search) => {
        try {
            const res = await api.get(
                `/debtor1?search=${encodeURIComponent(searchValue)}`
            );
            setDebtors(res.data);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const fetchLogs = async (searchValue = "") => {
        try {
            const res = await api.get(
                `/debtor1/logs?search=${encodeURIComponent(searchValue)}`
            );
            setLogs(res.data);
        } catch (err) {
            console.error("Logs fetch error:", err);
        }
    };

    const fetchMailStatus = async (syncForm = true) => {
        try {
            const res = await api.get("/debtor1/mail/status");
            setMailStatus(res.data);
            if (syncForm && !mailSettingsDirty) {
                setMailForm({
                    recipientEmail: res.data?.settings?.recipientEmail || "",
                    isEnabled: Boolean(res.data?.settings?.isEnabled),
                    sendTimeHhmm: res.data?.settings?.sendTimeHhmm || "08:30",
                });
            }
        } catch (err) {
            console.error("Mail status fetch error:", err);
        }
    };

    // Initial load
    useEffect(() => {
        fetchDebtors("");
        fetchMailStatus();
    }, []);

    // Live search (debounced)
    useEffect(() => { 
        const delay = setTimeout(() => {
            fetchDebtors(search);
        }, 300);

        return () => clearTimeout(delay);
    }, [search]);

    // =========================
    // EDIT HANDLERS
    // =========================
    const handleEdit = (row) => {
        setEditingId(row.debtor_id);
        setEditData({
            credit_limit: row.credit_limit,
            credit_days: row.credit_days,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async () => {
        if (!editingId) return;

        try {
            const res = await api.put(
                `/debtor1/${editingId}`,
                editData
            );

            alert(res.data.message);

            setEditingId(null);
            setEditData({});

            // reload with current search
            fetchDebtors(search);
        } catch (err) {
            alert(err.response?.data?.message || "Update failed");
        }
    };

    const handleSaveMailSettings = async () => {
        try {
            setMailSaving(true);
            const res = await api.post("/debtor1/mail/settings", mailForm);
            setMailStatus(res.data);
            setMailSettingsDirty(false);
            showToast("Debtor1 mail schedule saved", "success");
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save mail settings", "error");
        } finally {
            setMailSaving(false);
        }
    };

    const handleSendMailNow = async () => {
        try {
            setMailSending(true);
            const res = await api.post("/debtor1/mail/send-now");
            if (res.data.skipped && res.data.reason === "nothing_pending") {
                showToast("There are no pending report dates", "success");
            } else {
                showToast(`Report sent with ${res.data.rowCount || 0} changes`, "success");
            }
            await fetchMailStatus(false);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to send debtor1 report", "error");
        } finally {
            setMailSending(false);
        }
    };

    const formatMailDate = (value) => value
        ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : "-";

    const mailSettings = mailStatus?.settings || {};

    // =========================
    // UI
    // =========================


    return (
        <div className="debtor-page">
            <h2>Credit Info Update</h2>

            <section className="debtor-mail-panel">
                <div className="debtor-mail-panel-head">
                    <div>
                        <h3>Daily Credit Limit Changes</h3>
                        <p>Sends manual credit-limit changes as an Excel attachment.</p>
                    </div>
                    <span className={`debtor-mail-status ${mailSettings.isEnabled ? "is-enabled" : "is-disabled"}`}>
                        {mailSettings.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                </div>

                <div className="debtor-mail-controls">
                    <label className="debtor-mail-recipient-field">
                        <span>Recipients</span>
                        <input
                            type="text"
                            placeholder="name@example.com, another@example.com"
                            value={mailForm.recipientEmail}
                            onChange={(event) => {
                                setMailSettingsDirty(true);
                                setMailForm((current) => ({ ...current, recipientEmail: event.target.value }));
                            }}
                        />
                    </label>
                    <label className="debtor-mail-time-field">
                        <span>Daily time</span>
                        <input
                            type="time"
                            value={mailForm.sendTimeHhmm}
                            onChange={(event) => {
                                setMailSettingsDirty(true);
                                setMailForm((current) => ({ ...current, sendTimeHhmm: event.target.value }));
                            }}
                        />
                    </label>
                    <label className="debtor-mail-toggle">
                        <input
                            type="checkbox"
                            checked={mailForm.isEnabled}
                            onChange={(event) => {
                                setMailSettingsDirty(true);
                                setMailForm((current) => ({ ...current, isEnabled: event.target.checked }));
                            }}
                        />
                        <span>Enable daily email</span>
                    </label>
                    <button type="button" className="debtor-mail-primary" onClick={handleSaveMailSettings} disabled={mailSaving}>
                        {mailSaving ? "Saving..." : "Save Schedule"}
                    </button>
                    <button type="button" className="debtor-mail-secondary" onClick={handleSendMailNow} disabled={mailSending}>
                        {mailSending ? "Sending..." : "Send Now"}
                    </button>
                </div>

                <div className="debtor-mail-status-row">
                    <span>Next run: <strong>{formatMailDate(mailStatus?.runtime?.nextRunAt)}</strong></span>
                    <span>Last run: <strong>{formatMailDate(mailSettings.lastRunAt)}</strong></span>
                    <span>Last success: <strong>{formatMailDate(mailSettings.lastSuccessAt)}</strong></span>
                    <span>Rows: <strong>{mailSettings.lastRowCount ?? 0}</strong></span>
                    <span>Pending dates: <strong>{mailStatus?.pendingReportDates?.length ?? 0}</strong></span>
                    {mailSettings.lastError ? <span className="debtor-mail-error">Error: {mailSettings.lastError}</span> : null}
                </div>
            </section>

            {/* 🔹 HEADER (search + button stays SAME) */}
            <div className="debtor-header-row">
                <div className="debtor-search">
                    <input
                        type="text"
                        placeholder={
                            showLogs
                                ? "Search logs by debtor code..."
                                : "Search by code or name..."
                        }
                        value={showLogs ? logSearch : search}
                        onChange={(e) => {
                            const value = e.target.value;

                            if (showLogs) {
                                setLogSearch(value);
                                fetchLogs(value);
                            } else {
                                setSearch(value);
                            }
                        }}
                    />
                </div>

                <div className="debtor-header-actions">
                    <button
                        className="debtor-toggle-btn"
                        onClick={() => {
                            if (!showLogs) {
                                setLogSearch("");
                                fetchLogs("");
                            }
                            setShowLogs(!showLogs);
                        }}
                    >
                        {showLogs ? "← Back to Debtors" : "View Logs"}
                    </button>
                </div>
            </div>

            {/* 🔥 SWITCH STARTS HERE */}

            {!showLogs ? (
                // =========================
                // 🔹 NORMAL DEBTOR TABLE
                // =========================
                <div className="debtor-table-wrapper">
                    <table className="debtor-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Credit Limit</th>
                                <th>Credit Days</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {debtors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="debtor-no-data">
                                        No data found
                                    </td>
                                </tr>
                            ) : (
                                debtors.map((d, index) => (
                                    <tr key={d.debtor_id}>
                                        <td>{index + 1}</td>
                                        <td>{d.debtor_code}</td>
                                        <td>{d.debtor_name}</td>

                                        <td>
                                            {editingId === d.debtor_id ? (
                                                <input
                                                    type="number"
                                                    value={editData.credit_limit}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            credit_limit: e.target.value,
                                                        })
                                                    }
                                                />
                                            ) : (
                                                d.credit_limit
                                            )}
                                        </td>

                                        <td>
                                            {editingId === d.debtor_id ? (
                                                <input
                                                    type="number"
                                                    value={editData.credit_days}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            credit_days: e.target.value,
                                                        })
                                                    }
                                                />
                                            ) : (
                                                d.credit_days
                                            )}
                                        </td>

                                        <td>
                                            {editingId === d.debtor_id ? (
                                                <>
                                                    <button onClick={handleSave}>Save</button>
                                                    <button onClick={handleCancel}>Cancel</button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleEdit(d)}>
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
            ) : (
                // =========================
                // 🔹 LOGS TABLE
                // =========================
                <div className="debtor-table-wrapper">
                    <table className="debtor-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Code</th>
                                <th>Field</th>
                                <th>Old Value</th>
                                <th>New Value</th>
                                <th>Updated_by</th>
                                <th>Updated_on</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="debtor-no-data">
                                        No logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, index) => (
                                    <tr key={log.log_id || index}>
                                        <td>{index + 1}</td>
                                        <td>{log.debtor_code}</td>
                                        <td>{log.field_name}</td>
                                        <td>{log.old_value}</td>
                                        <td>{log.new_value}</td>
                                        <td>{log.updated_by}</td>
                                        <td>
                                            {new Date(log.updated_on).toLocaleString("en-IN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                    hour12: false
                                                })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 🔥 SWITCH ENDS HERE */}
        </div>
    );

}

export default Debtor1Home;
