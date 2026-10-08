import { useState, useEffect } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";

function DestinationHome() {

    const [search, setSearch] = useState("");
    const [results, setResults] = useState([]);
    const [editValues, setEditValues] = useState({});
    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);
    const [showCompletedFirst, setShowCompletedFirst] = useState(false);

    useEffect(() => {

        const delayDebounce = setTimeout(() => {

            fetchDestinations();

        }, 500);

        return () => clearTimeout(delayDebounce);

    }, [search]);

    const toggleCompletedSort = () => {

        if (!showCompletedFirst) {

            const sorted = [...results].sort((a, b) => {

                const aCompleted = a.distname && a.pincode;
                const bCompleted = b.distname && b.pincode;

                if (aCompleted === bCompleted) return 0;

                return aCompleted ? -1 : 1;
            });

            setResults(sorted);
            setShowCompletedFirst(true);

        } else {

            fetchDestinations(); // reset by reloading
            setShowCompletedFirst(false);
        }
    };

    const fetchDestinations = async () => {
        try {
            const res = await api.get(
                `/destination/search?search=${encodeURIComponent(search)}`
            );

            setResults(res.data);
        } catch (err) {
            console.error("Failed to fetch destinations", err);
        }
    };

    const fetchLogs = async () => {
        try {

            const res = await api.get("/destination/logs");

            setLogs(res.data);

        } catch (err) {
            console.error("Failed to fetch logs", err);
            showToast("Failed to load logs", "error");
        }
    };

    const handleInputChange = (id, field, value) => {
        setEditValues((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSave = async (id) => {

        const data = editValues[id];

        if (!data) {
            showToast("Please enter values before saving", "error");
            return;
        }

        // remove empty fields
        const payload = {};

        if (data.distname && data.distname.trim() !== "") {
            payload.distname = data.distname.trim();
        }

        if (data.pincode && data.pincode.trim() !== "") {
            payload.pincode = data.pincode.trim();
        }

        if (Object.keys(payload).length === 0) {
            showToast("Please enter district or pincode", "error");
            return;
        }

        try {

            const res = await api.put(`/destination/${id}`, payload);

            showToast(res.data.message || "Destination updated successfully", "success");

            fetchDestinations();

            setEditValues((prev) => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });

        } catch (err) {

            const message =
                err.response?.data?.message || "Update failed";

            showToast(message, "error");
        }
    };

    return (
        <div className="destination-page">

            <h2>Destination Update</h2>

            {/* Search Section */}
            <div className="search-section">

                <input
                    type="text"
                    placeholder="Search by destination name or code"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <button onClick={fetchDestinations}>
                    Search
                </button>

                <button
                    onClick={() => {
                        setSearch("");
                        fetchDestinations();
                    }}
                >
                    Clear
                </button>

                <button onClick={() => {
                    fetchLogs();
                    setShowLogs(true);
                }}>
                    View Logs
                </button>

                <button onClick={toggleCompletedSort}>
                    {showCompletedFirst ? "Reset Order" : "Completed First"}
                </button>

            </div>

            {/* Results Table */}

            <div className="table-wrapper">

                <table className="styled-table">

                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Destination</th>
                            <th>District</th>
                            <th>Pincode</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {results.length === 0 && (
                            <tr>
                                <td colSpan="5" className="no-data">
                                    No results found
                                </td>
                            </tr>
                        )}

                        {results.map((row) => {

                            const districtEmpty =
                                !row.distname || row.distname.trim() === "";

                            const pincodeEmpty =
                                !row.pincode || row.pincode.trim() === "";

                            return (
                                <tr key={row.destination_id}>

                                    <td>{row.destination_code}</td>
                                    <td>{row.destination_name}</td>

                                    {/* District */}
                                    <td>
                                        {districtEmpty ? (
                                            <input
                                                type="text"
                                                placeholder="Enter district"
                                                value={editValues[row.destination_id]?.distname || ""}
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        row.destination_id,
                                                        "distname",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        ) : (
                                            row.distname
                                        )}
                                    </td>

                                    {/* Pincode */}
                                    <td>
                                        {pincodeEmpty ? (
                                            <input
                                                type="text"
                                                placeholder="Enter pincode"
                                                value={editValues[row.destination_id]?.pincode || ""}
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        row.destination_id,
                                                        "pincode",
                                                        e.target.value
                                                    )
                                                }
                                            />

                                        ) : (
                                            row.pincode
                                        )}
                                    </td>

                                    {/* Action */}
                                    <td>
                                        {(districtEmpty || pincodeEmpty) ? (
                                            <button
                                                onClick={() => handleSave(row.destination_id)}
                                            >
                                                Save
                                            </button>

                                        ) : (
                                            <span className="completed-text">Completed</span>)}
                                    </td>

                                </tr>
                            );
                        })}

                    </tbody>

                </table>

            </div>

            {showLogs && (
                <div className="logs-modal">

                    <div className="logs-content">

                        <div className="logs-header">
                            <h3>Destination Update History</h3>

                            <button onClick={() => setShowLogs(false)}>
                                Close
                            </button>
                        </div>

                        <div className="logs-body">

                            <table className="styled-table">

                                <thead>
                                    <tr>
                                        <th>Destination Id</th>
                                        <th>Destination Code</th>
                                        <th>Field Updated</th>
                                        <th>Old Value</th>
                                        <th>New Value</th>
                                        <th>Updated By</th>
                                        <th>Updated On</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="no-data">
                                                No logs available
                                            </td>
                                        </tr>
                                    )}

                                    {logs.map((log, index) => (
                                        <tr key={index}>
                                            <td>{log.destination_id}</td>
                                            <td>{log.destination_code}</td>
                                            <td>{log.field_name}</td>
                                            <td>{log.old_value ?? "NULL"}</td>
                                            <td>{log.new_value}</td>
                                            <td>{log.username}</td>
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
                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default DestinationHome;