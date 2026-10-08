import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./attendanceSync.css";

const ACTIVE_POLL_INTERVAL_MS = 10000;
const IDLE_POLL_INTERVAL_MS = 45000;

const INTERVAL_OPTIONS = [
    {value: 2, label: "2 minutes" },
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
];

const LOG_MODE_OPTIONS = [
    { value: "", label: "All modes" },
    { value: "manual", label: "Manual" },
    { value: "auto", label: "Auto" },
];

const LOG_STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "running", label: "Running" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "skipped", label: "Skipped" },
];

function formatDuration(value) {
    if (value === null || value === undefined) {
        return "-";
    }

    if (value < 1000) {
        return `${value} ms`;
    }

    return `${(value / 1000).toFixed(2)} s`;
}

function formatLabel(value) {
    if (!value) {
        return "-";
    }

    return String(value)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function AttendanceSyncApp() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefreshing, setAutoRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [logFilters, setLogFilters] = useState({
        mode: "",
        status: "",
    });
    const [settingsForm, setSettingsForm] = useState({
        isEnabled: false,
        intervalMinutes: 15,
    });
    const [settingsDirty, setSettingsDirty] = useState(false);

    useEffect(() => {
        loadStatus({ mode: "initial", syncForm: true });
    }, []);

    useEffect(() => {
        loadLogs({ mode: "initial" });
    }, [logFilters.mode, logFilters.status]);

    async function loadStatus({ mode = "manual", syncForm = false } = {}) {
        try {
            if (mode === "initial") {
                setLoading(true);
            } else if (mode === "auto") {
                setAutoRefreshing(true);
            } else {
                setRefreshing(true);
            }

            const res = await api.get("/attendance-sync/status");
            setStatus(res.data);
            if (syncForm || !settingsDirty) {
                setSettingsForm({
                    isEnabled: Boolean(res.data?.settings?.isEnabled),
                    intervalMinutes: Number(res.data?.settings?.intervalMinutes) || 15,
                });
                setSettingsDirty(false);
            }
        } catch (error) {
            if (mode !== "auto") {
                showToast(error.response?.data?.message || "Failed to load attendance sync status", "error");
            }
        } finally {
            if (mode === "initial") {
                setLoading(false);
            } else if (mode === "auto") {
                setAutoRefreshing(false);
            } else {
                setRefreshing(false);
            }
        }
    }

    async function loadLogs({ mode = "manual" } = {}) {
        try {
            if (mode === "initial" || mode === "manual") {
                setLogsLoading(true);
            }

            const res = await api.get("/attendance-sync/logs", {
                params: {
                    mode: logFilters.mode || undefined,
                    status: logFilters.status || undefined,
                    limit: 50,
                },
            });
            setLogs(res.data || []);
        } catch (error) {
            if (mode !== "auto") {
                showToast(error.response?.data?.message || "Failed to load attendance sync logs", "error");
            }
        } finally {
            if (mode === "initial" || mode === "manual") {
                setLogsLoading(false);
            }
        }
    }

    useEffect(() => {
        if (!status) {
            return undefined;
        }

        const isBackgroundActive = Boolean(
            status?.runtime?.isRunning
            || status?.runtime?.isPendingScanRunning
            || status?.data?.pendingScanStatus === "running"
        );

        const timer = window.setTimeout(() => {
            loadStatus({ mode: "auto" });

            if (isBackgroundActive) {
                loadLogs({ mode: "auto" });
            }
        }, isBackgroundActive ? ACTIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [status, logFilters.mode, logFilters.status, settingsDirty]);

    async function handleSyncNow() {
        try {
            setSyncing(true);
            const res = await api.post("/attendance-sync/sync");
            const suffix = res.data.hasMorePending
                ? ` ${res.data.remainingCount ?? "More"} rows are still pending.`
                : "";

            showToast(`${res.data.message} Inserted ${res.data.insertedCount} row(s).${suffix}`, "success");
            await Promise.all([
                loadStatus({ mode: "manual" }),
                loadLogs({ mode: "manual" }),
            ]);
        } catch (error) {
            showToast(error.response?.data?.message || "Attendance sync failed", "error");
        } finally {
            setSyncing(false);
        }
    }

    async function handleSaveSettings() {
        try {
            setSavingSettings(true);
            const res = await api.post("/attendance-sync/settings", settingsForm);
            setStatus((current) => ({
                ...(current || {}),
                settings: res.data.settings,
                runtime: res.data.runtime,
            }));
            setSettingsDirty(false);
            showToast("Attendance auto-sync settings saved", "success");
            await loadStatus({ mode: "manual", syncForm: true });
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to save attendance sync settings", "error");
        } finally {
            setSavingSettings(false);
        }
    }

    const latestAwsCheckTime = status?.data?.latestAwsCheckTime || null;
    const latestLocalCheckTime = status?.data?.latestLocalCheckTime || null;
    const pendingCount = Number(status?.data?.pendingCount || 0);
    const previewRows = status?.data?.previewRows || [];
    const pendingScanStatus = status?.data?.pendingScanStatus || "idle";
    const pendingScanError = status?.data?.pendingScanError || "";
    const awsStatus = status?.data?.awsStatus || "unknown";
    const awsError = status?.data?.awsError || "";
    const runtime = status?.runtime || {};
    const settings = status?.settings || {};
    const isBackgroundActive = Boolean(
        runtime.isRunning
        || runtime.isPendingScanRunning
        || pendingScanStatus === "running"
    );
    const isStatusRefreshing = loading || refreshing || autoRefreshing;
    const liveMessage = isBackgroundActive
        ? "Background scan/sync is in progress. This screen refreshes automatically."
        : autoRefreshing
            ? "Checking the latest attendance sync status."
            : "Status refreshes automatically while this page is open.";

    return (
        <div className="attendance-sync-page">
            <section className="attendance-sync-hero">
                <div>
                    <p className="attendance-sync-eyebrow">Attendance Sync AWS</p>
                    <h3>Sync punching data from local DB to AWS </h3>
                    <p className="attendance-sync-copy">
                        Pending rows are checked only within the last 2 months. Manual sync runs up to 20 batches of
                        10,000 rows.
                    </p>
                </div>

                <div className="attendance-sync-hero-badge">
                    <span>Batch size</span>
                    <strong>10,000 rows</strong>
                </div>
            </section>

            <section className="attendance-sync-grid">
                <article className="attendance-sync-card attendance-sync-stat-card">
                    <span>Latest AWS Checktime</span>
                    <strong>{formatDateTime(latestAwsCheckTime)}</strong>
                    {awsStatus === "failed" ? <small className="is-error">AWS unavailable</small> : null}
                </article>

                <article className="attendance-sync-card attendance-sync-stat-card">
                    <span>Latest Local Checktime</span>
                    <strong>{formatDateTime(latestLocalCheckTime)}</strong>
                </article>

                <article className="attendance-sync-card attendance-sync-stat-card">
                    <span>Pending Rows</span>
                    <strong>{pendingCount.toLocaleString("en-IN")}</strong>
                </article>

                <article className="attendance-sync-card attendance-sync-stat-card">
                    <span>Auto-Sync</span>
                    <strong>{settings.isEnabled ? "Enabled" : "Disabled"}</strong>
                </article>
            </section>

            <section className="attendance-sync-layout">
                <article className="attendance-sync-card attendance-sync-control-card">
                    <div className="attendance-sync-card-head">
                        <div>
                            <h3>Controls</h3>
                            <p>Only rows missing in AWS within the last 2 months are considered pending.</p>
                        </div>
                    </div>

                    <div className="attendance-sync-actions">
                        <button
                            type="button"
                            className="attendance-sync-btn attendance-sync-btn-secondary"
                            onClick={() => loadStatus({ mode: "manual" })}
                            disabled={loading || refreshing || syncing || savingSettings}
                        >
                            {refreshing ? "Refreshing..." : "Refresh Status"}
                        </button>

                        <button
                            type="button"
                            className="attendance-sync-btn attendance-sync-btn-primary"
                            onClick={handleSyncNow}
                            disabled={loading || syncing || savingSettings}
                        >
                            {syncing ? "Syncing..." : "Sync Now"}
                        </button>
                    </div>

                    <div className="attendance-sync-settings-panel">
                        <div className="attendance-sync-toggle-row">
                            <div>
                                <h4>Auto Update</h4>
                                <p>Runs in the backend even when this module screen is closed.</p>
                            </div>

                            <label className="attendance-sync-switch">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.isEnabled}
                                    onChange={(event) => {
                                        setSettingsDirty(true);
                                        setSettingsForm((current) => ({
                                            ...current,
                                            isEnabled: event.target.checked,
                                        }));
                                    }}
                                />
                                <span className="attendance-sync-slider" />
                            </label>
                        </div>

                        <div className="attendance-sync-form-row">
                            <div className="attendance-sync-field">
                                <label htmlFor="intervalMinutes">Interval</label>
                                <select
                                    id="intervalMinutes"
                                    value={settingsForm.intervalMinutes}
                                    onChange={(event) => {
                                        setSettingsDirty(true);
                                        setSettingsForm((current) => ({
                                            ...current,
                                            intervalMinutes: Number(event.target.value),
                                        }));
                                    }}
                                >
                                    {INTERVAL_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="button"
                                className="attendance-sync-btn attendance-sync-btn-ghost"
                                onClick={handleSaveSettings}
                                disabled={loading || syncing || savingSettings}
                            >
                                {savingSettings ? "Saving..." : "Save Auto-Sync"}
                            </button>
                        </div>
                    </div>

                    <div className={`attendance-sync-live-indicator${isBackgroundActive ? " is-active" : ""}`}>
                        <span className={`attendance-sync-spinner${isStatusRefreshing || isBackgroundActive ? " is-spinning" : ""}`} />
                        <div>
                            <strong>{isBackgroundActive ? "Live background activity" : "Live status"}</strong>
                            <p>{liveMessage}</p>
                        </div>
                    </div>

                    <div className="attendance-sync-status-list">
                        <div>
                            <span>Runtime status</span>
                            <strong>{runtime.isRunning ? `Running (${runtime.activeMode || "sync"})` : "Idle"}</strong>
                        </div>
                        <div>
                            <span>Next auto run</span>
                            <strong>{formatDateTime(runtime.nextRunAt)}</strong>
                        </div>
                        <div>
                            <span>AWS status</span>
                            <strong className={awsStatus === "failed" ? "is-error" : ""}>
                                {formatLabel(awsStatus)}
                            </strong>
                        </div>
                        <div>
                            <span>Last run</span>
                            <strong>{formatDateTime(settings.lastRunAt)}</strong>
                        </div>
                        <div>
                            <span>Last success</span>
                            <strong>{formatDateTime(settings.lastSuccessAt)}</strong>
                        </div>
                        <div>
                            <span>Last synced checktime</span>
                            <strong>{formatDateTime(settings.lastSyncedChecktime)}</strong>
                        </div>
                        <div>
                            <span>Pending snapshot</span>
                            <strong>{formatDateTime(status?.data?.pendingSnapshotAt)}</strong>
                        </div>
                        <div>
                            <span>Pending scan</span>
                            <strong className={pendingScanError ? "is-error" : ""}>
                                {formatLabel(pendingScanError ? "failed" : pendingScanStatus)}
                            </strong>
                        </div>
                        <div>
                            <span>Scan duration</span>
                            <strong>{formatDuration(status?.data?.pendingScanDurationMs)}</strong>
                        </div>
                        <div>
                            <span>Last error</span>
                            <strong className={settings.lastError ? "is-error" : ""}>{settings.lastError || "-"}</strong>
                        </div>
                        {awsError ? (
                            <div>
                                <span>AWS error</span>
                                <strong className="is-error">{awsError}</strong>
                            </div>
                        ) : null}
                        {pendingScanError ? (
                            <div>
                                <span>Scan error</span>
                                <strong className="is-error">{pendingScanError}</strong>
                            </div>
                        ) : null}
                    </div>
                </article>

                <article className="attendance-sync-card attendance-sync-preview-card">
                    <div className="attendance-sync-card-head">
                        <div>
                            <h3>Next Pending Rows</h3>
                            <p>
                                Preview uses the latest pending snapshot.
                                {pendingScanStatus === "running" ? " A fresh scan is running in the background." : ""}
                            </p>
                        </div>
                        <span className="attendance-sync-pill">{previewRows.length} shown</span>
                    </div>

                    {loading ? (
                        <div className="attendance-sync-empty">Loading attendance sync status...</div>
                    ) : previewRows.length === 0 ? (
                        <div className="attendance-sync-empty">No pending rows to sync right now.</div>
                    ) : (
                        <div className="attendance-sync-table-wrap">
                            <table className="attendance-sync-table">
                                <thead>
                                    <tr>
                                        <th>User ID</th>
                                        <th>Checktime</th>
                                        <th>Type</th>
                                        <th>Verify</th>
                                        <th>Sensor</th>
                                        <th>WorkCode</th>
                                        <th>SN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewRows.map((row, index) => (
                                        <tr key={`${row.USERID}-${row.CHECKTIME}-${index}`}>
                                            <td>{row.USERID}</td>
                                            <td>{formatDateTime(row.CHECKTIME)}</td>
                                            <td>{row.CHECKTYPE}</td>
                                            <td>{row.VERIFYCODE}</td>
                                            <td>{row.SENSORID}</td>
                                            <td>{row.WorkCode}</td>
                                            <td>{row.sn}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </article>
            </section>

            <section className="attendance-sync-card attendance-sync-log-card">
                <div className="attendance-sync-card-head">
                    <div>
                        <h3>Sync History</h3>
                        <p>Each row is one sync run, so you can see how far AWS moved forward on every attempt.</p>
                    </div>
                    <span className="attendance-sync-pill">{logs.length} rows</span>
                </div>

                <div className="attendance-sync-log-filters">
                    <div className="attendance-sync-field">
                        <label htmlFor="log-mode">Mode</label>
                        <select
                            id="log-mode"
                            value={logFilters.mode}
                            onChange={(event) =>
                                setLogFilters((current) => ({
                                    ...current,
                                    mode: event.target.value,
                                }))
                            }
                        >
                            {LOG_MODE_OPTIONS.map((option) => (
                                <option key={option.value || "all"} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="attendance-sync-field">
                        <label htmlFor="log-status">Status</label>
                        <select
                            id="log-status"
                            value={logFilters.status}
                            onChange={(event) =>
                                setLogFilters((current) => ({
                                    ...current,
                                    status: event.target.value,
                                }))
                            }
                        >
                            {LOG_STATUS_OPTIONS.map((option) => (
                                <option key={option.value || "all"} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="attendance-sync-btn attendance-sync-btn-ghost"
                        onClick={loadLogs}
                        disabled={logsLoading}
                    >
                        {logsLoading ? "Refreshing..." : "Refresh Logs"}
                    </button>
                </div>

                {logsLoading ? (
                    <div className="attendance-sync-empty">Loading sync history...</div>
                ) : logs.length === 0 ? (
                    <div className="attendance-sync-empty">No attendance sync logs found for the selected filters.</div>
                ) : (
                    <div className="attendance-sync-table-wrap">
                        <table className="attendance-sync-table attendance-sync-log-table">
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Status</th>
                                    <th>Triggered By</th>
                                    <th>Started</th>
                                    <th>Finished</th>
                                    <th>Duration</th>
                                    <th>Batches</th>
                                    <th>Inserted</th>
                                    <th>Remaining</th>
                                    <th>AWS Before</th>
                                    <th>Last Synced After</th>
                                    <th>Error / Skip</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>{formatLabel(log.run_mode)}</td>
                                        <td>
                                            <span className={`attendance-sync-log-status is-${log.status}`}>
                                                {formatLabel(log.status)}
                                            </span>
                                        </td>
                                        <td>{log.triggered_by_username || "-"}</td>
                                        <td>{formatDateTime(log.started_at)}</td>
                                        <td>{formatDateTime(log.finished_at)}</td>
                                        <td>{formatDuration(log.duration_ms)}</td>
                                        <td>{log.processed_batches}</td>
                                        <td>{log.inserted_count}</td>
                                        <td>{log.remaining_count ?? "-"}</td>
                                        <td>{formatDateTime(log.aws_latest_checktime_before_run)}</td>
                                        <td>{formatDateTime(log.last_synced_checktime_after_run)}</td>
                                        <td>{log.error_message || log.skip_reason || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default AttendanceSyncApp;
