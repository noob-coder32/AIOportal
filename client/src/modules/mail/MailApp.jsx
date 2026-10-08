import { useEffect, useState } from "react";
import api from "../../api";

function MailApp() {

    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState([]);
    const [failed, setFailed] = useState([]);

    const [newEmployee, setNewEmployee] = useState({
        employee_code: "",
        employee_name: "",
        email: "",
        unit_name: ""
    });

    const [editingId, setEditingId] = useState(null);
    const [editRow, setEditRow] = useState({});

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get("/mail/employees");
            setEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.employee_code} ${emp.employee_name} ${emp.email} ${emp.unit_name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const selectAllFiltered = () => {
        const ids = filteredEmployees.map(e => e.id);
        setSelected(ids);
    };

    const clearSelection = () => {
        setSelected([]);
    };

    const startEdit = (emp) => {
        setEditingId(emp.id);
        setEditRow(emp);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditRow({});
    };

    const saveEdit = async () => {
        try {

            await api.put(`/mail/employees/${editingId}`, editRow);

            setEditingId(null);
            fetchEmployees();

        } catch (err) {
            console.error("Update failed", err);
        }
    };

    const addEmployee = async () => {
        try {

            await api.post("/mail/employees", newEmployee);

            setShowAdd(false);

            setNewEmployee({
                employee_code: "",
                employee_name: "",
                email: "",
                unit_name: ""
            });

            fetchEmployees();

        } catch (err) {
            console.error("Add failed", err);
        }
    };

    const deleteEmployee = async (id) => {

        if (!window.confirm("Delete employee?")) return;

        try {

            await api.delete(`/mail/employees/${id}`);

            fetchEmployees();

        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const sendSelected = async () => {

        if (selected.length === 0) {
            alert("Select employees");
            return;
        }

        setSending(true);
        setSent([]);
        setFailed([]);

        try {

            const res = await api.post("/mail/send", {
                employeeIds: selected,
                subject,
                body
            });

            setSent(res.data.sent);
            setFailed(res.data.failed);

        } catch (err) {
            console.error(err);
        }

        setSending(false);
    };

    const sendAll = async () => {

        const allIds = employees.map(e => e.id);

        setSelected(allIds);

        setSending(true);
        setSent([]);
        setFailed([]);

        try {

            const res = await api.post("/mail/send", {
                employeeIds: allIds,
                subject,
                body
            });

            setSent(res.data.sent);
            setFailed(res.data.failed);

        } catch (err) {
            console.error(err);
        }

        setSending(false);
    };

    const resendFailed = async () => {

        const ids = failed.map(f => f.id);

        try {

            const res = await api.post("/mail/send", {
                employeeIds: ids,
                subject,
                body
            });

            setSent(prev => [...prev, ...res.data.sent]);
            setFailed(res.data.failed);

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="mail-container">

            {/* =========================
                EMPLOYEE SECTION
            ========================= */}
            <div className="section-card">

                <h3>Employee Mapping</h3>

                <div className="mail-toolbar">

                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button onClick={selectAllFiltered}>
                        Select All
                    </button>

                    <button onClick={clearSelection}>
                        Clear
                    </button>

                    <button onClick={() => setShowAdd(true)}>
                        + Add Employee
                    </button>

                    <div className="selected-count">
                        Selected: {selected.length}
                    </div>

                </div>

                {/* Scrollable employee list */}
                <div className="employee-list-box">

                    {/* {filteredEmployees.map(emp => (
                        <div className="employee-row" key={emp.id}>

                            <input
                                type="checkbox"
                                checked={selected.includes(emp.id)}
                                onChange={() => toggleSelect(emp.id)}
                            />

                            <div className="emp-code">
                                {emp.employee_code}
                            </div>

                            <div className="emp-name">
                                {emp.employee_name}
                            </div>

                            <div className="emp-email">
                                {emp.email}
                            </div>

                            <div className="emp-unit">
                                {emp.unit_name}
                            </div>

                        </div>
                    ))} */}

                    {filteredEmployees.map(emp => (

                        <label className="employee-row" key={emp.id}>

                            <input
                                type="checkbox"
                                checked={selected.includes(emp.id)}
                                onChange={() => toggleSelect(emp.id)}
                            />

                            <div className="emp-code">
                                {emp.employee_code}
                            </div>

                            {editingId === emp.id ? (
                                <>
                                    <input
                                        value={editRow.employee_name || ""}
                                        onChange={(e) => setEditRow({
                                            ...editRow,
                                            employee_name: e.target.value
                                        })}
                                    />

                                    <input
                                        value={editRow.email || ""}
                                        onChange={(e) => setEditRow({
                                            ...editRow,
                                            email: e.target.value
                                        })}
                                    />

                                    <input
                                        value={editRow.unit_name || ""}
                                        onChange={(e) => setEditRow({
                                            ...editRow,
                                            unit_name: e.target.value
                                        })}
                                    />

                                    <div className="row-actions">
                                        <button onClick={saveEdit}>Save</button>
                                        <button onClick={cancelEdit}>Cancel</button>
                                    </div>

                                </>
                            ) : (
                                <>

                                    <div className="emp-name">{emp.employee_name}</div>
                                    <div className="emp-email">{emp.email}</div>
                                    <div className="emp-unit">{emp.unit_name}</div>

                                    <div className="row-actions">
                                        <button onClick={() => startEdit(emp)}>Edit</button>
                                        <button onClick={() => deleteEmployee(emp.id)}>Delete</button>
                                    </div>

                                </>
                            )}

                        </label>

                    ))}

                </div>

            </div>

            {/* =========================
                EMAIL EDITOR SECTION
            ========================= */}

            <div className="section-card">
                <h3>Email Editor</h3>

                <input
                    className="mail-subject"
                    placeholder="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                />

                <textarea
                    className="mail-body"
                    placeholder="Email body..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                />
            </div>

            {/* =========================
                SEND SECTION
            ========================= */}
            <div className="section-card mail-send-section">

                <button className="send-btn"
                    onClick={sendSelected}
                    disabled={sending}
                >
                    {sending ? "Sending..." : "Send Selected"}
                </button>

                <button className="send-btn"
                    onClick={sendAll}
                    disabled={sending}
                >
                    {sending ? "Sending..." : "Send All"}
                </button>

            </div>

            {/* =========================
                STATUS SECTION
            ========================= */}

            <div className="section-card">

                <h3>Mail Status</h3>

                <div className="mail-status">

                    <div className="sent-block">
                        <h4>Sent ({sent.length})</h4>

                        {sent.map(s => (
                            <div key={s.employee_code}>
                                ✔ {s.employee_code}
                            </div>
                        ))}

                    </div>

                    <div className="failed-block">
                        <h4>Failed ({failed.length})</h4>

                        {failed.map(f => (
                            <div key={f.employee_code}>
                                ✖ {f.employee_code} - {f.reason}
                            </div>
                        ))}

                        {failed.length > 0 && (
                            <button onClick={resendFailed}>
                                Resend Failed
                            </button>
                        )}

                    </div>

                </div>

            </div>

            {showAdd && (
                <div className="mail-modal-overlay">

                    <div className="mail-modal">

                        <h3>Add Employee</h3>

                        <input
                            placeholder="Employee Code"
                            value={newEmployee.employee_code}
                            onChange={(e) =>
                                setNewEmployee({
                                    ...newEmployee,
                                    employee_code: e.target.value
                                })
                            }
                        />

                        <input
                            placeholder="Employee Name"
                            value={newEmployee.employee_name}
                            onChange={(e) =>
                                setNewEmployee({
                                    ...newEmployee,
                                    employee_name: e.target.value
                                })
                            }
                        />

                        <input
                            placeholder="Email"
                            value={newEmployee.email}
                            onChange={(e) =>
                                setNewEmployee({
                                    ...newEmployee,
                                    email: e.target.value
                                })
                            }
                        />

                        <input
                            placeholder="Unit"
                            value={newEmployee.unit_name}
                            onChange={(e) =>
                                setNewEmployee({
                                    ...newEmployee,
                                    unit_name: e.target.value
                                })
                            }
                        />

                        <div className="modal-actions">

                            <button onClick={() => setShowAdd(false)}>
                                Cancel
                            </button>

                            <button onClick={addEmployee}>
                                Save
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default MailApp;