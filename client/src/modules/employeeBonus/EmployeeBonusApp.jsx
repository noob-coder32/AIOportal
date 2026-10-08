import { useEffect, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./employeeBonus.css";

const EMPTY_FORM = {
    employee_code: "",
    name: "",
    bonus: "",
    division: "",
    category: "",
    sub_category: "",
    effective_date: ""
};

const DIVISIONS = [
    "ASB",
    "CGL",
    "PDP",
    "NER",
    "ARL HO",
    "NER HO",
    "PDF HO",
    "ATPL",
    "LLP",
];

const CATEGORIES = [
    "Staff",
    "Worker",
    "Executive & Manager"
];

const SUB_CATEGORIES = [
    "Permanent",
    "Contractual",
    "Trainee",
    "Canteen",
    "Casual",
    "HO"
];

function EmployeeBonusApp() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [bonuses, setBonuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchBonuses = async () => {
        try {
            setLoading(true);
            const res = await api.get("/employee-bonus");
            setBonuses(res.data);
        } catch {
            showToast("Failed to fetch bonuses", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBonuses();
    }, []);

    const handleChange = (field, value) => {
        setForm({
            ...form,
            [field]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            form.employee_code.trim() === "" ||
            form.name.trim() === "" ||
            form.bonus === "" ||
            form.division === "" ||
            form.category === "" ||
            form.sub_category === "" ||
            form.effective_date === ""
        ) {
            showToast("All fields are required", "error");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/employee-bonus", form);
            showToast("Bonus submitted successfully", "success");
            setForm(EMPTY_FORM);
            fetchBonuses();
        } catch (err) {
            const message = err?.response?.data?.message || "Failed to submit bonus";
            showToast(message, "error");
            console.error("Employee bonus save error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="employee-bonus-app">
            <h2>Employee Bonus Management</h2>

            <form onSubmit={handleSubmit} className="bonus-form">
                <div className="form-group">
                    <label>Employee Code</label>
                    <input
                        type="text"
                        value={form.employee_code}
                        onChange={(e) => handleChange("employee_code", e.target.value)}
                        placeholder="Enter employee code"
                    />
                </div>

                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter employee name"
                    />
                </div>

                <div className="form-group">
                    <label>Bonus Amount</label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.bonus}
                        onChange={(e) => handleChange("bonus", e.target.value)}
                        placeholder="Enter bonus amount"
                    />
                </div>

                <div className="form-group">
                    <label>Division</label>
                    <select
                        value={form.division}
                        onChange={(e) => handleChange("division", e.target.value)}
                    >
                        <option value="">Select Division</option>
                        {DIVISIONS.map((div) => (
                            <option key={div} value={div}>
                                {div}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Category</label>
                    <select
                        value={form.category}
                        onChange={(e) => handleChange("category", e.target.value)}
                    >
                        <option value="">Select Category</option>
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Sub Category</label>

                    <select
                        value={form.sub_category}
                        onChange={(e) =>
                            handleChange("sub_category", e.target.value)
                        }
                    >
                        <option value="">Select Sub Category</option>

                        {SUB_CATEGORIES.map((sub) => (
                            <option key={sub} value={sub}>
                                {sub}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Effective Date</label>

                    <input
                        type="month"
                        value={form.effective_date}
                        onChange={(e) =>
                            handleChange("effective_date", e.target.value)
                        }
                    />
                </div>

                <button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Bonus"}
                </button>
            </form>

            <div className="bonuses-list">
                <h3>Submitted Bonuses</h3>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Employee Code</th>
                                <th>Name</th>
                                <th>Division</th>
                                <th>Category</th>
                                <th>Sub Category</th>
                                <th>Bonus</th>
                                <th>Effective Date</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bonuses.map((bonus) => (
                                <tr key={bonus.id}>
                                    <td>{bonus.employee_code}</td>
                                    <td>{bonus.name}</td>
                                    <td>{bonus.division}</td>
                                    <td>{bonus.category}</td>
                                    <td>{bonus.sub_category}</td>
                                    <td>{bonus.bonus}</td>
                                    <td>{new Date(bonus.effective_date).toLocaleDateString("en-GB", {
                                        month: "short",
                                        year: "numeric",
                                    })}</td>
                                    <td>{new Date(bonus.created_at).toLocaleString("en-GB")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default EmployeeBonusApp;