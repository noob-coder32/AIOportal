import { useEffect, useState } from "react";
import axios from "../../api";
import "./payslip.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

function PayslipApp() {
    const [cycles, setCycles] = useState([]);
    const [selectedCycle, setSelectedCycle] = useState("");

    const [filters, setFilters] = useState({
        division: "",
        category: "",
        subCategory: "",
        department: "",
    });

    const [filterOptions, setFilterOptions] = useState({
        divisions: [],
        categories: [],
        subCategories: [],
        departments: [],
    });

    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState([]);

    // =============================
    // FETCH CYCLES ON LOAD
    // =============================
    useEffect(() => {
        fetchCycles();
    }, []);

    const fetchCycles = async () => {
        try {
            const res = await axios.get("/payslip/cycles");
            setCycles(res.data);
        } catch (err) {
            console.error("Failed to fetch cycles", err);
        }
    };

    // =============================
    // FETCH FILTER OPTIONS WHEN CYCLE CHANGES
    // =============================
    useEffect(() => {
        if (!selectedCycle) {
            setFilterOptions({
                divisions: [],
                categories: [],
                subCategories: [],
                departments: [],
            });

            setFilters({
                division: "",
                category: "",
                subCategory: "",
                department: "",
            });

            setEmployees([]);
            setSelectedEmployees([]);
            return;
        }

        fetchFilterOptions();
    }, [selectedCycle]);

    const fetchFilterOptions = async () => {
        try {
            const res = await axios.get("/payslip/filter-options", {
                params: { cycle: selectedCycle },
            });

            setFilterOptions(res.data);

            // Reset filters on cycle change
            setFilters({
                division: "",
                category: "",
                subCategory: "",
                department: "",
            });

        } catch (err) {
            console.error("Failed to fetch filter options", err);
        }
    };

    // =============================
    // FETCH EMPLOYEES WHEN FILTERS CHANGE
    // =============================
    useEffect(() => {
        if (!selectedCycle) return;

        fetchEmployees();
    }, [filters, selectedCycle]);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get("/payslip/employees", {
                params: {
                    cycle: selectedCycle,
                    ...filters,
                },
            });

            setEmployees(res.data);
            setSelectedEmployees([]);
        } catch (err) {
            console.error("Failed to fetch employees", err);
        }
    };

    // =============================
    // SEARCH FILTER (CLIENT SIDE)
    // =============================
    const filteredEmployees = employees.filter((e) =>
        `${e.employee_code} ${e.employee_name}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    // =============================
    // SELECTION LOGIC
    // =============================
    const toggleEmployee = (id) => {
        setSelectedEmployees((prev) =>
            prev.includes(id)
                ? prev.filter((c) => c !== id)
                : [...prev, id]
        );
    };

    const selectAllFiltered = () => {
        const ids = filteredEmployees.map((e) => e.employee_id);
        setSelectedEmployees((prev) =>
            Array.from(new Set([...prev, ...ids]))
        );
    };

    const clearSelection = () => {
        setSelectedEmployees([]);
    };

    // =============================
    // GENERATE PAYSLIPS
    // =============================
    const handleGenerate = async () => {
        if (!selectedCycle || selectedEmployees.length === 0) return;

        setIsGenerating(true);
        setResults([]);

        try {
            const res = await axios.post("/payslip/generate", {
                employeeIds: selectedEmployees,
                cycle: selectedCycle,
            });

            setResults(res.data.results || []);
        } catch (err) {
            alert(
                err.response?.data?.message ||
                "Failed to generate payslips"
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="payslip-page">
            <h2>Payslip Generator</h2>

            <div className="payslip-controls">

                {/* Search First */}
                <div className="search-row">
                    <input
                        type="text"
                        placeholder="Search by employee code or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    // disabled={!selectedCycle}

                    />
                </div>

                {/* Filters Below */}
                <div className="filters-row">

                    <select
                        value={selectedCycle}
                        onChange={(e) => setSelectedCycle(e.target.value)}
                    >
                        <option value="">Select Payroll Cycle</option>
                        {cycles.map((c) => (
                            <option
                                key={c.payroll_cycle_name}
                                value={c.payroll_cycle_name}
                            >
                                {c.payroll_cycle_name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filters.division}
                        onChange={(e) =>
                            setFilters({ ...filters, division: e.target.value })
                        }
                        disabled={!selectedCycle}
                    >
                        <option value="">All Divisions</option>
                        {filterOptions.divisions.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                    <select
                        value={filters.category}
                        onChange={(e) =>
                            setFilters({ ...filters, category: e.target.value })
                        }
                        disabled={!selectedCycle}
                    >
                        <option value="">All Categories</option>
                        {filterOptions.categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <select
                        value={filters.subCategory}
                        onChange={(e) =>
                            setFilters({ ...filters, subCategory: e.target.value })
                        }
                        disabled={!selectedCycle}
                    >
                        <option value="">All Sub Categories</option>
                        {filterOptions.subCategories.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <select
                        value={filters.department}
                        onChange={(e) =>
                            setFilters({ ...filters, department: e.target.value })
                        }
                        disabled={!selectedCycle}
                    >
                        <option value="">All Departments</option>
                        {filterOptions.departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>

                </div>
            </div>



            <div className="selection-actions">
                <button onClick={selectAllFiltered}>
                    Select All (Filtered)
                </button>

                <button onClick={clearSelection}>
                    Clear Selection
                </button>

                <span>Selected: {selectedEmployees.length}</span>
            </div>

            <div className="employee-list">
                {filteredEmployees.map((e) => (
                    <label key={e.employee_id} className="employee-row">
                        <input
                            type="checkbox"
                            checked={selectedEmployees.includes(e.employee_id)}
                            onChange={() => toggleEmployee(e.employee_id)}
                        />
                        <span>{e.employee_code}</span>
                        <span>{e.employee_name}</span>
                    </label>
                ))}

                {filteredEmployees.length === 0 && (
                    <div className="no-results">
                        {selectedCycle
                            ? "No employees found"
                            : "Select a payroll cycle"}
                    </div>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={
                    !selectedCycle ||
                    selectedEmployees.length === 0 ||
                    isGenerating
                }
            >
                {isGenerating ? "Generating..." : "Generate Payslips"}
            </button>

            {results.length > 0 && (
                <div className="generation-results">
                    <h3>Generation Results</h3>
                    {results.map((r) => (
                        <div
                            key={r.employeeId}
                            className={
                                r.status === "success"
                                    ? "result success"
                                    : "result failed"
                            }
                        >
                            <strong>
                                {r.employeeCode || r.employee_code}
                                {r.employeeName ? ` - ${r.employeeName}` : ""}
                            </strong>

                            {r.status === "success" ? (
                                <>
                                    {" "}✅ Generated{" "}
                                    {r.pdfUrl && (
                                        <a
                                            href={`${API_BASE}${r.pdfUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ marginLeft: "10px" }}
                                        >
                                            Download
                                        </a>
                                    )}
                                </>
                            ) : (
                                <> ❌ Failed — {r.error}</>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PayslipApp;
