import { useEffect, useState } from "react";
import api from "../../api";
import "./division.css";
import { showToast } from "../../utils/toast";

function DivisionRequestApp() {
    const [data, setData] = useState([]);

    const [form, setForm] = useState({
        division_id: "",
        month_id: "",
        year_id: "",
        month_name: "",
        employee_code: ""
    });

    // 🔹 Month map
    const monthMap = {
        1: "JAN",
        2: "FEB",
        3: "MAR",
        4: "APR",
        5: "MAY",
        6: "JUN",
        7: "JUL",
        8: "AUG",
        9: "SEP",
        10: "OCT",
        11: "NOV",
        12: "DEC"
    };

    // 🔹 Fetch data
    const fetchData = async () => {
        try {
            const res = await api.get("/division-request");
            setData(res.data);
        } catch (err) {
            console.error("Fetch failed", err);
            showToast("Error Fetching Data", "error")
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🔹 Handle input
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "month_id") {
            setForm({
                ...form,
                month_id: value,
                month_name: monthMap[value] || ""
            });
        } else {
            setForm({
                ...form,
                [name]: value
            });
        }
    };

    // 🔹 Submit
    const handleSubmit = async () => {
        const { division_id, month_id, year_id, month_name, employee_code } = form;

        if (!division_id || !month_id || !year_id || !month_name || !employee_code) {
            showToast("All fields are required", "error");
            return;
        }

        try {
            await api.post("/division-request", {
                ...form,
                division_id: Number(division_id),
                month_id: Number(month_id),
                year_id: Number(year_id)
            });

            // reset form
            setForm({
                division_id: "",
                month_id: "",
                year_id: "",
                month_name: "",
                employee_code: ""
            });

            showToast("Request Saved", "success");
            fetchData();

        } catch (err) {
            console.error("Save failed", err);

            showToast(
                err.response?.data?.message || "Sav failed",
                "error"
            );
        }
    };


    return (
        <div className="division-page">
            <h2>Payroll Update Request</h2>

            {/* FORM */}
            <div className="division-form">

                <input
                    name="division_id"
                    placeholder="Division ID"
                    value={form.division_id}
                    onChange={handleChange}
                />

                {/* Month Dropdown */}
                <select
                    name="month_id"
                    value={form.month_id}
                    onChange={handleChange}
                >
                    <option value="">Select Month</option>
                    {Object.entries(monthMap).map(([id, name]) => (
                        <option key={id} value={id}>
                            {id} - {name}
                        </option>
                    ))}
                </select>

                <input
                    name="year_id"
                    type="number"
                    placeholder="Year (YYYY)"
                    value={form.year_id}
                    onChange={handleChange}
                />

                {/* Auto-filled */}
                <input
                    name="month_name"
                    placeholder="Month Name"
                    value={form.month_name}
                    readOnly
                />

                <input
                    name="employee_code"
                    placeholder="Employee Code"
                    value={form.employee_code}
                    onChange={handleChange}
                />

                <button onClick={handleSubmit}>
                    Submit
                </button>
            </div>

            {/* TABLE */}
            <table className="division-table">
                <thead>
                    <tr>
                        <th>Division</th>
                        <th>Month</th>
                        <th>Year</th>
                        <th>Month name</th>
                        <th>Employee Code</th>
                        <th>Requested By</th>
                        <th>Requested Date & Time</th>
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan="8" style={{ textAlign: "center" }}>No data found</td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr key={row.id}>
                                <td>{row.division_id}</td>
                                <td>{row.month_id}</td>
                                <td>{row.year_id}</td>
                                <td>{row.month_name}</td>
                                <td>{row.employee_code}</td>
                                <td>{row.requested_by}</td>
                                <td>{new Date(row.created_at).toLocaleString("en-GB", {
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
    );
}

export default DivisionRequestApp;