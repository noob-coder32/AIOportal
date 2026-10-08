import { useEffect, useState } from "react";
import axios from "../../api";

function FreezeApp() {
    const [data, setData] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [newDate, setNewDate] = useState("");

    const fetchData = async () => {
        const res = await axios.get("/freeze");
        setData(res.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (row) => {
        setEditingId(row.id);
        setNewDate(row.freeze_till?.split("T")[0]);
    };

    const handleSave = async (id) => {
        await axios.put(`/freeze/${id}`, {
            freeze_till: newDate
        });

        setEditingId(null);
        fetchData();
    };

    return (
        <div>
            <h2>Date Freeze</h2>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Module</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Functionality</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Freeze Till</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((row) => (
                        <tr key={row.id}>
                            <td style={{ border: "1px solid black", padding: "8px" }}>{row.module_name}</td>
                            <td style={{ border: "1px solid black", padding: "8px" }}>{row.functionality}</td>

                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {editingId === row.id ? (
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) =>
                                            setNewDate(e.target.value)
                                        }
                                    />
                                ) : (
                                    row.freeze_till?.split("T")[0]
                                )}
                            </td>

                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {editingId === row.id ? (
                                    <>
                                        <button onClick={() => handleSave(row.id)}>
                                            Save
                                        </button>

                                        <button
                                            onClick={() => {
                                                setEditingId(null);
                                                setNewDate("");
                                            }}
                                            style={{ marginLeft: "8px" }}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => handleEdit(row)}>
                                        Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default FreezeApp;
