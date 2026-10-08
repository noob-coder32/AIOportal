import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";
import "./coilDetails.css";

const FIELD_GROUPS = [
    {
        key: "thickness",
        label: "Thickness",
        inputType: "number",
        step: "0.0001",
    },
    {
        key: "item_code",
        label: "Item Code",
        inputType: "text",
    },
    {
        key: "output_qty",
        label: "Output Qty",
        inputType: "number",
        step: "0.001",
    },
    {
        key: "output_width",
        label: "Output Width",
        inputType: "number",
        step: "0.001",
    },
    {
        key: "output_length",
        label: "Output Length",
        inputType: "number",
        step: "0.001",
    },
    {
        key: "output_grade",
        label: "Output Grade",
        inputType: "text",
    },
    {
        key: "output_bw",
        label: "Output B-W",
        inputType: "number",
        step: "0.001",
    },
    {
        key: "output_logo",
        label: "Output Logo",
        inputType: "text",
    },
    {
        key: "output_print_thickness",
        label: "Output Print Thickness",
        inputType: "text",
    },
    {
        key: "output_remarks",
        label: "Output Remarks",
        inputType: "text",
    }
];

const EMPTY_ENTRY_FORM = FIELD_GROUPS.reduce(
    (form, field) => ({
        ...form,
        [`existing_${field.key}`]: "",
        [`to_be_${field.key}`]: "",
    }),
    {
        coil_no: "",
        division_code: "",
        production_line: "",
    }
);

