import { useEffect, useState } from "react";
import axios from "../../api";
import "./EmpHod.css";
import HodMaster from "./HodMaster";
import EmployeeMaster from "./EmployeeMaster";
import Select from "react-select";

function App() {
  // ===== Page Control =====
  const [activePage, setActivePage] = useState("assignments");
  const [activeMaster, setActiveMaster] = useState("employees");

  // ===== Toast =====
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  // ===== Assignment State =====
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  const [hods, setHods] = useState([]);
  const [selectedHodId, setSelectedHodId] = useState("");

  const [assignments, setAssignments] = useState([]);

  // ===== Toast Auto Close =====
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ===== Fetch Data =====
  const fetchAssignmentData = async () => {
    try {
      const [empRes, hodRes, assignRes] = await Promise.all([
        axios.get("/hr/employees"),
        axios.get("/hr/hods"),
        axios.get("/hr/assignments"),
      ]);

      setEmployees(empRes.data);
      setHods(hodRes.data);
      setAssignments(assignRes.data);
    } catch (error) {
      console.error(error);
      setToast("Failed to fetch data");
      setToastType("error");
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  useEffect(() => {
    if (activePage === "assignments") {
      fetchAssignmentData();
    }
  }, [activePage]);

  // ===== Options for react-select =====
  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.employee_code} - ${emp.employee_name}`,
  }));

  const hodOptions = hods.map((hod) => ({
    value: hod.id,
    label: hod.hod_name,
  }));

  // ===== Save Assignment =====
  const handleSave = async () => {
    if (!selectedEmployeeId || !selectedHodId) {
      setToast("Please select both an employee and a HOD before saving.");
      setToastType("error");
      return;
    }

    try {
      const res = await axios.post("/hr/employee-hod-assign", {
        employeeId: selectedEmployeeId,
        hodId: selectedHodId,
      });

      setToast(res.data.message);
      setToastType("success");

      const assignRes = await axios.get("/hr/assignments");
      setAssignments(assignRes.data);

      setSelectedEmployeeId("");
      setEmployeeName("");
      setSelectedHodId("");
    } catch (error) {
      console.error(error);
      setToast("Failed to save assignment.");
      setToastType("error");
    }
  };

  const minimalSelectStyles = {
    option: (provided) => ({
      ...provided,
      color: "#000",   // make dropdown text black
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#000",   // selected value text
    }),
    input: (provided) => ({
      ...provided,
      color: "#000",   // typing text
    }),
  };

  return (
    <div className="app-container">

      {/* ===== Navigation ===== */}
      <div className="top-nav">
        <div className="nav-left">
          <h2>Dashboard</h2>
        </div>

        <div className="nav-right">
          <button
            className={activePage === "assignments" ? "active" : ""}
            onClick={() => setActivePage("assignments")}
          >
            Assignments
          </button>

          <button
            className={activePage === "masters" ? "active" : ""}
            onClick={() => setActivePage("masters")}
          >
            Masters
          </button>
        </div>
      </div>

      {/* ================= ASSIGNMENTS PAGE ================= */}
      {activePage === "assignments" && (
        <div className="assignment-page">
          <h1 className="page-title">Employee–HOD Assignment</h1>

          <div className="card form-card">
            <h2 className="section-title">Assign HOD</h2>

            {/* Employee Select */}
            <div className="form-group">
              <label>Employee</label>
              <Select
                styles={minimalSelectStyles}
                placeholder="Search Employee..."
                options={employeeOptions}
                value={
                  employeeOptions.find(
                    (opt) => opt.value === selectedEmployeeId
                  ) || null
                }
                onChange={(selectedOption) => {
                  if (!selectedOption) {
                    setSelectedEmployeeId("");
                    setEmployeeName("");
                    return;
                  }

                  setSelectedEmployeeId(selectedOption.value);

                  const emp = employees.find(
                    (e) => e.id === selectedOption.value
                  );

                  setEmployeeName(emp?.employee_name || "");
                }}
                isClearable
              />
            </div>

            {/* Employee Name */}
            {/* <div className="form-group">
              <label>Employee Name</label>
              <input
                type="text"
                value={employeeName}
                readOnly
                className="readonly-input"
              />
            </div> */}

            {/* HOD Select */}
            <div className="form-group">
              <label>Head of Department (HOD)</label>
              <Select
                styles={minimalSelectStyles}
                placeholder="Search HOD..."
                options={hodOptions}
                value={
                  hodOptions.find(
                    (opt) => opt.value === selectedHodId
                  ) || null
                }
                onChange={(selectedOption) => {
                  if (!selectedOption) {
                    setSelectedHodId("");
                    return;
                  }

                  setSelectedHodId(selectedOption.value);
                }}
                isClearable
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
              >
                Save Assignment
              </button>
            </div>
          </div>

          {/* ===== Assignments Table ===== */}
          <div className="card table-card">
            <h2 className="section-title">Saved Assignments</h2>

            {assignments.length > 0 ? (
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Employee Code</th>
                    <th>Employee Name</th>
                    <th>HOD</th>
                    <th>Assigned/Updated Date & Time</th>
                    <th>Assigned/Updated By</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => (
                    <tr key={row.id}>
                      <td>{row.employee_code}</td>
                      <td>{row.employee_name}</td>
                      <td>{row.hod_name}</td>
                      <td>
                        {new Date(row.assigned_at).toLocaleString("en-GB")}
                      </td>
                      <td>{row.assigned_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-message">No assignments saved yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= MASTERS PAGE ================= */}
      {activePage === "masters" && (
        <div className="masters-wrapper">
          <div className="sub-nav">
            <button
              className={activeMaster === "employees" ? "active" : ""}
              onClick={() => setActiveMaster("employees")}
            >
              Employees
            </button>

            <button
              className={activeMaster === "hods" ? "active" : ""}
              onClick={() => setActiveMaster("hods")}
            >
              HODs
            </button>
          </div>

          {activeMaster === "employees" && (
            <EmployeeMaster
              showToast={(message, type = "success") => {
                setToast(message);
                setToastType(type);
              }}
            />
          )}

          {activeMaster === "hods" && (
            <HodMaster
              showToast={(message, type = "success") => {
                setToast(message);
                setToastType(type);
              }}
            />
          )}
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`toast-popup ${toastType}`}>
          {toast}
        </div>
      )}

    </div>
  );
}

export default App;