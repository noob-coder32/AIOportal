import { useEffect, useState } from "react";
import api from "../../api";
import "./invoice.css";
import { showToast } from "../../utils/toast";

function InvoiceApp() {
    const [formData, setFormData] = useState({
        invoice_no: "",
        invoice_date: "",
        division_id: "",
        party_code: "",
        bill_amount: "",
        invoice_type: ""
    });

    const [invoices, setInvoices] = useState([]);

    const [search, setSearch] = useState("");

    // ================= FETCH =================
    const fetchInvoices = async () => {
        try {
            const res = await api.get("/invoice");
            setInvoices(res.data);
        } catch (err) {
            showToast("Failed to fetch invoices", "error");
            console.error("Failed to fetch invoices", err);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // ================= SUBMIT =================
    const handleSubmit = async () => {
        try {
            const res = await api.post("/invoice", {
                ...formData,
                bill_amount: parseFloat(formData.bill_amount),
                division_id: Number(formData.division_id)
            });

            // reset form
            setFormData({
                invoice_no: "",
                invoice_date: "",
                division_id: "",
                party_code: "",
                bill_amount: "",
                invoice_type: ""
            });

            fetchInvoices();

            showToast(res.data.message, "success"); // ✅ fixed

        } catch (err) {
            showToast(
                err.response?.data?.message, "error"
            );
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        String(inv.invoice_no)
            .toLowerCase()
            // .includes(search.toLowerCase())
            .startsWith(search.toLowerCase())
    );

    return (
        <div className="invoice-page">
            <h2>Invoice Request</h2>

            {/* ================= FORM ================= */}
            <div className="form-section">
                <div>
                    <label>Invoice Number</label>
                    <input
                        placeholder="Enter Invoice No"
                        value={formData.invoice_no}
                        onChange={(e) =>
                            setFormData({ ...formData, invoice_no: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Invoice Date</label>
                    <input
                        type="date"
                        value={formData.invoice_date}
                        onChange={(e) =>
                            setFormData({ ...formData, invoice_date: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Division Id</label>
                    <input
                        placeholder="Enter Division ID"
                        value={formData.division_id}
                        onChange={(e) =>
                            setFormData({ ...formData, division_id: e.target.value })
                        }
                    />
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
                    <label>Bill Amount</label>
                    <input
                        type="number"
                        placeholder="Enter Bill Amount"
                        value={formData.bill_amount}
                        onChange={(e) =>
                            setFormData({ ...formData, bill_amount: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label>Invoice Type</label>
                    <select
                        value={formData.invoice_type}
                        onChange={(e) =>
                            setFormData({ ...formData, invoice_type: e.target.value })
                        }
                    >
                        <option value="">Select Type</option>   {/* ✅ placeholder */}
                        <option value="Store">Store</option>
                        <option value="Depot">Depot</option>
                        <option value="Sales">Sales</option>
                    </select>
                </div>

                <button onClick={handleSubmit}>
                    Submit Request
                </button>
            </div>

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search by invoice no..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <button onClick={() => setSearch("")}>
                    Clear
                </button>
            </div>

            {/* ================= TABLE ================= */}
            <table>
                <thead>
                    <tr>
                        <th>Invoice_No</th>
                        <th>Invoice_date</th>
                        <th>Division_id</th>
                        <th>Party_code</th>
                        <th>Bill_amount</th>
                        <th>Type</th>
                        <th>Requested_By</th>
                        <th>Req_Date&Time</th>
                    </tr>
                </thead>

                <tbody>
                    {filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                            <td>{inv.invoice_no}</td>
                            <td>{new Date(inv.invoice_date).toLocaleDateString("en-GB")}</td>
                            <td>{inv.division_id}</td>
                            <td>{inv.party_code}</td>
                            <td>{inv.bill_amount}</td>
                            <td>{inv.invoice_type}</td>
                            <td>{inv.requested_by}</td>
                            <td>
                                {new Date(inv.created_at).toLocaleString("en-GB", {
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
        </div>
    );
}

export default InvoiceApp;