const EMPTY_SEARCH_FORM = {
    coil_no: "",
    division_code: "",
    production_line: "",
};

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function CoilDetailsApp() {
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
    const [searchForm, setSearchForm] = useState(EMPTY_SEARCH_FORM);
    const [recentEntries, setRecentEntries] = useState([]);
    const [searchResults, setSearchResults] = useState({
        latest: null,
        history: [],
    });
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const entryProductionLines = useMemo(() => {
        const selectedDivision = divisionOptions.find(
            (division) => division.value === entryForm.division_code
        );

        return selectedDivision?.productionLines || [];
    }, [divisionOptions, entryForm.division_code]);

    const searchProductionLines = useMemo(() => {
        const selectedDivision = divisionOptions.find(
            (division) => division.value === searchForm.division_code
        );

        return selectedDivision?.productionLines || [];
    }, [divisionOptions, searchForm.division_code]);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setIsInitialLoading(true);
            const [optionsRes, recentRes] = await Promise.all([
                api.get("/coil-details/options"),
                api.get("/coil-details/recent"),
            ]);

            setDivisionOptions(optionsRes.data.divisions || []);
            setRecentEntries(recentRes.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load coil details module", "error");
        } finally {
            setIsInitialLoading(false);
        }
    }

    async function fetchRecentEntries() {
        try {
            const res = await api.get("/coil-details/recent");
            setRecentEntries(res.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to refresh recent entries", "error");
        }
    }

    async function runSearch(overrides = {}) {
        const nextSearch = {
            ...searchForm,
            ...overrides,
        };

        const coilNo = nextSearch.coil_no.trim();

        if (!coilNo) {
            showToast("Enter a coil number to search", "error");
            return;
        }

        try {
            setIsSearching(true);
            const res = await api.get("/coil-details/search", {
                params: {
                    coil_no: coilNo,
                    division: nextSearch.division_code || undefined,
                    production_line: nextSearch.production_line || undefined,
                },
            });

            setSearchResults(res.data);
            setHasSearched(true);
        } catch (err) {
            setSearchResults({
                latest: null,
                history: [],
            });
            setHasSearched(true);
            showToast(err.response?.data?.message || "Failed to search coil details", "error");
        } finally {
            setIsSearching(false);
        }
    }

    function handleEntrySelectorChange(field, value) {
        setEntryForm((current) => ({
            ...current,
            [field]: value,
            ...(field === "division_code" ? { production_line: "" } : {}),
        }));
    }

    function handleSearchSelectorChange(field, value) {
        setSearchForm((current) => ({
            ...current,
            [field]: value,
            ...(field === "division_code" ? { production_line: "" } : {}),
        }));
    }

    function handleEntryValueChange(field, value) {
        setEntryForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setIsSubmitting(true);

            await api.post("/coil-details", {
                ...entryForm,
                coil_no: entryForm.coil_no.trim(),
            });

            showToast("Coil details saved successfully", "success");

            const savedSearch = {
                coil_no: entryForm.coil_no.trim(),
                division_code: entryForm.division_code,
                production_line: entryForm.production_line,
            };

            setEntryForm(EMPTY_ENTRY_FORM);
            setSearchForm(savedSearch);

            await Promise.all([
                fetchRecentEntries(),
                runSearch(savedSearch),
            ]);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to save coil details", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    function renderFieldRow(field) {
        return (
            <div key={field.key} className="coil-details-row">
                <div className="coil-details-label-cell">
                    <span>{field.label}</span>
                </div>

                <div className="coil-details-input-cell">
                    <input
                        type={field.inputType}
                        step={field.step}
                        value={entryForm[`existing_${field.key}`]}
                        onChange={(event) =>
                            handleEntryValueChange(`existing_${field.key}`, event.target.value)
                        }
                        placeholder={`Existing ${field.label}`}
                    />
                </div>

                <div className="coil-details-input-cell">
                    <input
                        type={field.inputType}
                        step={field.step}
                        value={entryForm[`to_be_${field.key}`]}
                        onChange={(event) =>
                            handleEntryValueChange(`to_be_${field.key}`, event.target.value)
                        }
                        placeholder={`To Be ${field.label}`}
                    />
                </div>
            </div>
        );
    }

    function renderSnapshotCard(record, title, accentClass = "") {
        if (!record) {
            return null;
        }

        return (
            <article className={`coil-details-result-card ${accentClass}`.trim()} key={`${title}-${record.id}`}>
                <div className="coil-details-result-header">
                    <div>
                        <h4>{title}</h4>
                        <p>
                            Saved by {record.created_by_name || "-"} on {formatDateTime(record.created_on)}
                        </p>
                    </div>

                    <div className="coil-details-chip-row">
                        <span className="coil-details-chip">{record.coil_no}</span>
                        <span className="coil-details-chip coil-details-chip-muted">{record.division_code}</span>
                        <span className="coil-details-chip coil-details-chip-muted">{record.production_line}</span>
                    </div>
                </div>

                <div className="coil-details-summary-grid">
                    <div className="coil-details-summary-head">Field</div>
                    <div className="coil-details-summary-head">Existing</div>
                    <div className="coil-details-summary-head">To Be</div>

                    {FIELD_GROUPS.map((field) => (
                        <div className="coil-details-summary-row" key={`${record.id}-${field.key}`}>
                            <div className="coil-details-summary-label">{field.label}</div>
                            <div className="coil-details-summary-value">{record[`existing_${field.key}`]}</div>
                            <div className="coil-details-summary-value">{record[`to_be_${field.key}`]}</div>
                        </div>
                    ))}
                </div>
            </article>
        );
    }

    return (
        <div className="coil-details-page">
            <div className="coil-details-shell">
                <section className="coil-details-hero">
                    <div>
                        <p className="coil-details-eyebrow">Coil Detail Snapshots</p>
                        <h1>Capture current values and to-be values</h1>
                        <p className="coil-details-hero-copy">
                            Save full coil details division-wise and production line-wise, then search the saved
                            history in a readable comparison card.
                        </p>
                    </div>
                </section>

                <form className="coil-details-panel coil-details-entry-panel" onSubmit={handleSubmit}>
                    <div className="coil-details-panel-header">
                        <div>
                            <h3>Selection</h3>
                            <p>Choose the coil, division, and production line before entering comparison values.</p>
                        </div>
                    </div>

                    <div className="coil-details-selector-grid">
                        <div className="coil-details-field">
                            <label htmlFor="coil_no">Coil No</label>
                            <input
                                id="coil_no"
                                type="text"
                                value={entryForm.coil_no}
                                onChange={(event) => handleEntrySelectorChange("coil_no", event.target.value)}
                                placeholder="Enter coil number"
                            />
                        </div>

                        <div className="coil-details-field">
                            <label htmlFor="division_code">Division</label>
                            <select
                                id="division_code"
                                value={entryForm.division_code}
                                onChange={(event) => handleEntrySelectorChange("division_code", event.target.value)}
                            >
                                <option value="">Select division</option>
                                {divisionOptions.map((division) => (
                                    <option key={division.value} value={division.value}>
                                        {division.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="coil-details-field">
                            <label htmlFor="production_line">Production Line</label>
                            <select
                                id="production_line"
                                value={entryForm.production_line}
                                onChange={(event) => handleEntrySelectorChange("production_line", event.target.value)}
                                disabled={!entryForm.division_code}
                            >
                                <option value="">Select production line</option>
                                {entryProductionLines.map((line) => (
                                    <option key={line.value} value={line.value}>
                                        {line.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="coil-details-comparison-card">
                        <div className="coil-details-comparison-head">
                            <div className="coil-details-label-spacer">Field</div>
                            <div className="coil-details-column-title">Existing</div>
                            <div className="coil-details-column-title">To Be</div>
                        </div>

                        <div className="coil-details-comparison-grid">
                            {FIELD_GROUPS.map(renderFieldRow)}
                        </div>
                    </div>

                    <div className="coil-details-actions">
                        <button type="submit" className="coil-details-primary-btn" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Coil Details"}
                        </button>
                    </div>
                </form>

                <section className="coil-details-panel">
                    <div className="coil-details-panel-header">
                        <div>
                            <h3>Find Coil Info</h3>
                            <p>Search by coil number and narrow the results by division and line if needed.</p>
                        </div>
                    </div>

                    <div className="coil-details-search-grid">
                        <div className="coil-details-field">
                            <label htmlFor="search_coil_no">Coil No</label>
                            <input
                                id="search_coil_no"
                                type="text"
                                value={searchForm.coil_no}
                                onChange={(event) => handleSearchSelectorChange("coil_no", event.target.value)}
                                placeholder="Search coil number"
                            />
                        </div>

                        <div className="coil-details-field">
                            <label htmlFor="search_division">Division</label>
                            <select
                                id="search_division"
                                value={searchForm.division_code}
                                onChange={(event) => handleSearchSelectorChange("division_code", event.target.value)}
                            >
                                <option value="">All divisions</option>
                                {divisionOptions.map((division) => (
                                    <option key={division.value} value={division.value}>
                                        {division.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="coil-details-field">
                            <label htmlFor="search_line">Production Line</label>
                            <select
                                id="search_line"
                                value={searchForm.production_line}
                                onChange={(event) => handleSearchSelectorChange("production_line", event.target.value)}
                                disabled={!searchForm.division_code}
                            >
                                <option value="">All production lines</option>
                                {searchProductionLines.map((line) => (
                                    <option key={line.value} value={line.value}>
                                        {line.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="coil-details-search-actions">
                            <button
                                type="button"
                                className="coil-details-secondary-btn"
                                onClick={() => runSearch()}
                                disabled={isSearching}
                            >
                                {isSearching ? "Finding..." : "Find Coil"}
                            </button>
                        </div>
                    </div>

                    <div className="coil-details-results">
                        {!hasSearched ? (
                            <div className="coil-details-empty-state">
                                Search for a coil to view the latest saved snapshot and full history.
                            </div>
                        ) : !searchResults.latest ? (
                            <div className="coil-details-empty-state">
                                No matching coil details found for the selected search filters.
                            </div>
                        ) : (
                            <>
                                {renderSnapshotCard(searchResults.latest, "Latest Snapshot", "is-featured")}

                                <div className="coil-details-history-header">
                                    <h4>Older Snapshots</h4>
                                    <span>{searchResults.history.length} found</span>
                                </div>

                                {searchResults.history.length === 0 ? (
                                    <div className="coil-details-empty-state">
                                        No older snapshots for this coil selection yet.
                                    </div>
                                ) : (
                                    <div className="coil-details-history-stack">
                                        {searchResults.history.map((record, index) =>
                                            renderSnapshotCard(record, `History ${index + 1}`)
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <section className="coil-details-panel">
                    <div className="coil-details-panel-header">
                        <div>
                            <h3>Recent Entries</h3>
                            <p>Quick visibility into the most recently saved coil detail snapshots.</p>
                        </div>
                        <span className="coil-details-count-chip">{recentEntries.length} recent</span>
                    </div>

                    {isInitialLoading ? (
                        <div className="coil-details-empty-state">Loading module data...</div>
                    ) : recentEntries.length === 0 ? (
                        <div className="coil-details-empty-state">No coil detail entries have been saved yet.</div>
                    ) : (
                        <div className="coil-details-recent-grid">
                            {recentEntries.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className="coil-details-recent-card"
                                    onClick={() => {
                                        const nextSearch = {
                                            coil_no: entry.coil_no,
                                            division_code: entry.division_code,
                                            production_line: entry.production_line,
                                        };

                                        setSearchForm(nextSearch);
                                        runSearch(nextSearch);
                                    }}
                                >
                                    <div className="coil-details-recent-top">
                                        <span className="coil-details-chip">{entry.coil_no}</span>
                                        <span className="coil-details-recent-time">{formatDateTime(entry.created_on)}</span>
                                    </div>
                                    <div className="coil-details-recent-meta">
                                        <span>{entry.division_code}</span>
                                        <span>{entry.production_line}</span>
                                    </div>
                                    <div className="coil-details-recent-flow">
                                        <strong>{entry.existing_item_code}</strong>
                                        <span>to</span>
                                        <strong>{entry.to_be_item_code}</strong>
                                    </div>
                                    <p>
                                        Grade {entry.existing_output_grade} to {entry.to_be_output_grade}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default CoilDetailsApp;
