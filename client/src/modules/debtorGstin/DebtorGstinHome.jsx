import React, { useState, useEffect } from "react";
import axios from "../../api";

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const DebtorGstinHome = ({ username }) => {
    const [formData, setFormData] = useState({
        debtor_code: "",
        debtor_name: "",
        gstin: "",
        state: ""
    });

    const [records, setRecords] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState([]);
    const [debounceTimer, setDebounceTimer] = useState(null);

    // Fetch all records on component mount
    useEffect(() => {
        fetchRecords();
    }, []);

    // Debounced search for debtor by code
    const handleDebtorCodeChange = (e) => {
        const code = e.target.value;
        setFormData({ ...formData, debtor_code: code, debtor_name: "" });

        // Clear previous timer
        if (debounceTimer) clearTimeout(debounceTimer);

        if (code.trim()) {
            const timer = setTimeout(() => {
                searchDebtor(code.trim());
            }, 500);
            setDebounceTimer(timer);
        }
    };

    // Search debtor by code
    const searchDebtor = async (code) => {
        try {
            const response = await axios.get(
                `/debtorGstin/search?code=${encodeURIComponent(code)}`
            );
            if (response.data.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    debtor_name: response.data[0].debtor_name,
                }));
                setError("");
            } else {
                setFormData(prev => ({ ...prev, debtor_name: "" }));
                setError("Debtor code not found");
            }
        } catch (err) {
            console.error("Error searching debtor:", err);
            setError("Error searching debtor");
        }
    };

    // Fetch all records
    const fetchRecords = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get("/debtorGstin/");
            setRecords(response.data);
            setError("");
        } catch (err) {
            console.error("Error fetching records:", err);
            setError("Error fetching records");
        } finally {
            setIsLoading(false);
        }
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.debtor_code || !formData.debtor_name || !formData.gstin || !formData.state) {
            setError("All fields are required");
            return;
        }

        try {
            setIsLoading(true);
            await axios.post("/debtorGstin/", formData);
            setSuccess("Request submitted successfully!");
            setFormData({ debtor_code: "", debtor_name: "", gstin: "", state: "" });
            fetchRecords();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error submitting form:", err);
            setError(err.response?.data?.message || "Error submitting form");
        } finally {
            setIsLoading(false);
        }
    };

    // Edit record
    const handleEdit = (record) => {
        setEditingId(record.id);
        setEditData({ gstin: record.gstin, state: record.state });
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    // Save edit
    const handleSaveEdit = async (id) => {
        try {
            setIsLoading(true);
            await axios.put(`/debtorGstin/${id}`, editData);
            setSuccess("Record updated successfully!");
            setEditingId(null);
            setEditData({});
            fetchRecords();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error updating record:", err);
            setError(err.response?.data?.message || "Error updating record");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch logs
    const handleShowLogs = async () => {
        try {
            const response = await axios.get("/debtorGstin/logs");
            setLogs(response.data);
            setShowLogs(true);
        } catch (err) {
            console.error("Error fetching logs:", err);
            setError("Error fetching logs");
        }
    };

    return (
        <div className="debtor-gstin-container">
            {/* Error/Success Messages */}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Form */}
            <div className="form-section">
                <h3>Submit GSTIN Request</h3>
                <form onSubmit={handleSubmit} autoComplete="off">
                    {/* Debtor Code */}
                    <div className="form-group">
                        <label htmlFor="debtor_code">Debtor Code *</label>
                        <input
                            type="text"
                            id="debtor_code"
                            name="debtor_code_manual"
                            value={formData.debtor_code}
                            onChange={handleDebtorCodeChange}
                            placeholder="Enter debtor code..."
                            disabled={isLoading}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                    </div>

                    {/* Debtor Name (Auto-filled) */}
                    <div className="form-group">
                        <label htmlFor="debtor_name">Debtor Name (Auto-filled) *</label>
                        <input
                            type="text"
                            id="debtor_name"
                            value={formData.debtor_name}
                            placeholder="Auto-filled when code matches"
                            readOnly
                        />
                    </div>

                    {/* GSTIN */}
                    <div className="form-group">
                        <label htmlFor="gstin">GSTIN *</label>
                        <input
                            type="text"
                            id="gstin"
                            value={formData.gstin}
                            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                            placeholder="Enter GSTIN..."
                            disabled={isLoading}
                        />
                    </div>

                    {/* State */}
                    <div className="form-group">
                        <label htmlFor="state">State *</label>
                        <select
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            disabled={isLoading}
                        >
                            <option value="">Select State...</option>
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !formData.debtor_name}
                    >
                        {isLoading ? "Submitting..." : "Submit"}
                    </button>
                </form>
            </div>

            {/* Records List */}
            <div className="records-section">
                <div className="section-header">
                    <h3>Submitted Requests</h3>
                    <button
                        className="btn btn-secondary"
                        onClick={handleShowLogs}
                        disabled={isLoading}
                    >
                        View Logs
                    </button>
                </div>

                {isLoading && !records.length ? (
                    <p className="loading">Loading records...</p>
                ) : records.length === 0 ? (
                    <p className="no-data">No records found</p>
                ) : (
                    <div className="records-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Debtor Code</th>
                                    <th>Debtor Name</th>
                                    <th>GSTIN</th>
                                    <th>State</th>
                                    <th>Created By</th>
                                    <th>Created On</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(record => (
                                    <tr key={record.id}>
                                        <td>{record.debtor_code}</td>
                                        <td>{record.debtor_name}</td>
                                        <td>
                                            {editingId === record.id ? (
                                                <input
                                                    type="text"
                                                    value={editData.gstin}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            gstin: e.target.value
                                                        })
                                                    }
                                                />
                                            ) : (
                                                record.gstin
                                            )}
                                        </td>
                                        <td>
                                            {editingId === record.id ? (
                                                <select
                                                    value={editData.state}
                                                    onChange={(e) =>
                                                        setEditData({
                                                            ...editData,
                                                            state: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="">Select State...</option>
                                                    {INDIAN_STATES.map(state => (
                                                        <option key={state} value={state}>{state}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                record.state
                                            )}
                                        </td>
                                        <td>{record.created_by_username || "-"}</td>
                                        <td>{new Date(record.created_on).toLocaleDateString("en-GB")}</td>
                                        <td className="action-buttons">
                                            {editingId === record.id ? (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleSaveEdit(record.id)}
                                                        disabled={isLoading}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={handleCancelEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    className="btn btn-sm btn-edit"
                                                    onClick={() => handleEdit(record)}
                                                    disabled={isLoading}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Logs Modal */}
            {showLogs && (
                <div className="modal-overlay" onClick={() => setShowLogs(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Audit Logs</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowLogs(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {logs.length === 0 ? (
                                <p className="no-data">No logs found</p>
                            ) : (
                                <table className="logs-table">
                                    <thead>
                                        <tr>
                                            <th>Debtor Code</th>
                                            <th>Field</th>
                                            <th>Old Value</th>
                                            <th>New Value</th>
                                            <th>Updated By</th>
                                            <th>Updated On</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, idx) => (
                                            <tr key={idx}>
                                                <td>{log.debtor_code}</td>
                                                <td>{log.field_name}</td>
                                                <td>{log.old_value || "-"}</td>
                                                <td>{log.new_value}</td>
                                                <td>{log.updated_by}</td>
                                                <td>{new Date(log.updated_on).toLocaleString("en-GB")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtorGstinHome;
