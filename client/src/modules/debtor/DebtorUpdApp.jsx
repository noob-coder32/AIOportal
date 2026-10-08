import { useEffect, useState } from "react";
import api from "../../api";
import "./invoice.css"; // ✅ SAME CSS (DO NOT CHANGE)
import { showToast } from "../../utils/toast";

function DebtorUpdApp() {
    const [formData, setFormData] = useState({
        division_id: "",
        target_div_id: "",
        acc_type: "",
        party_code: "",
        party_name: "",
        gl_code: "",
        gl_name: ""
    });

    const [entries, setEntries] = useState([]);

    // ================= FETCH =================
    const fetchEntries = async () => {
        try {
            const res = await api.get("/debtorUpd");
            setEntries(res.data);
        } catch (err) {
            showToast("Failed to fetch entries", "error");
            console.error("Failed to fetch entries", err);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    // ================= SUBMIT =================
    const handleSubmit = async () => {
        try {
            const res = await api.post("/debtorUpd", {
                ...formData,
                division_id: Number(formData.division_id),
                target_div_id: Number(formData.target_div_id)
            });

            // reset form
            setFormData({
                division_id: "",
                target_div_id: "",
                acc_type: "",
                party_code: "",
                party_name: "",
                gl_code: "",
                gl_name: ""
            });

            fetchEntries();

            showToast(res.data.message, "success");

        } catch (err) {
            showToast(
                err.response?.data?.message || "Submission failed",
                "error"
            );
        }
    };

    return (
        <>
            <h2>Debtor/Creditor Update Request</h2>

            {/* ================= FORM ================= */}
            <div className="form-section">

                <div>
                    <label>Company Id</label>
                    <input
                        placeholder="Enter Division ID"
                        value={formData.division_id}
                        onChange={(e) =>
                            setFormData({ ...formData, division_id: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Target Company Id</label>
                    <input
                        placeholder="Enter Target Division ID"
                        value={formData.target_div_id}
                        onChange={(e) =>
                            setFormData({ ...formData, target_div_id: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Account Type</label>
                    <select
                        value={formData.acc_type}
                        onChange={(e) =>
                            setFormData({ ...formData, acc_type: e.target.value })
                        }
                    >
                        <option value="">Select Type</option>   {/* ✅ placeholder */}
                        <option value="Creditor">Creditor</option>
                        <option value="Debitor">Debitor</option>
                    </select>
                </div>  

                <div>
                    <label>Party Code</label>
                    <input
                        placeholder="Enter Party Code"
                        value={formData.party_code}
                        onChange={(e) =>
                            setFormData({ ...formData, party_code: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Party Name</label>
                    <input
                        placeholder="Enter Party Name"
                        value={formData.party_name}
                        onChange={(e) =>
                            setFormData({ ...formData, party_name: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>GL Code</label>
                    <input
                        placeholder="Enter GL Code"
                        value={formData.gl_code}
                        onChange={(e) =>
                            setFormData({ ...formData, gl_code: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>GL Name</label>
                    <input
                        placeholder="Enter GL Name"
                        value={formData.gl_name}
                        onChange={(e) =>
                            setFormData({ ...formData, gl_name: e.target.value })
                        }
                    />
                </div>

                <button onClick={handleSubmit}>
                    Submit Request
                </button>
            </div>

            {/* ================= TABLE ================= */}
            <table>
                <thead>
                    <tr>
                        <th>Company Id</th>
                        <th>Target Company Id</th>
                        <th>Account Type</th>
                        <th>Party Code</th>
                        <th>Party Name</th>
                        <th>GL Code</th>
                        <th>GL Name</th>
                        <th>Requested By</th>
                        <th>Date & Time</th>
                    </tr>
                </thead>

                <tbody>
                    {entries.map((row) => (
                        <tr key={row.id}>
                            <td>{row.division_id}</td>
                            <td>{row.target_div_id}</td>
                            <td>{row.acc_type}</td>
                            <td>{row.party_code}</td>
                            <td>{row.party_name}</td>
                            <td>{row.gl_code}</td>
                            <td>{row.gl_name}</td>
                            <td>{row.requested_by}</td>
                            <td>
                                {new Date(row.created_at).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

export default DebtorUpdApp;