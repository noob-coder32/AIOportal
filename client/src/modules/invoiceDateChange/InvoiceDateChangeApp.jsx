import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./invoiceDateChange.css";

function InvoiceDateChangeApp() {
    const [form, setForm] = useState({
        invoice_no: "",
        invoice_date: "",
        to_be_invoice_date: "",
        division_id: "",
        party_code: "",
        invoice_type: ""
    });

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRequests = async () => {
        try {
            const res = await api.get("/invoice-date-change");
            setRequests(res.data);
        } catch (err) {
            showToast("Failed to fetch requests", "error");
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleSubmit = async () => {
        try {
            setLoading(true);

            await api.post("/invoice-date-change", {
                ...form,
                division_id: Number(form.division_id)
            });

            showToast("Request submitted successfully", "success");

            setForm({
                invoice_no: "",
                invoice_date: "",
                to_be_invoice_date: "",
                division_id: "",
                party_code: "",
                invoice_type: ""
            });

            fetchRequests();
        } catch (err) {
            showToast(
                err.response?.data?.message || "Failed to submit request",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="idc-module-scope">

            <h2>Invoice Date Change Request</h2>

            {/* ===== FORM ===== */}

            <div className="form-grid">

                <div className="form-group">
                    <label>Invoice No</label>
                    <input
                        value={form.invoice_no}
                        onChange={(e) =>
                            setForm({ ...form, invoice_no: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Invoice Date</label>
                    <input
                        type="date"
                        value={form.invoice_date}
                        onChange={(e) =>
                            setForm({ ...form, invoice_date: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>To Be Invoice Date</label>
                    <input
                        type="date"
                        value={form.to_be_invoice_date}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                to_be_invoice_date: e.target.value
                            })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Division ID</label>
                    <input
                        type="number"
                        value={form.division_id}
                        onChange={(e) =>
                            setForm({ ...form, division_id: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Party Code</label>
                    <input
                        value={form.party_code}
                        onChange={(e) =>
                            setForm({ ...form, party_code: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Invoice Type</label>
                    <select
                        value={form.invoice_type}
                        onChange={(e) =>
                            setForm({ ...form, invoice_type: e.target.value })
                        }
                    >
                        <option value="">Select Type</option>
                        <option value="Store">Store</option>
                        <option value="Depot">Depot</option>
                        <option value="Sales">Sales</option>
                    </select>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary"
                >
                    {loading ? "Submitting..." : "Submit Request"}
                </button>

            </div>




            {/* ===== TABLE ===== */}
            <div className="card">

                <h3>Requests</h3>

                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>Invoice No</th>
                            <th>Invoice Date</th>
                            <th>To Be Date</th>
                            <th>Division</th>
                            <th>Party Code</th>
                            <th>Type</th>
                            <th>Requested By</th>
                            <th>Created At</th>
                        </tr>
                    </thead>

                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            requests.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.invoice_no}</td>
                                    <td>{new Date(r.invoice_date).toLocaleDateString("en-GB")}</td>
                                    <td>{new Date(r.to_be_invoice_date).toLocaleDateString("en-GB")}</td>
                                    <td>{r.division_id}</td>
                                    <td>{r.party_code}</td>
                                    <td>{r.invoice_type}</td>
                                    <td>{r.requested_by}</td>
                                    <td>
                                        {new Date(r.created_at).toLocaleString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
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

        </div>
    );
}

export default InvoiceDateChangeApp;