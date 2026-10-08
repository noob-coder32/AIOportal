import { useEffect, useState, useRef } from "react";
import axios from "../../api";

function EmployeeMaster({ showToast }) {
    const [employees, setEmployees] = useState([]);
    const [employeeCode, setEmployeeCode] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [editId, setEditId] = useState(null);

    const formRef = useRef(null);
    const inputRef = useRef(null);

    // 🔹 Fetch all employees (active + inactive)
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get("/hr/employeesAll");
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
            showToast("Failed to fetch employees", "error");
        }
    };

    const resetForm = () => {
        setEmployeeCode("");
        setEmployeeName("");
        setEditId(null);
    };

    const handleSave = async () => {
        // if (!employeeCode || !employeeName) {
        if (!employeeCode) {
            showToast("Employee code is required", "error");
            return;
        }

        try {
            let res;

            if (editId) {
                res = await axios.put(`/hr/employees/${editId}`, {
                    employee_code: employeeCode,
                    employee_name: employeeName,
                });
            } else {
                res = await axios.post("/hr/employees", {
                    employee_code: employeeCode,
                    employee_name: employeeName,
                });
            }

            showToast(res.data.message || "Operation successful", "success");

            resetForm();
            fetchEmployees();
        } catch (err) {
            console.error("Failed to save employee", err);
            showToast(
                err.response?.data?.message || "Operation failed",
                "error"
            );
        }
    };

    const handleEdit = (employee) => {
        setEditId(employee.id);
        setEmployeeCode(employee.employee_code);
        setEmployeeName(employee.employee_name);

        // 🔥 Smooth scroll to form
        formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

        // 🔥 Focus first input
        setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
    };

    const handleToggleActive = async (employee) => {
        resetForm();

        const action = employee.is_active ? "deactivate" : "activate";

        const confirmMsg = employee.is_active
            ? "Are you sure you want to deactivate this employee?"
            : "Are you sure you want to activate this employee?";

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.patch(`/hr/employees/${employee.id}/${action}`);

            showToast(
                employee.is_active
                    ? "Employee deactivated successfully"
                    : "Employee activated successfully",
                "success"
            );

            fetchEmployees();
        } catch (err) {
            console.error("Failed to toggle employee status", err);
            showToast("Operation failed", "error");
        }
    };

    return (
        <div className="assignment-page">
            <h1 className="page-title">Employee Master</h1>

            {/* ===== Form ===== */}
            <div className="card form-card" ref={formRef}>
                <h2 className="section-title">
                    {editId ? "Edit Employee" : "Add Employee"}
                </h2>

                <div className="form-group">
                    <label>Employee Code</label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label>Employee Name</label>
                    <input
                        type="text"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                    />
                </div>

                <div className="form-actions">
                    <button className="btn-primary" onClick={handleSave}>
                        {editId ? "Update Employee" : "Add Employee"}
                    </button>

                    {editId && (
                        <button className="btn-secondary" onClick={resetForm}>
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* ===== Table ===== */}
            <div className="card table-card">
                <h2 className="section-title">Employee List</h2>

                <table className="assignments-table">
                    <thead>
                        <tr>
                            <th>Employee Code</th>
                            <th>Employee Name</th>
                            <th>Active</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id}>
                                <td>{emp.employee_code}</td>
                                <td>{emp.employee_name}</td>
                                <td>{emp.is_active ? "Yes" : "No"}</td>
                                <td>
                                    <button
                                        className="btn-edit"
                                        onClick={() => handleEdit(emp)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className={
                                            emp.is_active ? "btn-danger" : "btn-success"
                                        }
                                        onClick={() => handleToggleActive(emp)}
                                    >
                                        {emp.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default EmployeeMaster;