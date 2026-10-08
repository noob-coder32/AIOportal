import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";

const EMPTY_FORM = {
    bill_submission_reference_no: "",
    division: "",
    bill_submission_date: "",
    supplier_code: "",
    total_bill_amount: ""
};

const DIVISIONS = ["ASB", "CGL", "PDP", "NER", "ARL HO", "NER HO", "PDF HO", "ATPL", "LLP"];

function formatDate(value) {
    if (!value) return "";
    return String(value).split("T")[0];
}

function BillSubmissionApp() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRequests = async () => {
        try {
            const res = await api.get("/bill-submission");
            setRequests(res.data);
        } catch {
            showToast("Failed to fetch bill submissions", "error");
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleChange = (field, value) => {
        setForm({
            ...form,
            [field]: value
        });
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            await api.post("/bill-submission", {
                ...form,
                total_bill_amount: Number(form.total_bill_amount)
            });

            showToast("Bill submission saved successfully", "success");
            setForm(EMPTY_FORM);
            fetchRequests();
        } catch (err) {
            showToast(
                err.response?.data?.message || "Failed to save bill submission",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bill-submission-module">
            <h2>Bill Submission</h2>

            <div className="bill-form-grid">
                <div className="bill-form-group">
                    <label>Bill Submission Reference No</label>
                    <input
                        value={form.bill_submission_reference_no}
                        onChange={(e) =>
                            handleChange("bill_submission_reference_no", e.target.value)
                        }
                    />
                </div>

                <div className="bill-form-group">
                    <label>Division</label>
                    <select
                        value={form.division}
                        onChange={(e) => handleChange("division", e.target.value)}
                    >
                        <option value="">Select Division</option>
                        {DIVISIONS.map((division) => (
                            <option key={division} value={division}>
                                {division}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bill-form-group">
                    <label>Bill Submission Date</label>
                    <input
                        type="date"
                        value={form.bill_submission_date}
                        onChange={(e) =>
                            handleChange("bill_submission_date", e.target.value)
                        }
                    />
                </div>

                <div className="bill-form-group">
                    <label>Supplier Code</label>
                    <input
                        value={form.supplier_code}
                        onChange={(e) => handleChange("supplier_code", e.target.value)}
                    />
                </div>

                <div className="bill-form-group">
                    <label>Total Bill Amount</label>
                    <input
                        type="number"
                        value={form.total_bill_amount}
                        onChange={(e) =>
                            handleChange("total_bill_amount", e.target.value)
                        }
                    />
                </div>

                <button
                    className="bill-primary-btn"
                    disabled={loading}
                    onClick={handleSubmit}
                >
                    {loading ? "Saving..." : "Submit"}
                </button>
            </div>

            <div className="bill-table-wrapper">
                <table className="bill-table">
                    <thead>
                        <tr>
                            <th>Reference No</th>
                            <th>Division</th>
                            <th>Submission Date</th>
                            <th>Supplier Code</th>
                            <th>Total Bill Amount</th>
                        </tr>
                    </thead>

                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="bill-no-data">
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            requests.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.bill_submission_reference_no}</td>
                                    <td>{row.division}</td>
                                    <td>{formatDate(row.bill_submission_date)}</td>
                                    <td>{row.supplier_code}</td>
                                    <td>{row.total_bill_amount}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default BillSubmissionApp;
