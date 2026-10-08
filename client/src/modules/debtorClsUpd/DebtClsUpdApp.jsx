import { useEffect, useState } from "react";
import api from "../../api";
import "./invoice.css"; // ✅ SAME CSS (DO NOT CHANGE)
import { showToast } from "../../utils/toast";

function DebtClsUpdApp() {
    const [formData, setFormData] = useState({
        div_id: "",
        app_date: "",
        src_dbtClassId: "",
        tgt_dbtClassId: "",

    });

    const [entries, setEntries] = useState([]);

    // ================= FETCH =================
    const fetchEntries = async () => {
        try {
            const res = await api.get("/debtClsUpd");
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
            const res = await api.post("/debtClsUpd", {
                ...formData,
                div_id: Number(formData.div_id),
                src_dbtClassId: Number(formData.src_dbtClassId),
                tgt_dbtClassId: Number(formData.tgt_dbtClassId)
            });

            // reset form
            setFormData({
                div_id: "",
                app_date: "",
                src_dbtClassId: "",
                tgt_dbtClassId: "",
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
            <h2>Rate Update</h2>

            {/* ================= FORM ================= */}
            <div className="form-section">

                <div>
                    <label>Divison Id</label>
                    <input
                        type="number"
                        placeholder="Enter Division ID"
                        value={formData.div_id}
                        onChange={(e) =>
                            setFormData({ ...formData, div_id: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Applicable Date</label>
                    <input
                        type="date"
                        value={formData.app_date}
                        onChange={(e) =>
                            setFormData({ ...formData, app_date: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Source Debtor Class_Id</label>
                    <input
                        type="number"
                        placeholder="Enter source debtor class_id"
                        value={formData.src_dbtClassId}
                        onChange={(e) =>
                            setFormData({ ...formData, src_dbtClassId: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Target Debtor Class_Id</label>
                    <input
                        type="number"
                        placeholder="Enter target debtor class_id"
                        value={formData.tgt_dbtClassId}
                        onChange={(e) =>
                            setFormData({ ...formData, tgt_dbtClassId: e.target.value })
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
                        <th>Division_Id</th>
                        <th>Applicable_Date</th>
                        <th>Source_Debtor_Class_ID</th>
                        <th>Target_Debtor_Class_ID</th>
                        <th>Requested_By</th>
                        <th>Req_Date&Time</th>
                    </tr>
                </thead>

                <tbody>
                    {entries.map((row) => (
                        <tr key={row.id}>
                            <td>{row.div_id}</td>
                            <td>{new Date(row.app_date).toLocaleDateString("en-GB")}</td>
                            <td>{row.src_dbtClassId}</td>
                            <td>{row.tgt_dbtClassId}</td>
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

export default DebtClsUpdApp;