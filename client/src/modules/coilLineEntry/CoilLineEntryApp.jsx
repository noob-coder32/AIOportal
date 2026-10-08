import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./coilLineEntry.css";

const PRODUCTION_LINES = ["CCL Line", "CORRUGATION", "ETL (ARL)", "C.R. Coil Side Slitting"];

const EMPTY_FORM = {
    coil_no: "",
    production_line: "",
};

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function CoilLineEntryApp() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [entries, setEntries] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const res = await api.get("/coil-line-entry");
            setEntries(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load entries", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get("/coil-line-entry/logs");
            setLogs(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load logs", "error");
        }
    };

    useEffect(() => {
        fetchEntries();
        fetchLogs();
    }, []);

    const handleChange = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.coil_no.trim() || !form.production_line) {
            showToast("Coil number and production line are required", "error");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/coil-line-entry", {
                coil_no: form.coil_no.trim(),
                production_line: form.production_line,
            });
            showToast("Entry saved successfully", "success");
            setForm(EMPTY_FORM);
            await Promise.all([fetchEntries(), fetchLogs()]);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save entry", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="coil-line-entry-root">
            <div className="coil-line-entry-card">
                <div className="coil-line-entry-hero">
                    <div className="coil-line-entry-intro">
                        <h2>Coil Line Entry</h2>
                        <p>Capture coil numbers against production lines and keep a clean creation log for follow-up updates.</p>
                    </div>
                </div>

                <form className="coil-line-entry-form" onSubmit={handleSubmit}>
                    <div className="coil-line-entry-field">
                        <label htmlFor="coil_no">Coil No</label>
                        <input
                            id="coil_no"
                            type="text"
                            value={form.coil_no}
                            onChange={(event) => handleChange("coil_no", event.target.value)}
                            placeholder="Enter coil number"
                            maxLength={100}
                        />
                    </div>

                    <div className="coil-line-entry-field">
                        <label htmlFor="production_line">Production Line</label>
                        <select
                            id="production_line"
                            value={form.production_line}
                            onChange={(event) => handleChange("production_line", event.target.value)}
                        >
                            <option value="">Select production line</option>
                            {PRODUCTION_LINES.map((line) => (
                                <option key={line} value={line}>
                                    {line}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="coil-line-entry-submit" disabled={submitting}>
                        {submitting ? "Saving..." : "Save Entry"}
                    </button>
                </form>

                <section className="coil-line-entry-section coil-line-entry-panel">
                    <div className="coil-line-entry-section-header">
                        <div>
                            <h3>Saved Entries</h3>
                            <p>Latest records submitted by users.</p>
                        </div>
                        <span className="coil-line-entry-chip">{entries.length} total</span>
                    </div>

                    <div className="coil-line-entry-table-wrap">
                        <table className="coil-line-entry-table">
                            <thead>
                                <tr>
                                    <th>Coil No</th>
                                    <th>Production Line</th>
                                    <th>Updated Date & Time</th>
                                    <th>Created By</th>
                                    <th>Created On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && entries.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="coil-line-entry-empty">
                                            No entries found
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>{entry.coil_no}</td>
                                            <td>{entry.production_line}</td>
                                            <td>{formatDateTime(entry.updated_date_time)}</td>
                                            <td>{entry.created_by || "-"}</td>
                                            <td>{formatDateTime(entry.created_on)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="coil-line-entry-section coil-line-entry-panel">
                    <div className="coil-line-entry-section-header">
                        <div>
                            <h3>Logs</h3>
                            <p>Audit trail for field values saved during entry creation.</p>
                        </div>
                        <span className="coil-line-entry-chip coil-line-entry-chip-muted">{logs.length} events</span>
                    </div>

                    <div className="coil-line-entry-table-wrap">
                        <table className="coil-line-entry-table">
                            <thead>
                                <tr>
                                    <th>Coil No</th>
                                    <th>Production Line</th>
                                    <th>Action</th>
                                    <th>Field</th>
                                    <th>Old Value</th>
                                    <th>New Value</th>
                                    <th>Updated By</th>
                                    <th>Updated On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="coil-line-entry-empty">
                                            No logs found
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{log.coil_no || "-"}</td>
                                            <td>{log.production_line || "-"}</td>
                                            <td>
                                                <span className="coil-line-entry-badge">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>{log.field_name}</td>
                                            <td>{log.old_value || "-"}</td>
                                            <td>{log.new_value || "-"}</td>
                                            <td>{log.updated_by || "-"}</td>
                                            <td>{formatDateTime(log.updated_on)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default CoilLineEntryApp;
