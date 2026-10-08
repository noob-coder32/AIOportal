import { useEffect, useState } from "react";
import axios from "../../api";
import "./thickness2.css";

function Thickness2App() {
    const [entries, setEntries] = useState([]);

    const [formData, setFormData] = useState({
        thickness: "",
        width: "",
        min_range: "",
        max_range: "",
    });

    const [editId, setEditId] = useState(null);

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    // ================= FETCH =================

    const fetchEntries = async () => {
        try {
            const res = await axios.get("/thickness2");
            setEntries(res.data);
        } catch (err) {
            console.error("Failed to fetch entries", err);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    // ================= AUTO CLEAR MESSAGE =================

    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            setMessage("");
            setMessageType("");
        }, 3000);

        return () => clearTimeout(timer);
    }, [message]);

    // ================= INPUT CHANGE =================

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // ================= RESET =================

    const resetForm = () => {
        setFormData({
            thickness: "",
            width: "",
            min_range: "",
            max_range: "",
        });

        setEditId(null);
    };

    // ================= SAVE =================

    const handleSave = async () => {
        const {
            thickness,
            width,
            min_range,
            max_range,
        } = formData;

        if (
            !thickness ||
            !width ||
            !min_range ||
            !max_range
        ) {
            setMessage("All fields are required");
            setMessageType("error");
            return;
        }

        try {
            if (editId) {
                await axios.put(
                    `/thickness2/${editId}`,
                    formData
                );

                setMessage("Entry updated successfully");
            } else {
                await axios.post(
                    "/thickness2",
                    formData
                );

                setMessage("Entry added successfully");
            }

            setMessageType("success");

            resetForm();
            fetchEntries();
        } catch (err) {
            console.error(err);

            setMessage(
                err.response?.data?.message ||
                "Operation failed"
            );

            setMessageType("error");
        }
    };

    // ================= EDIT =================

    const handleEdit = (row) => {
        setEditId(row.id);

        setFormData({
            thickness: row.thickness,
            width: row.width,
            min_range: row.min_range,
            max_range: row.max_range,
        });
    };

    return (
        <div className="thickness-page">

            <h1 className="thickness-title">
                Thickness Master
            </h1>

            {/* MESSAGE */}
            {message && (
                <div
                    className={`thickness-message ${messageType}`}
                >
                    {message}
                </div>
            )}

            {/* FORM */}
            <div className="thickness-card">

                <h2 className="section-title">
                    {editId
                        ? "Edit Entry"
                        : "Add Entry"}
                </h2>

                <div className="thickness-form-grid">

                    <div className="thickness-form-group">
                        <label>Thickness</label>

                        <input
                            type="number"
                            step="0.01"
                            name="thickness"
                            value={formData.thickness}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="thickness-form-group">
                        <label>Width</label>

                        <input
                            type="number"
                            step="0.01"
                            name="width"
                            value={formData.width}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="thickness-form-group">
                        <label>Min Range</label>

                        <input
                            type="number"
                            step="0.01"
                            name="min_range"
                            value={formData.min_range}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="thickness-form-group">
                        <label>Max Range</label>

                        <input
                            type="number"
                            step="0.01"
                            name="max_range"
                            value={formData.max_range}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="thickness-actions">

                    <button
                        className="thickness-btn-primary"
                        onClick={handleSave}
                    >
                        {editId
                            ? "Update Entry"
                            : "Add Entry"}
                    </button>

                    {editId && (
                        <button
                            className="thickness-btn-secondary"
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="thickness-card">

                <h2 className="section-title">
                    Saved Entries
                </h2>

                <div className="thickness-table-wrapper">

                    <table className="thickness-table">

                        <thead>
                            <tr>
                                <th>Thickness</th>
                                <th>Width</th>
                                <th>Min Range</th>
                                <th>Max Range</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {entries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="no-data"
                                    >
                                        No data found
                                    </td>
                                </tr>
                            ) : (
                                entries.map((row) => (
                                    <tr key={row.id}>

                                        <td>{row.thickness}</td>

                                        <td>{row.width}</td>

                                        <td>{row.min_range}</td>

                                        <td>{row.max_range}</td>

                                        <td>
                                            <button
                                                className="thickness-btn-edit"
                                                onClick={() =>
                                                    handleEdit(row)
                                                }
                                            >
                                                Edit
                                            </button>
                                        </td>

                                    </tr>
                                ))
                            )}

                        </tbody>

                    </table>

                </div>
            </div>

        </div>
    );
}

export default Thickness2App;