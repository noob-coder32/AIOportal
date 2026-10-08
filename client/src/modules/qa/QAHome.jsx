import { useEffect, useState } from "react";
import api from "../../api";
import "./qa.css";

function QAHome() {
    const [coils, setCoils] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [search, setSearch] = useState("");
    const [logSearch, setLogSearch] = useState("");
    // const [message, setMessage] = useState("");
    const [toast, setToast] = useState({
        message: "",
        type: "", // "success" | "error"
    });
    const [showLogs, setShowLogs] = useState(false);

    const fetchCoils = async (searchValue = search) => {
        const res = await api.get(
            `/qa/coils?search=${encodeURIComponent(searchValue)}`
        );
        setCoils(res.data);
    };

    const fetchAuditLogs = async (searchValue = "") => {
        const res = await api.get(
            `/qa/audit-logs?search=${encodeURIComponent(searchValue)}`
        );
        setAuditLogs(res.data);
    };

    useEffect(() => {
        fetchCoils();
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchCoils(search);
        }, 400); // 400ms debounce

        return () => clearTimeout(delay);
    }, [search]);

    useEffect(() => {
        if (!toast.message) return;

        const timer = setTimeout(() => {
            setToast({ message: "", type: "" });
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast]);

    const deleteCoil = async (id) => {
        if (!window.confirm("Delete this coil?")) return;

        try {
            await api.delete(`/qa/coils/${id}`);

            setToast({
                message: "Coil deleted successfully",
                type: "success",
            });

            fetchCoils();
        } catch (err) {
            setToast({
                message: err.response?.data?.message || "Delete failed",
                type: "error",
            });
        }
    };

    const toggleLogs = async () => {
        if (!showLogs) {
            setLogSearch("");
            await fetchAuditLogs("");
        }
        setShowLogs(!showLogs);
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        const hours = String(date.getHours()).padStart(2, "0");   // 24-hour format
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="qa-root">
            <div className="qa-surface">
                <h1 className="qa-title">QA Remove</h1>

                <div className="qa-top-actions">
                    <button className="btn-view-logs" onClick={toggleLogs}>
                        {showLogs ? "Back to Coils" : "View Logs"}
                    </button>
                </div>

                {!showLogs && (
                    <>
                        <div className="search-section">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by Coil Number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            // onKeyDown={(e) =>
                            //     e.key === "Enter" && fetchCoils()
                            // }
                            />

                            {/* <button
                                className="btn-primary"
                                onClick={() => fetchCoils()}
                            >
                                Search
                            </button> */}

                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    setSearch("");
                                    fetchCoils("");
                                }}
                            >
                                Clear
                            </button>
                        </div>


                        <div className="table-wrapper">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Coil No</th>
                                        <th>QA</th>
                                        <th>Dispatch</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coils.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="no-data">
                                                No data found
                                            </td>
                                        </tr>
                                    ) : (
                                        coils.map((coil) => {
                                            const canDelete =
                                                coil.despach_ok === 0;
                                            return (
                                                <tr key={coil.id}>
                                                    <td>{coil.coil_no}</td>
                                                    <td>
                                                        {coil.qa_ok
                                                            ? "YES"
                                                            : "NO"}
                                                    </td>
                                                    <td>
                                                        {coil.despach_ok
                                                            ? "YES"
                                                            : "NO"}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className={`btn-delete ${!canDelete
                                                                ? "disabled"
                                                                : ""
                                                                }`}
                                                            disabled={!canDelete}
                                                            onClick={() =>
                                                                deleteCoil(
                                                                    coil.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                        {!canDelete && (
                                                            <div className="disabled-text">
                                                                Already
                                                                dispatched
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {showLogs && (
                    <>
                        <div className="search-section">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by Coil Number..."
                                value={logSearch}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setLogSearch(value);
                                    fetchAuditLogs(value);
                                }}
                            />
                        </div>

                        <div className="table-wrapper">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Coil No</th>
                                        <th>Action</th>
                                        <th>Deleted By</th>
                                        <th>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="no-data">
                                                No logs found
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{log.coil_no}</td>
                                                <td>{log.action}</td>
                                                <td>
                                                    {log.performed_by}
                                                </td>
                                                <td>
                                                    {formatDateTime(log.performed_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>
            {toast.message && (
                <div className={`qa-toast ${toast.type}`}>
                    {toast.type === "success" ? "✅ " : "❌ "}
                    {toast.message}
                </div>
            )}
        </div>
    );
}

export default QAHome;
