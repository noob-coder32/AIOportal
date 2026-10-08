// frontend/src/modules/qaRequest/QARequestHome.jsx
import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./qaRequest.css";

function QARequestHome() {
    const [formData, setFormData] = useState({
        coil_no: "",
        thickness: "",
        qty: "",
        length: ""
    });

    const [search, setSearch] = useState("");

    const [requests, setRequests] = useState([]);

    const fetchRequests = async () => {
        try {
            const res = await api.get("/qa/requests");
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await api.post("/qa/requests", formData);

            showToast("Request submitted successfully", "success");

            setFormData({
                coil_no: "",
                thickness: "",
                qty: "",
                length: ""
            });

            fetchRequests();


        } catch (err) {
            showToast(
                err.response?.data?.message || "Submission failed",
                "error"
            );
        }
    };

    const filteredRequests = requests.filter(req =>
        req.coil_no
            ?.toLowerCase()
            .startsWith(search.toLowerCase())
    );

    return (
        <div className="qr-root">
            <div className="qr-container">

                <div className="qr-header">
                    <h1>Coil Request</h1>
                    <p>Create and monitor requests</p>
                </div>

                {/* FORM */}
                <form className="qr-form" onSubmit={handleSubmit}>
                    <div className="form-grid">

                        <div className="form-group">
                            <label>Coil Number</label>
                            <input
                                type="text"
                                name="coil_no"
                                value={formData.coil_no}
                                onChange={handleChange}
                                maxLength={30}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Thickness (0.001 - 0.999)</label>
                            <input
                                type="number"
                                name="thickness"
                                value={formData.thickness}
                                onChange={handleChange}
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Quantity (MT)</label>
                            <input
                                type="number"
                                name="qty"
                                value={formData.qty}
                                onChange={handleChange}
                                step="0.001"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Length</label>
                            <input
                                type="number"
                                name="length"
                                placeholder="Length(Optional)"
                                value={formData.length}
                                onChange={handleChange}
                                step="0.01"
                            />
                        </div>

                    </div>

                    <div className="form-actions">
                        <button type="submit" className="primary-btn">
                            Submit Request
                        </button>
                    </div>
                </form>

                <div className="search-section">
                    <input
                        type="text"
                        placeholder="Search by coil no..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button onClick={() => setSearch("")}>
                        Clear
                    </button>
                </div>

                {/* TABLE */}
                <div className="table-wrapper">
                    <table className="qr-table">
                        <thead>
                            <tr>
                                <th>Coil No</th>
                                <th>Thickness</th>
                                <th>Qty (MT)</th>
                                <th>Length</th>
                                <th>Requested By</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-data">
                                        No requests found
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.coil_no}</td>
                                        <td>{r.thickness}</td>
                                        <td>{r.qty}</td>
                                        <td>{r.length}</td>
                                        <td>{r.requested_by}</td>
                                        <td>
                                            {new Date(r.requested_at)
                                                .toLocaleString("en-GB", {
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
        </div>
    );
}

export default QARequestHome;