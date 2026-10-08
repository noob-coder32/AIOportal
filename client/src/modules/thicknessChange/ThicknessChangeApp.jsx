import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";

function ThicknessChangeApp() {
    const [form, setForm] = useState({
        coil_no: "",
        thickness: "",
        qty: "",
        to_be_thickness: "",
        width: "",
        bundle_weight: "",
        remark: ""
    });

    const [data, setData] = useState([]);

    const [search, setSearch] = useState("");
    const isMountedRef = useRef(false);
    const isFetchingRef = useRef(false);
    const isSubmittingRef = useRef(false);

    // 🔹 Fetch all requests
    const fetchData = async () => {
        if (!isMountedRef.current || isFetchingRef.current || isSubmittingRef.current) {
            return;
        }

        isFetchingRef.current = true;

        try {
            const res = await api.get("/thickness-change");

            if (isMountedRef.current) {
                setData(res.data);
            }
        } catch (err) {
            if (isMountedRef.current) {
                showToast();
            }

            console.error("Fetch failed", err);
        } finally {
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchData();
        const intervalId = setInterval(fetchData, 60000);

        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
        };
    }, []);

    // 🔹 Submit form
    const handleSubmit = async () => {
        let shouldRefreshTable = false;

        const {
            coil_no,
            thickness,
            qty,
            to_be_thickness,
            width,
            bundle_weight,
            remark
        } = form;

        if (
            !coil_no ||
            !thickness ||
            !qty ||
            !to_be_thickness ||
            !width
        ) {
            return alert("All required fields except bundle weight are required");
        }

        try {
            isSubmittingRef.current = true;

            const hasBundleWeight =
                bundle_weight !== null &&
                bundle_weight !== undefined &&
                String(bundle_weight).trim() !== "";

            if (hasBundleWeight) {
                const masterRes = await api.get("/thickness2");
                const masterRow = masterRes.data.find((row) => {
                    return (
                        Number(row.thickness) === Number(to_be_thickness) &&
                        Number(row.width) === Number(width)
                    );
                });

                if (!masterRow) {
                    return alert(
                        "No matching thickness master record found for the entered thickness and width. Please verify values."
                    );
                }

                const bundleWeightValue = Number(bundle_weight);
                const minRange = Number(masterRow.min_range);
                const maxRange = Number(masterRow.max_range);
                const isOutOfRange =
                    bundleWeightValue < minRange || bundleWeightValue > maxRange;

                if (isOutOfRange) {
                    const confirmSubmit = window.confirm(
                        `Bundle weight out of range for thickness ${to_be_thickness} and width ${width}. Master range is ${masterRow.min_range} - ${masterRow.max_range}. Submit anyway?`
                    );

                    if (!confirmSubmit) {
                        return;
                    }

                    if (!remark.trim()) {
                        return alert(
                            "Remark is required when bundle weight is out of range. Please enter a remark before submitting."
                        );
                    }
                }
            }

            const payload = {
                ...form,
                width,
                bundle_weight: hasBundleWeight ? bundle_weight : null,
                remark: remark.trim() ? remark.trim() : null
            };

            await api.post("/thickness-change", payload);

            alert("Saved successfully");

            setForm({
                coil_no: "",
                thickness: "",
                qty: "",
                to_be_thickness: "",
                width: "",
                bundle_weight: "",
                remark: ""
            });

            shouldRefreshTable = true;

        } catch (err) {
            alert(err.response?.data?.message || "Error");
        } finally {
            isSubmittingRef.current = false;
        }

        if (shouldRefreshTable) {
            fetchData();
        }
    };

    const filteredData = useMemo(
        () =>
            data.filter((item) =>
                item.coil_no?.toLowerCase().startsWith(search.toLowerCase())
            ),
        [data, search]
    );

    const tableBody = useMemo(() => {
        if (filteredData.length === 0) {
            return (
                <tr>
                    <td colSpan="12">No data found</td>
                </tr>
            );
        }

        return filteredData.map((row) => (
            <tr key={row.id}>
                <td>{row.coil_no}</td>
                <td>{row.thickness}</td>
                <td>{row.qty}</td>
                <td>{row.to_be_thickness}</td>
                <td>{row.width}</td>
                <td>{row.bundle_weight}</td>
                <td>{row.remark || "-"}</td>
                <td>
                    <span className={`status-badge ${Number(row.flag) === 1 ? 'approved' : 'pending'}`}>
                        {Number(row.flag) === 1 ? "Approved" : "Pending"}
                    </span>
                </td>
                <td>{row.requested_by}</td>
                <td>
                    {new Date(row.requested_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    })}
                </td>
            </tr>
        ));
    }, [filteredData]);

    return (
        <div className="thickness-page">
            <h2>Thickness Change Request</h2>

            {/* ===== FORM ===== */}
            <div className="form-section">

                <div className="form-group">
                    <label>Coil No</label>
                    <input
                        placeholder="Coil No"
                        value={form.coil_no}
                        onChange={(e) =>
                            setForm({ ...form, coil_no: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Current Thickness</label>
                    <input
                        type="number"
                        step="0.01"
                        max="99.99"
                        placeholder="Current Thickness"
                        value={form.thickness}
                        onChange={(e) =>
                            setForm({ ...form, thickness: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Qty</label>
                    <input
                        type="number"
                        step="0.001"
                        // max="999.999"
                        placeholder="Qty"
                        value={form.qty}
                        onChange={(e) =>
                            setForm({ ...form, qty: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>To Be Thickness</label>
                    <input
                        type="number"
                        step="0.01"
                        // max="99.99"
                        placeholder="To Be Thickness"
                        value={form.to_be_thickness}
                        onChange={(e) =>
                            setForm({ ...form, to_be_thickness: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Width</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Width"
                        value={form.width}
                        onChange={(e) =>
                            setForm({ ...form, width: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Bundle Weight</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Bundle Weight"
                        value={form.bundle_weight}
                        onChange={(e) =>
                            setForm({ ...form, bundle_weight: e.target.value })
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Remark</label>
                    <textarea
                        placeholder="Remark (required if bundle weight is out of range)"
                        value={form.remark}
                        onChange={(e) =>
                            setForm({ ...form, remark: e.target.value })
                        }
                    />
                </div>

                <div className="form-actions">
                    <button onClick={handleSubmit}>Save</button>
                </div>
            </div>

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

            {/* ===== TABLE ===== */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Coil</th>
                            <th>Thickness</th>
                            <th>Qty</th>
                            <th>To be Thickness</th>
                            <th>Width</th>
                            <th>Bundle Weight</th>
                            <th>Remark</th>
                            <th>Request Status</th>
                            <th>Requested By</th>
                            <th>Requested Date</th>
                        </tr>
                    </thead>
                    <tbody>{tableBody}</tbody>
                </table>
            </div>
        </div>
    );
}

export default ThicknessChangeApp;
