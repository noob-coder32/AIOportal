import { startTransition, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import api from "../../api";
import "./medicalAllowance.css";

function MedicalAllowanceApp() {
    const [activeTab, setActiveTab] = useState("report");

    const [reportCycles, setReportCycles] = useState([]);
    const [reportCycle, setReportCycle] = useState("");
    const [reportFilters, setReportFilters] = useState({
        division: "",
        category: "",
        department: "",
    });
    const [reportFilterOptions, setReportFilterOptions] = useState({
        divisions: [],
        categories: [],
        departments: [],
    });
    const [reportRecords, setReportRecords] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportGenerating, setReportGenerating] = useState(false);
    const [reportMessage, setReportMessage] = useState("");

    const [selectionCycles, setSelectionCycles] = useState([]);
    const [selectionCycle, setSelectionCycle] = useState("");
    const [selectionFilters, setSelectionFilters] = useState({
        search: "",
        division: "",
        category: "",
        department: "",
        showSelectedOnly: false,
    });
    const [sourceEmployees, setSourceEmployees] = useState([]);
    const [masterEmployees, setMasterEmployees] = useState([]);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [selectionSaving, setSelectionSaving] = useState(false);
    const [selectionRefreshing, setSelectionRefreshing] = useState(false);
    const [selectionMessage, setSelectionMessage] = useState("");
    const [checkedAvailableIds, setCheckedAvailableIds] = useState([]);
    const [checkedSelectedIds, setCheckedSelectedIds] = useState([]);
    const [pendingAddIds, setPendingAddIds] = useState([]);
    const [pendingRemoveIds, setPendingRemoveIds] = useState([]);
    const [isSelectionPending, startSelectionTransition] = useTransition();

    useEffect(() => {
        fetchReportCycles();
        fetchSelectionCycles();
        fetchMasterEmployees();
    }, []);

    useEffect(() => {
        if (!reportCycle) {
            setReportFilterOptions({
                divisions: [],
                categories: [],
                departments: [],
            });
            setReportFilters({
                division: "",
                category: "",
                department: "",
            });
            setReportRecords([]);
            return;
        }

        fetchReportFilterOptions(reportCycle);
    }, [reportCycle]);

    useEffect(() => {
        if (!reportCycle) {
            return;
        }

        fetchReportRecords();
    }, [reportCycle, reportFilters]);

    useEffect(() => {
        if (!selectionCycle) {
            setSourceEmployees([]);
            clearLocalSelectionChanges();
            return;
        }

        fetchSourceEmployees(selectionCycle);
    }, [selectionCycle]);

    const deferredSearch = useDeferredValue(selectionFilters.search);
    const pendingAddSet = useMemo(() => new Set(pendingAddIds), [pendingAddIds]);
    const pendingRemoveSet = useMemo(() => new Set(pendingRemoveIds), [pendingRemoveIds]);
    const checkedAvailableSet = useMemo(() => new Set(checkedAvailableIds), [checkedAvailableIds]);
    const checkedSelectedSet = useMemo(() => new Set(checkedSelectedIds), [checkedSelectedIds]);
    const sourceSelectedMap = useMemo(
        () => new Map(sourceEmployees.map((employee) => [employee.employee_id, Boolean(employee.is_selected)])),
        [sourceEmployees]
    );

    const isEffectivelySelected = (employeeId) => {
        if (pendingAddSet.has(employeeId)) {
            return true;
        }

        if (pendingRemoveSet.has(employeeId)) {
            return false;
        }

        return sourceSelectedMap.get(employeeId) || false;
    };

    const divisionOptions = useMemo(
        () => [...new Set(sourceEmployees.map((employee) => employee.division_name).filter(Boolean))].sort(),
        [sourceEmployees]
    );
    const categoryOptions = useMemo(
        () => [...new Set(sourceEmployees.map((employee) => employee.category_name).filter(Boolean))].sort(),
        [sourceEmployees]
    );
    const departmentOptions = useMemo(
        () => [...new Set(sourceEmployees.map((employee) => employee.department_name).filter(Boolean))].sort(),
        [sourceEmployees]
    );

    const filteredSourceEmployees = useMemo(() => {
        const normalizedSearch = deferredSearch.toLowerCase();

        return sourceEmployees.filter((employee) => {
            const searchNeedle = `${employee.employee_code || ""} ${employee.emp_name || ""}`.toLowerCase();
            const matchesSearch = normalizedSearch
                ? searchNeedle.includes(normalizedSearch)
                : true;
            const matchesDivision = selectionFilters.division
                ? employee.division_name === selectionFilters.division
                : true;
            const matchesCategory = selectionFilters.category
                ? employee.category_name === selectionFilters.category
                : true;
            const matchesDepartment = selectionFilters.department
                ? employee.department_name === selectionFilters.department
                : true;
            const matchesSelectedOnly = selectionFilters.showSelectedOnly
                ? isEffectivelySelected(employee.employee_id)
                : true;

            return (
                matchesSearch &&
                matchesDivision &&
                matchesCategory &&
                matchesDepartment &&
                matchesSelectedOnly
            );
        });
    }, [
        deferredSearch,
        sourceEmployees,
        selectionFilters.division,
        selectionFilters.category,
        selectionFilters.department,
        selectionFilters.showSelectedOnly,
        pendingAddSet,
        pendingRemoveSet,
        sourceSelectedMap,
    ]);

    const availableEmployees = useMemo(
        () => filteredSourceEmployees.filter((employee) => !isEffectivelySelected(employee.employee_id)),
        [filteredSourceEmployees, pendingAddSet, pendingRemoveSet, sourceSelectedMap]
    );
    const selectedEmployees = useMemo(
        () => filteredSourceEmployees.filter((employee) => isEffectivelySelected(employee.employee_id)),
        [filteredSourceEmployees, pendingAddSet, pendingRemoveSet, sourceSelectedMap]
    );
    const selectedInCurrentCycle = useMemo(
        () => sourceEmployees.filter((employee) => isEffectivelySelected(employee.employee_id)).length,
        [sourceEmployees, pendingAddSet, pendingRemoveSet, sourceSelectedMap]
    );
    const hasUnsavedChanges = pendingAddIds.length > 0 || pendingRemoveIds.length > 0;


    async function fetchReportCycles() {
        try {
            const res = await api.get("/medical-allowance/cycles");
            setReportCycles(res.data);
        } catch (err) {
            console.error("Failed to fetch medical allowance cycles", err);
            setReportMessage("Failed to fetch payroll cycles");
        }
    }

    async function fetchSelectionCycles() {
        try {
            const res = await api.get("/medical-allowance/selection/cycles");
            setSelectionCycles(res.data);
        } catch (err) {
            console.error("Failed to fetch source cycles", err);
            setSelectionMessage("Failed to fetch source payroll cycles");
        }
    }

    async function fetchMasterEmployees() {
        try {
            const res = await api.get("/medical-allowance/selection/master");
            setMasterEmployees(res.data);
        } catch (err) {
            console.error("Failed to fetch master employees", err);
        }
    }

    async function fetchReportFilterOptions(cycle) {
        try {
            const res = await api.get("/medical-allowance/filter-options", {
                params: { cycle },
            });

            setReportFilterOptions(res.data);
            setReportFilters({
                division: "",
                category: "",
                department: "",
            });
            setReportRecords([]);
        } catch (err) {
            console.error("Failed to fetch report filter options", err);
            setReportMessage("Failed to fetch filter options");
        }
    }

    async function fetchReportRecords() {
        setReportLoading(true);
        setReportMessage("");

        try {
            const res = await api.get("/medical-allowance/records", {
                params: {
                    cycle: reportCycle,
                    division: reportFilters.division,
                    category: reportFilters.category,
                    department: reportFilters.department,
                },
            });

            setReportRecords(res.data);
        } catch (err) {
            console.error("Failed to fetch report records", err);
            setReportMessage("Failed to fetch records");
            setReportRecords([]);
        } finally {
            setReportLoading(false);
        }
    }




    async function fetchSourceEmployees(cycle, options = {}) {
        setSelectionLoading(true);
        if (!options.preserveMessage) {
            setSelectionMessage("");
        }

        try {
            const res = await api.get("/medical-allowance/selection/source-employees", {
                params: { cycle },
            });

            setSourceEmployees(res.data);
            clearLocalSelectionChanges();
        } catch (err) {
            console.error("Failed to fetch source employees", err);
            setSelectionMessage("Failed to fetch employees from payslip data");
            setSourceEmployees([]);
        } finally {
            setSelectionLoading(false);
        }
    }

    function clearLocalSelectionChanges() {
        setPendingAddIds([]);
        setPendingRemoveIds([]);
        setCheckedAvailableIds([]);
        setCheckedSelectedIds([]);
    }

    function formatWholeNumber(value) {
        return Number(value || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
        });
    }

    function formatDecimal(value) {
        return Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }










    function handleReportFilterChange(key, value) {
        setReportFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function handleSelectionFilterChange(key, value) {
        setSelectionFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    }

    function confirmDiscardChanges() {
        if (!hasUnsavedChanges) {
            return true;
        }

        return window.confirm("You have unsaved selection changes. Discard them?");
    }

    function handleTabChange(nextTab) {
        if (nextTab === activeTab) {
            return;
        }

        if (activeTab === "selection" && !confirmDiscardChanges()) {
            return;
        }

        if (activeTab === "selection") {
            clearLocalSelectionChanges();
            setSelectionMessage("");
        }

        setActiveTab(nextTab);
    }

    function handleSelectionCycleChange(nextCycle) {
        if (nextCycle === selectionCycle) {
            return;
        }

        if (!confirmDiscardChanges()) {
            return;
        }

        clearLocalSelectionChanges();
        setSelectionMessage("");
        setSelectionCycle(nextCycle);
    }

    function toggleCheckedAvailable(employeeId) {
        if (isSelectionPending) {
            return;
        }

        startSelectionTransition(() => {
            setCheckedAvailableIds((prev) =>
                prev.includes(employeeId)
                    ? prev.filter((id) => id !== employeeId)
                    : [...prev, employeeId]
            );
        });
    }

    function toggleCheckedSelected(employeeId) {
        if (isSelectionPending) {
            return;
        }

        startSelectionTransition(() => {
            setCheckedSelectedIds((prev) =>
                prev.includes(employeeId)
                    ? prev.filter((id) => id !== employeeId)
                    : [...prev, employeeId]
            );
        });
    }

    function applyAdd(employeeIds) {
        if (employeeIds.length === 0) {
            return;
        }

        startTransition(() => {
            const nextAdd = new Set(pendingAddIds);
            const nextRemove = new Set(pendingRemoveIds);

            employeeIds.forEach((employeeId) => {
                if (nextRemove.has(employeeId)) {
                    nextRemove.delete(employeeId);
                    return;
                }

                if (!sourceSelectedMap.get(employeeId)) {
                    nextAdd.add(employeeId);
                }
            });

            setPendingAddIds([...nextAdd]);
            setPendingRemoveIds([...nextRemove]);
            setCheckedAvailableIds([]);
        });
    }

    function applyRemove(employeeIds) {
        if (employeeIds.length === 0) {
            return;
        }

        startTransition(() => {
            const nextAdd = new Set(pendingAddIds);
            const nextRemove = new Set(pendingRemoveIds);

            employeeIds.forEach((employeeId) => {
                if (nextAdd.has(employeeId)) {
                    nextAdd.delete(employeeId);
                    return;
                }

                if (sourceSelectedMap.get(employeeId)) {
                    nextRemove.add(employeeId);
                }
            });

            setPendingAddIds([...nextAdd]);
            setPendingRemoveIds([...nextRemove]);
            setCheckedSelectedIds([]);
        });
    }

    async function handleSaveSelection() {
        if (!selectionCycle || !hasUnsavedChanges) {
            return;
        }

        const addCount = pendingAddIds.length;
        const removeCount = pendingRemoveIds.length;

        setSelectionSaving(true);
        setSelectionMessage("");

        try {
            await api.post("/medical-allowance/selection/save", {
                cycle: selectionCycle,
                addEmployeeIds: pendingAddIds,
                removeEmployeeIds: pendingRemoveIds,
            });

            await fetchMasterEmployees();
            await fetchSourceEmployees(selectionCycle, { preserveMessage: true });
            setSelectionMessage(`${addCount} employees added, ${removeCount} removed.`);
        } catch (err) {
            console.error("Failed to save selection", err);
            setSelectionMessage("Failed to save master list changes");
        } finally {
            setSelectionSaving(false);
        }
    }

    async function handleRefreshCycle() {
        if (!selectionCycle) {
            setSelectionMessage("Please select a payroll cycle");
            return;
        }

        setSelectionRefreshing(true);
        setSelectionMessage("");

        try {
            const res = await api.post("/medical-allowance/refresh-cycle", {
                cycle: selectionCycle,
            });

            setSelectionMessage(`Cycle ${selectionCycle} refreshed with ${res.data.rows} medical allowance rows.`);
            await fetchReportCycles();

            if (reportCycle === selectionCycle) {
                await fetchReportRecords();
            }
        } catch (err) {
            console.error("Failed to refresh cycle", err);
            setSelectionMessage("Failed to refresh selected cycle");
        } finally {
            setSelectionRefreshing(false);
        }
    }

    async function handleGenerateExcel() {
        if (!reportCycle) {
            setReportMessage("Please select a payroll cycle");
            return;
        }

        setReportGenerating(true);
        setReportMessage("");

        try {
            const response = await api.post(
                "/medical-allowance/generate-excel",
                {
                    cycle: reportCycle,
                    division: reportFilters.division,
                    category: reportFilters.category,
                    department: reportFilters.department,
                },
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Medical_Allowance_${reportCycle}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setReportMessage("Excel file generated successfully.");
        } catch (err) {
            console.error("Failed to generate Excel", err);
            setReportMessage("Failed to generate Excel file");
        } finally {
            setReportGenerating(false);
        }
    }


    return (
        <div className="medical-allowance-page">
            <div className="medical-allowance-page-header">
                <div>
                    <h2>Medical Allowance</h2>
                    <p>Manage the master eligibility list and generate cycle-wise allowance reports.</p>
                </div>

                <div className="medical-allowance-tab-strip">
                    <button
                        type="button"
                        className={activeTab === "report" ? "tab-btn active" : "tab-btn"}
                        onClick={() => handleTabChange("report")}
                    >
                        Report
                    </button>
                    <button
                        type="button"
                        className={activeTab === "selection" ? "tab-btn active" : "tab-btn"}
                        onClick={() => handleTabChange("selection")}
                    >
                        Employee Selection
                    </button>
                </div>
            </div>

            {activeTab === "report" ? (
                <div className="medical-allowance-section">
                    <div className="medical-allowance-controls">
                        <div className="control-group">
                            <label htmlFor="report-cycle">Payroll Cycle *</label>
                            <select
                                id="report-cycle"
                                value={reportCycle}
                                onChange={(e) => setReportCycle(e.target.value)}
                                className="select-input"
                            >
                                <option value="">-- Select Cycle --</option>
                                {reportCycles.map((cycle) => (
                                    <option
                                        key={cycle.payroll_cycle_name}
                                        value={cycle.payroll_cycle_name}
                                    >
                                        {cycle.payroll_cycle_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {reportCycle ? (
                            <div className="filters-row">
                                {reportFilterOptions.divisions.length > 0 ? (
                                    <div className="control-group">
                                        <label htmlFor="report-division">Division</label>
                                        <select
                                            id="report-division"
                                            value={reportFilters.division}
                                            onChange={(e) => handleReportFilterChange("division", e.target.value)}
                                            className="select-input"
                                        >
                                            <option value="">-- All Divisions --</option>
                                            {reportFilterOptions.divisions.map((division) => (
                                                <option key={division} value={division}>
                                                    {division}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : null}

                                {reportFilterOptions.categories.length > 0 ? (
                                    <div className="control-group">
                                        <label htmlFor="report-category">Category</label>
                                        <select
                                            id="report-category"
                                            value={reportFilters.category}
                                            onChange={(e) => handleReportFilterChange("category", e.target.value)}
                                            className="select-input"
                                        >
                                            <option value="">-- All Categories --</option>
                                            {reportFilterOptions.categories.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : null}

                                {reportFilterOptions.departments.length > 0 ? (
                                    <div className="control-group">
                                        <label htmlFor="report-department">Department</label>
                                        <select
                                            id="report-department"
                                            value={reportFilters.department}
                                            onChange={(e) => handleReportFilterChange("department", e.target.value)}
                                            className="select-input"
                                        >
                                            <option value="">-- All Departments --</option>
                                            {reportFilterOptions.departments.map((department) => (
                                                <option key={department} value={department}>
                                                    {department}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="action-buttons">
                            <button
                                type="button"
                                className="primary-btn"
                                onClick={handleGenerateExcel}
                                disabled={reportGenerating || reportRecords.length === 0}
                            >
                                {reportGenerating ? "Generating..." : "Generate Excel"}
                            </button>

                        </div>

                        {reportMessage ? (
                            <div className="message-strip">{reportMessage}</div>
                        ) : null}


                    </div>

                    {reportLoading ? (
                        <div className="empty-state">Loading records...</div>
                    ) : reportRecords.length > 0 ? (
                        <div className="table-shell">
                            <div className="table-summary">
                                <span>Total Records: <strong>{reportRecords.length}</strong></span>
                            </div>

                            <div className="table-scroll">
                                <table className="records-table">
                                    <thead>
                                        <tr>
                                            <th>Emp Code</th>
                                            <th>Employee Name</th>
                                            <th>Division</th>
                                            <th>Category</th>
                                            <th>Department</th>
                                            <th>Payable Days</th>
                                            <th>Total Basic (Cons)</th>
                                            <th>Medical Allowance Rate</th>
                                            <th>Payable Medical Allowance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportRecords.map((record) => (
                                            <tr key={`${record.employee_id}-${record.employee_code}`}>
                                                <td>{record.employee_code}</td>
                                                <td>{record.emp_name}</td>
                                                <td>{record.division_name}</td>
                                                <td>{record.category_name}</td>
                                                <td>{record.department_name}</td>
                                                <td className="numeric">{formatDecimal(record.payable_days)}</td>
                                                <td className="numeric">{formatDecimal(record.total_basic_cons)}</td>
                                                <td className="numeric">{formatWholeNumber(record.medical_allowance_rate)}</td>
                                                <td className="numeric">{formatWholeNumber(record.payable_medical_allowance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : reportCycle ? (
                        <div className="empty-state">No records found for the selected filters.</div>
                    ) : null}

                </div>
            ) : (
                <div className="medical-allowance-section">
                    <div className="medical-allowance-controls">
                        <div className="selection-control-grid">
                            <div className="control-group">
                                <label htmlFor="selection-cycle">Payroll Cycle *</label>
                                <select
                                    id="selection-cycle"
                                    value={selectionCycle}
                                    onChange={(e) => handleSelectionCycleChange(e.target.value)}
                                    className="select-input"
                                >
                                    <option value="">-- Select Cycle --</option>
                                    {selectionCycles.map((cycle) => (
                                        <option
                                            key={cycle.payroll_cycle_name}
                                            value={cycle.payroll_cycle_name}
                                        >
                                            {cycle.payroll_cycle_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-group">
                                <label htmlFor="selection-search">Search</label>
                                <input
                                    id="selection-search"
                                    type="text"
                                    className="text-input"
                                    placeholder="Employee code or name"
                                    value={selectionFilters.search}
                                    onChange={(e) => handleSelectionFilterChange("search", e.target.value)}
                                />
                            </div>

                            <div className="control-group">
                                <label htmlFor="selection-division">Division</label>
                                <select
                                    id="selection-division"
                                    value={selectionFilters.division}
                                    onChange={(e) => handleSelectionFilterChange("division", e.target.value)}
                                    className="select-input"
                                >
                                    <option value="">-- All Divisions --</option>
                                    {divisionOptions.map((division) => (
                                        <option key={division} value={division}>
                                            {division}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-group">
                                <label htmlFor="selection-category">Category</label>
                                <select
                                    id="selection-category"
                                    value={selectionFilters.category}
                                    onChange={(e) => handleSelectionFilterChange("category", e.target.value)}
                                    className="select-input"
                                >
                                    <option value="">-- All Categories --</option>
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-group">
                                <label htmlFor="selection-department">Department</label>
                                <select
                                    id="selection-department"
                                    value={selectionFilters.department}
                                    onChange={(e) => handleSelectionFilterChange("department", e.target.value)}
                                    className="select-input"
                                >
                                    <option value="">-- All Departments --</option>
                                    {departmentOptions.map((department) => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="selection-toolbar">
                            <label className="checkbox-inline">
                                <input
                                    type="checkbox"
                                    checked={selectionFilters.showSelectedOnly}
                                    onChange={(e) => handleSelectionFilterChange("showSelectedOnly", e.target.checked)}
                                />
                                <span>Show selected only</span>
                            </label>

                            <div className="selection-counters">
                                <span className="counter-chip">Available: {sourceEmployees.length}</span>
                                <span className="counter-chip">Selected in master: {selectedInCurrentCycle}</span>
                                <span className="counter-chip">Filtered: {filteredSourceEmployees.length}</span>
                                <span className="counter-chip">Master total: {masterEmployees.length}</span>
                            </div>
                        </div>

                        <div className="message-strip subtle">
                            Master list controls who is eligible. Refresh applies it to the selected cycle.
                        </div>

                        {selectionMessage ? (
                            <div className="message-strip">{selectionMessage}</div>
                        ) : null}
                    </div>

                    {selectionLoading ? (
                        <div className="empty-state">Loading employees from payslip data...</div>
                    ) : selectionCycle ? (
                        <>
                            <div className="selection-sticky-actions">
                                <div className="selection-top-actions">
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        onClick={handleSaveSelection}
                                        disabled={!hasUnsavedChanges || selectionSaving}
                                    >
                                        {selectionSaving ? "Saving..." : "Save master list changes"}
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={handleRefreshCycle}
                                        disabled={!selectionCycle || selectionRefreshing || hasUnsavedChanges}
                                    >
                                        {selectionRefreshing ? "Refreshing..." : "Refresh selected cycle"}
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost-btn"
                                        onClick={() => {
                                            clearLocalSelectionChanges();
                                            setSelectionMessage("Unsaved changes discarded.");
                                        }}
                                        disabled={!hasUnsavedChanges}
                                    >
                                        Discard unsaved changes
                                    </button>
                                </div>
                            </div>

                            <div className="selection-workspace">
                                <div className="selection-panel">
                                    <div className="selection-panel-header">
                                        <div>
                                            <h3>Employees in Selected Cycle</h3>
                                            <p>{availableEmployees.length} available after filters</p>
                                        </div>
                                    </div>

                                    <div className="selection-table-wrap">
                                        <table className="records-table compact">
                                            <thead>
                                                <tr>
                                                    <th className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                availableEmployees.length > 0 &&
                                                                checkedAvailableIds.length === availableEmployees.length
                                                            }
                                                            onChange={(e) => {
                                                                setCheckedAvailableIds(
                                                                    e.target.checked
                                                                        ? availableEmployees.map((employee) => employee.employee_id)
                                                                        : []
                                                                );
                                                            }}
                                                        />
                                                    </th>
                                                    <th>Emp Code</th>
                                                    <th>Employee Name</th>
                                                    <th>Division</th>
                                                    <th>Category</th>
                                                    <th>Department</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availableEmployees.map((employee) => (
                                                    <tr
                                                        key={employee.employee_id}
                                                        className={checkedAvailableSet.has(employee.employee_id) ? "selectable-row selected-row" : "selectable-row"}
                                                        onClick={() => toggleCheckedAvailable(employee.employee_id)}
                                                    >
                                                        <td className="checkbox-col">
                                                            <input
                                                                type="checkbox"
                                                                checked={checkedAvailableSet.has(employee.employee_id)}
                                                                readOnly
                                                            />
                                                        </td>
                                                        <td>{employee.employee_code}</td>
                                                        <td>{employee.emp_name}</td>
                                                        <td>{employee.division_name}</td>
                                                        <td>{employee.category_name}</td>
                                                        <td>{employee.department_name}</td>
                                                        <td>
                                                            <span className="status-pill inactive">Not selected</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="selection-actions-column">
                                    <div className="selection-actions-header">
                                        <h3>Actions</h3>
                                        <p>Move filtered employees between the two lists.</p>
                                    </div>

                                    <button
                                        type="button"
                                        className="primary-btn"
                                        onClick={() => applyAdd(checkedAvailableIds)}
                                        disabled={checkedAvailableIds.length === 0}
                                    >
                                        Add selected
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => applyAdd(availableEmployees.map((employee) => employee.employee_id))}
                                        disabled={availableEmployees.length === 0}
                                    >
                                        Add all filtered
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => applyRemove(checkedSelectedIds)}
                                        disabled={checkedSelectedIds.length === 0}
                                    >
                                        Remove selected
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => applyRemove(selectedEmployees.map((employee) => employee.employee_id))}
                                        disabled={selectedEmployees.length === 0}
                                    >
                                        Remove all filtered
                                    </button>
                                    <button
                                        type="button"
                                        className="ghost-btn"
                                        onClick={() => {
                                            setCheckedAvailableIds([]);
                                            setCheckedSelectedIds([]);
                                        }}
                                        disabled={checkedAvailableIds.length === 0 && checkedSelectedIds.length === 0}
                                    >
                                        Clear local selection
                                    </button>
                                </div>

                                <div className="selection-panel">
                                    <div className="selection-panel-header">
                                        <div>
                                            <h3>Selected for Medical Allowance</h3>
                                            <p>{selectedEmployees.length} selected after filters</p>
                                        </div>
                                    </div>

                                    <div className="selection-table-wrap">
                                        <table className="records-table compact">
                                            <thead>
                                                <tr>
                                                    <th className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                selectedEmployees.length > 0 &&
                                                                checkedSelectedIds.length === selectedEmployees.length
                                                            }
                                                            onChange={(e) => {
                                                                setCheckedSelectedIds(
                                                                    e.target.checked
                                                                        ? selectedEmployees.map((employee) => employee.employee_id)
                                                                        : []
                                                                );
                                                            }}
                                                        />
                                                    </th>
                                                    <th>Emp Code</th>
                                                    <th>Employee Name</th>
                                                    <th>Division</th>
                                                    <th>Category</th>
                                                    <th>Department</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedEmployees.map((employee) => (
                                                    <tr
                                                        key={employee.employee_id}
                                                        className={checkedSelectedSet.has(employee.employee_id) ? "selectable-row selected-row" : "selectable-row"}
                                                        onClick={() => toggleCheckedSelected(employee.employee_id)}
                                                    >
                                                        <td className="checkbox-col">
                                                            <input
                                                                type="checkbox"
                                                                checked={checkedSelectedSet.has(employee.employee_id)}
                                                                readOnly
                                                            />
                                                        </td>
                                                        <td>{employee.employee_code}</td>
                                                        <td>{employee.emp_name}</td>
                                                        <td>{employee.division_name}</td>
                                                        <td>{employee.category_name}</td>
                                                        <td>{employee.department_name}</td>
                                                        <td>
                                                            <span className="status-pill active">Selected</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                        </>
                    ) : (
                        <div className="empty-state">Select a payroll cycle to manage the master employee list.</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MedicalAllowanceApp;
