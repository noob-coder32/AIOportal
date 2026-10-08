import { useEffect, useState, useRef } from "react";
import axios from "../../api";


function HodMaster({ showToast }) {
  const [hods, setHods] = useState([]);
  const [hodName, setHodName] = useState("");
  const [editId, setEditId] = useState(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);


  // Fetch all HODs (active + inactive)
  useEffect(() => {
    fetchHods();
  }, []);

  const fetchHods = async () => {
    try {
      const res = await axios.get("/hr/hodsAll");
      setHods(res.data);
    } catch (err) {
      console.error("Failed to fetch HODs", err);
    }
  };

  const resetForm = () => {
    setHodName("");
    setEditId(null);
  };

  const handleSave = async () => {
    if (!hodName) {
      showToast("HOD name is required", "error");
      return;
    }

    try {
      let res;

      if (editId) {
        res = await axios.put(`/hr/hods/${editId}`, {
          hod_name: hodName,
        });
      } else {
        res = await axios.post("/hr/hods", {
          hod_name: hodName,
        });
      }

      showToast(res.data.message || "Operation successful", "success");

      resetForm();
      fetchHods();
    } catch (err) {
      console.error("Failed to save HOD", err);
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleEdit = (hod) => {
    setEditId(hod.id);
    setHodName(hod.hod_name);

    // 🔥 Smooth scroll to form
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // 🔥 Focus input after small delay
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleToggleActive = async (hod) => {
    // Exit edit mode if active
    resetForm();

    const action = hod.is_active ? "deactivate" : "activate";

    const confirmMsg = hod.is_active
      ? "Are you sure you want to deactivate this HOD?"
      : "Are you sure you want to activate this HOD?";

    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.patch(`/hr/hods/${hod.id}/${action}`);

      showToast(
        hod.is_active
          ? "HOD deactivated successfully"
          : "HOD activated successfully",
        "success"
      );

      fetchHods();
    } catch (err) {
      console.error("Failed to toggle HOD status", err);
      showToast("Operation failed", "error");
    }
  };

  return (
    <div className="assignment-page">
      <h1 className="page-title">HOD Master</h1>

      {/* ===== Form ===== */}
      <div className="card form-card" ref={formRef}>
        <h2 className="section-title">
          {editId ? "Edit HOD" : "Add HOD"}
        </h2>

        <div className="form-group">
          <label>HOD Name</label>
          <input
            ref={inputRef}
            type="text"
            value={hodName}
            onChange={(e) => setHodName(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave}>
            {editId ? "Update HOD" : "Add HOD"}
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
        <h2 className="section-title">HOD List</h2>

        <table className="assignments-table">
          <thead>
            <tr>
              <th>HOD Name</th>
              <th>Active</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {hods.map((hod) => (
              <tr key={hod.id}>
                <td>{hod.hod_name}</td>
                <td>{hod.is_active ? "Yes" : "No"}</td>
                <td>
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(hod)}
                  >
                    Edit
                  </button>
                  <button
                    className={
                      hod.is_active ? "btn-danger" : "btn-success"
                    }
                    onClick={() => handleToggleActive(hod)}
                  >
                    {hod.is_active ? "Deactivate" : "Activate"}
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

export default HodMaster;
