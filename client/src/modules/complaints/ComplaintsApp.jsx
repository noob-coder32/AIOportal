import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api";
import { showToast } from "../../utils/toast";

const STATUS_OPTIONS = ["Pending", "Completed"];
const MAIL_ACTIVE_POLL_INTERVAL_MS = 10000;
const MAIL_IDLE_POLL_INTERVAL_MS = 45000;
const COMPLAINT_MODE_OPTIONS = [
    "In Person",
    "Phone Call",
    "Email",
    "WhatsApp",
    "Portal",
    "Other",
];

const emptyForm = {
    department: "",
    description: "",
    category: "",
    complaintMode: "",
    complainantUserId: "",
    complainantName: "",
    complainantContact: "",
    adminRemarks: "",
};

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDateTimeWithSeconds(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function formatLogStatus(status) {
    if (!status) {
        return "-";
    }

    return String(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) {
        return "-";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useFilePreviews(files) {
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        if (!files.length) {
            setPreviews([]);
            return undefined;
        }

        const nextPreviews = files.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPreviews(nextPreviews);

        return () => {
            nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [files]);

    return previews;
}

function AnimatedCount({ value, duration = 500 }) {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        let frameId;
        const startValue = displayValue;
        const startTime = performance.now();

        function tick(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const nextValue = Math.round(startValue + (value - startValue) * easedProgress);

            setDisplayValue(nextValue);

            if (progress < 1) {
                frameId = window.requestAnimationFrame(tick);
            }
        }

        frameId = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [value]);

    return <span>{displayValue}</span>;
}

function ComplaintsApp() {
    const mailTimeInputRef = useRef(null);
    const createPhotoInputRef = useRef(null);
    const modalPhotoInputRef = useRef(null);
    const [formData, setFormData] = useState(emptyForm);
    const [createPhotoFiles, setCreatePhotoFiles] = useState([]);
    const [attachmentModalFiles, setAttachmentModalFiles] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        status: "",
    });
    const [rowEdits, setRowEdits] = useState({});
    const [savingRowId, setSavingRowId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [mailStatus, setMailStatus] = useState(null);
    const [mailLoading, setMailLoading] = useState(true);
    const [mailRefreshing, setMailRefreshing] = useState(false);
    const [mailAutoRefreshing, setMailAutoRefreshing] = useState(false);
    const [mailLogsLoading, setMailLogsLoading] = useState(false);
    const [mailLogs, setMailLogs] = useState([]);
    const [mailSavingSettings, setMailSavingSettings] = useState(false);
    const [mailSendingNow, setMailSendingNow] = useState(false);
    const [mailModalOpen, setMailModalOpen] = useState(false);
    const [mailSettingsForm, setMailSettingsForm] = useState({
        recipientEmail: "",
        isEnabled: false,
        sendTimeHhmm: "08:30",
    });
    const [mailSettingsDirty, setMailSettingsDirty] = useState(false);
    const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [attachmentsSaving, setAttachmentsSaving] = useState(false);
    const [attachmentsComplaint, setAttachmentsComplaint] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [attachmentsError, setAttachmentsError] = useState("");
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
    const [attachmentPreviewName, setAttachmentPreviewName] = useState("");
    const [attachmentPreviewLoading, setAttachmentPreviewLoading] = useState(false);
    const createPhotoPreviews = useFilePreviews(createPhotoFiles);
    const attachmentModalPreviews = useFilePreviews(attachmentModalFiles);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadComplaints();
    }, [filters.search, filters.category, filters.status]);

    async function loadInitialData() {
        setLoading(true);
        try {
            await Promise.all([loadComplaints(), loadUsers()]);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to load complaint data", "error");
        } finally {
            setLoading(false);
        }

        await loadMailStatus({ mode: "initial", syncForm: true });
    }

    async function loadComplaints() {
        const res = await api.get("/complaints", {
            params: {
                search: filters.search || undefined,
                category: filters.category || undefined,
                status: filters.status || undefined,
            },
        });

        const rows = res.data || [];
        setComplaints(rows);
        setRowEdits((current) => {
            const next = {};
            for (const complaint of rows) {
                next[complaint.id] = {
                    status: current[complaint.id]?.status || complaint.status,
                    adminRemarks: current[complaint.id]?.adminRemarks ?? complaint.adminRemarks ?? "",
                    complaintMode: complaint.complaintMode || "",
                };
            }
            return next;
        });
    }

    async function loadUsers() {
        const res = await api.get("/complaints/users");
        setUsers(res.data || []);
    }

    async function loadMailStatus({ mode = "manual", syncForm = false } = {}) {
        try {
            if (mode === "initial") {
                setMailLoading(true);
            } else if (mode === "auto") {
                setMailAutoRefreshing(true);
            } else {
                setMailRefreshing(true);
            }

            const res = await api.get("/complaints/mail/status");
            setMailStatus(res.data);

            if (syncForm || !mailSettingsDirty) {
                setMailSettingsForm({
                    recipientEmail: res.data?.settings?.recipientEmail || "",
                    isEnabled: Boolean(res.data?.settings?.isEnabled),
                    sendTimeHhmm: res.data?.settings?.sendTimeHhmm || "08:30",
                });
                setMailSettingsDirty(false);
            }
        } catch (error) {
            if (mode !== "auto") {
                showToast(error.response?.data?.message || "Failed to load complaint mail status", "error");
            }
        } finally {
            if (mode === "initial") {
                setMailLoading(false);
            } else if (mode === "auto") {
                setMailAutoRefreshing(false);
            } else {
                setMailRefreshing(false);
            }
        }
    }

    async function loadMailLogs({ mode = "manual" } = {}) {
        try {
            if (mode === "initial" || mode === "manual") {
                setMailLogsLoading(true);
            }

            const res = await api.get("/complaints/mail/logs", {
                params: {
                    limit: 20,
                },
            });

            setMailLogs(res.data || []);
        } catch (error) {
            if (mode !== "auto") {
                showToast(error.response?.data?.message || "Failed to load complaint mail logs", "error");
            }
        } finally {
            if (mode === "initial" || mode === "manual") {
                setMailLogsLoading(false);
            }
        }
    }

    const categoryOptions = useMemo(() => {
        const categories = new Set();
        for (const complaint of complaints) {
            if (complaint.category) {
                categories.add(complaint.category);
            }
        }
        if (formData.category) {
            categories.add(formData.category);
        }
        return [...categories].sort((a, b) => a.localeCompare(b));
    }, [complaints, formData.category]);

    const departmentOptions = useMemo(() => {
        const departments = new Set();
        for (const complaint of complaints) {
            if (complaint.department) {
                departments.add(complaint.department);
            }
        }
        if (formData.department) {
            departments.add(formData.department);
        }
        return [...departments].sort((a, b) => a.localeCompare(b));
    }, [complaints, formData.department]);

    const statusSummary = useMemo(() => {
        let pending = 0;
        let completed = 0;

        for (const complaint of complaints) {
            if (complaint.status === "Completed") {
                completed += 1;
            } else {
                pending += 1;
            }
        }

        return {
            pending,
            completed,
            total: complaints.length,
        };
    }, [complaints]);

    useEffect(() => {
        if (!mailStatus) {
            return undefined;
        }

        const isMailRunning = Boolean(mailStatus?.runtime?.isRunning);
        const timer = window.setTimeout(() => {
            loadMailStatus({ mode: "auto" });

            if (mailModalOpen || isMailRunning) {
                loadMailLogs({ mode: "auto" });
            }
        }, isMailRunning ? MAIL_ACTIVE_POLL_INTERVAL_MS : MAIL_IDLE_POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [mailStatus, mailModalOpen, mailSettingsDirty]);

    useEffect(() => {
        if (!mailModalOpen) {
            return undefined;
        }

        loadMailLogs({ mode: "initial" });
        return undefined;
    }, [mailModalOpen]);

    function handleFormChange(event) {
        const { name, value } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetCreateComplaintForm() {
        setFormData(emptyForm);
        setCreatePhotoFiles([]);

        if (createPhotoInputRef.current) {
            createPhotoInputRef.current.value = "";
        }
    }

    function handleCreatePhotoChange(event) {
        const files = Array.from(event.target.files || []);
        setCreatePhotoFiles(files);
    }

    function removeCreatePhoto(index) {
        setCreatePhotoFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
        if (createPhotoInputRef.current) {
            createPhotoInputRef.current.value = "";
        }
    }

    async function handleCreateComplaint(event) {
        event.preventDefault();
        if (saving) {
            return;
        }

        try {
            setSaving(true);
            const payload = createPhotoFiles.length > 0 ? new FormData() : {
                ...formData,
                complainantUserId: formData.complainantUserId || null,
            };

            if (payload instanceof FormData) {
                Object.entries(formData).forEach(([key, value]) => {
                    payload.append(key, value);
                });
                createPhotoFiles.forEach((file) => {
                    payload.append("photos", file);
                });
            }

            const res = await api.post("/complaints", payload);

            showToast(res.data.message || "Complaint created successfully", "success");
            resetCreateComplaintForm();
            await loadComplaints();
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to create complaint", "error");
        } finally {
            setSaving(false);
        }
    }

    function setRowEdit(id, field, value) {
        setRowEdits((current) => ({
            ...current,
            [id]: {
                ...current[id],
                [field]: value,
            },
        }));
    }

    async function handleSaveRow(complaintId) {
        const draft = rowEdits[complaintId];
        if (!draft || savingRowId) {
            return;
        }

        try {
            setSavingRowId(complaintId);
            const res = await api.put(`/complaints/${complaintId}/status`, {
                status: draft.status,
                adminRemarks: draft.adminRemarks,
            });

            showToast(res.data.message || "Complaint updated successfully", "success");
            await loadComplaints();
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to update complaint", "error");
        } finally {
            setSavingRowId(null);
        }
    }

    async function loadComplaintAttachments(complaintId) {
        setAttachmentsLoading(true);
        setAttachmentsError("");

        try {
            const res = await api.get(`/complaints/${complaintId}/attachments`);
            const rows = res.data || [];
            setAttachments(rows);
            return rows;
        } catch (error) {
            const message = error.response?.data?.message || "Failed to load complaint photos";
            setAttachmentsError(message);
            showToast(message, "error");
            setAttachments([]);
            return [];
        } finally {
            setAttachmentsLoading(false);
        }
    }

    async function openComplaintAttachments(complaint) {
        setAttachmentsComplaint(complaint);
        setAttachmentsModalOpen(true);
        setAttachmentPreviewUrl("");
        setAttachmentPreviewName("");
        setAttachmentModalFiles([]);

        if (modalPhotoInputRef.current) {
            modalPhotoInputRef.current.value = "";
        }

        const rows = await loadComplaintAttachments(complaint.id);
        if (rows.length > 0) {
            await previewComplaintAttachment(rows[0]);
        }
    }

    function closeComplaintAttachmentsModal() {
        setAttachmentsModalOpen(false);
        setAttachmentsComplaint(null);
        setAttachments([]);
        setAttachmentsError("");
        setAttachmentPreviewName("");
        setAttachmentModalFiles([]);

        if (attachmentPreviewUrl) {
            window.URL.revokeObjectURL(attachmentPreviewUrl);
            setAttachmentPreviewUrl("");
        }

        if (modalPhotoInputRef.current) {
            modalPhotoInputRef.current.value = "";
        }
    }

    function handleModalPhotoChange(event) {
        const files = Array.from(event.target.files || []);
        setAttachmentModalFiles(files);
    }

    function removeModalPhoto(index) {
        setAttachmentModalFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));

        if (modalPhotoInputRef.current) {
            modalPhotoInputRef.current.value = "";
        }
    }

    async function handleUploadComplaintPhotos() {
        if (!attachmentsComplaint || attachmentsSaving || attachmentModalFiles.length === 0) {
            return;
        }

        try {
            setAttachmentsSaving(true);
            const formData = new FormData();
            attachmentModalFiles.forEach((file) => {
                formData.append("photos", file);
            });

            const res = await api.post(`/complaints/${attachmentsComplaint.id}/attachments`, formData);
            showToast(res.data.message || "Complaint photos uploaded successfully", "success");
            setAttachmentModalFiles([]);

            if (modalPhotoInputRef.current) {
                modalPhotoInputRef.current.value = "";
            }

            const rows = await loadComplaintAttachments(attachmentsComplaint.id);
            if (rows.length > 0) {
                await previewComplaintAttachment(rows[0]);
            }

            await loadComplaints();
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to upload complaint photos", "error");
        } finally {
            setAttachmentsSaving(false);
        }
    }

    async function previewComplaintAttachment(attachment) {
        try {
            setAttachmentPreviewLoading(true);
            const res = await api.get(attachment.viewUrl || `/complaints/attachments/${attachment.id}`, {
                responseType: "blob",
            });

            if (attachmentPreviewUrl) {
                window.URL.revokeObjectURL(attachmentPreviewUrl);
            }

            const nextUrl = window.URL.createObjectURL(res.data);
            setAttachmentPreviewUrl(nextUrl);
            setAttachmentPreviewName(attachment.originalName || attachment.storedName || "Complaint photo");
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to load complaint photo", "error");
        } finally {
            setAttachmentPreviewLoading(false);
        }
    }

    useEffect(() => {
        return () => {
            if (attachmentPreviewUrl) {
                window.URL.revokeObjectURL(attachmentPreviewUrl);
            }
        };
    }, [attachmentPreviewUrl]);

    async function handleExportExcel() {
        if (exporting) {
            return;
        }

        try {
            setExporting(true);
            const response = await api.post(
                "/complaints/export-excel",
                {
                    search: filters.search,
                    category: filters.category,
                    status: filters.status,
                },
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "Complaint_Register.xlsx");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showToast("Complaint register exported successfully", "success");
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to export complaint register", "error");
        } finally {
            setExporting(false);
        }
    }

    async function handleSaveMailSettings() {
        try {
            setMailSavingSettings(true);
            const res = await api.post("/complaints/mail/settings", mailSettingsForm);
            setMailStatus({
                settings: res.data.settings,
                runtime: res.data.runtime,
            });
            setMailSettingsDirty(false);
            showToast(res.data.message || "Complaint mail settings saved", "success");
            await loadMailStatus({ mode: "manual", syncForm: true });
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to save complaint mail settings", "error");
        } finally {
            setMailSavingSettings(false);
        }
    }

    async function handleSendMailNow() {
        try {
            setMailSendingNow(true);
            const res = await api.post("/complaints/mail/send-now");
            const countsText = `Pending ${res.data.pendingCount}, Completed ${res.data.completedCount}, All ${res.data.allCount}`;
            showToast(`${res.data.message}. ${countsText}`, "success");
            await Promise.all([
                loadMailStatus({ mode: "manual" }),
                loadMailLogs({ mode: "manual" }),
            ]);
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to send complaint mail", "error");
        } finally {
            setMailSendingNow(false);
        }
    }

    function openMailTimePicker() {
        const input = mailTimeInputRef.current;
        if (!input) {
            return;
        }

        if (typeof input.showPicker === "function") {
            input.showPicker();
            return;
        }

        input.focus();
        input.click();
    }

    const mailSettings = mailStatus?.settings || {};
    const mailRuntime = mailStatus?.runtime || {};
    const isMailRunning = Boolean(mailRuntime.isRunning);
    const hasMailError = Boolean(mailSettings.lastError);
    const mailButtonLabel = isMailRunning
        ? "Sending..."
        : hasMailError
            ? "Mail Failed"
            : mailSettings.lastSuccessAt
                ? "Mail OK"
                : "Mail Idle";
    const mailButtonMeta = isMailRunning
        ? "Report dispatch is active"
        : mailSettings.isEnabled
            ? `Daily at ${mailSettings.sendTimeHhmm || "--:--"}`
            : "Scheduler is off";

    return (
        <div className="complaints-page">
            <section className="complaints-hero">
                <div className="complaints-hero-head">
                    <div>
                        <p className="complaints-eyebrow">Admin Complaint Desk</p>
                        <h2>Track and manage complaints</h2>
                        <p className="complaints-copy">
                            Log complaints manually today, while keeping the data model ready for user-submitted complaints later.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={`complaints-mail-status-btn${isMailRunning ? " is-running" : ""}${hasMailError ? " is-failed" : ""}`}
                        onClick={() => setMailModalOpen(true)}
                    >
                        <span className={`complaints-mail-status-dot${isMailRunning ? " is-pulsing" : ""}`} />
                        <span className="complaints-mail-status-copy">
                            <strong>{mailLoading ? "Mail..." : mailButtonLabel}</strong>
                            <small>{mailLoading ? "Loading scheduler status" : mailButtonMeta}</small>
                        </span>
                    </button>
                </div>

                <div className="complaints-summary-strip">
                    <article className="complaints-summary-card complaints-summary-card-pending">
                        <p>Pending</p>
                        <strong>
                            <AnimatedCount value={statusSummary.pending} />
                        </strong>
                    </article>

                    <article className="complaints-summary-card complaints-summary-card-completed">
                        <p>Completed</p>
                        <strong>
                            <AnimatedCount value={statusSummary.completed} />
                        </strong>
                    </article>

                    <article className="complaints-summary-card complaints-summary-card-total">
                        <p>Total in View</p>
                        <strong>
                            <AnimatedCount value={statusSummary.total} />
                        </strong>
                    </article>
                </div>
            </section>

            <section className="complaints-layout">
                <article className="complaints-panel">
                    <div className="complaints-panel-head">
                        <div>
                            <h3>Create Complaint</h3>
                            <p>Capture who raised the issue, what happened, and any starting remarks.</p>
                        </div>
                    </div>

                    <form className="complaints-form" onSubmit={handleCreateComplaint}>
                        <div className="complaints-grid">
                            <label>
                                <span>Department</span>
                                <input
                                    type="text"
                                    name="department"
                                    list="complaint-department-list"
                                    value={formData.department}
                                    onChange={handleFormChange}
                                    maxLength={200}
                                    required
                                />
                            </label>

                            <label>
                                <span>Category</span>
                                <input
                                    type="text"
                                    name="category"
                                    list="complaint-category-list"
                                    value={formData.category}
                                    onChange={handleFormChange}
                                    maxLength={100}
                                    required
                                />
                            </label>

                            <label>
                                <span>Mode of Complaint</span>
                                <select
                                    name="complaintMode"
                                    value={formData.complaintMode}
                                    onChange={handleFormChange}
                                    required
                                >
                                    <option value="">Select complaint mode</option>
                                    {COMPLAINT_MODE_OPTIONS.map((mode) => (
                                        <option key={mode} value={mode}>
                                            {mode}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Linked User</span>
                                <select
                                    name="complainantUserId"
                                    value={formData.complainantUserId}
                                    onChange={handleFormChange}
                                >
                                    <option value="">Select a user</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.employeeCode
                                                ? `${user.displayName} (${user.employeeCode})`
                                                : user.displayName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Complainant Name</span>
                                <input
                                    type="text"
                                    name="complainantName"
                                    value={formData.complainantName}
                                    onChange={handleFormChange}
                                    maxLength={150}
                                    placeholder="Use if the complaint is raised on behalf of someone"
                                />
                            </label>

                            <label>
                                <span>Contact / Notes</span>
                                <input
                                    type="text"
                                    name="complainantContact"
                                    value={formData.complainantContact}
                                    onChange={handleFormChange}
                                    maxLength={150}
                                    placeholder="Phone, extension, or context (optional)"
                                />
                            </label>

                            <label className="complaints-full">
                                <span>Description</span>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    rows="4"
                                    required
                                />
                            </label>

                            <label className="complaints-full">
                                <span>Admin Remarks</span>
                                <textarea
                                    name="adminRemarks"
                                    value={formData.adminRemarks}
                                    onChange={handleFormChange}
                                    rows="3"
                                    placeholder="Optional intake remarks"
                                />
                            </label>

                            <label className="complaints-full complaints-upload">
                                <span>Photos (optional)</span>
                                <input
                                    ref={createPhotoInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleCreatePhotoChange}
                                />
                                <small>Up to 5 photos, 5 MB each. You can add more later.</small>
                            </label>

                            {createPhotoPreviews.length > 0 ? (
                                <div className="complaints-photo-grid complaints-full">
                                    {createPhotoPreviews.map(({ file, url }, index) => (
                                        <article key={`${file.name}-${file.lastModified}-${index}`} className="complaints-photo-card">
                                            <div className="complaints-photo-thumb">
                                                <img src={url} alt={file.name} />
                                            </div>
                                            <div className="complaints-photo-meta">
                                                <strong>{file.name}</strong>
                                                <span>{formatFileSize(file.size)}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="complaints-photo-remove"
                                                onClick={() => removeCreatePhoto(index)}
                                            >
                                                Remove
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="complaints-actions">
                            <button type="submit" className="complaints-btn complaints-btn-primary" disabled={saving}>
                                {saving ? "Saving..." : "Create Complaint"}
                            </button>
                        </div>
                    </form>

                    <datalist id="complaint-category-list">
                        {categoryOptions.map((category) => (
                            <option key={category} value={category} />
                        ))}
                    </datalist>

                    <datalist id="complaint-department-list">
                        {departmentOptions.map((department) => (
                            <option key={department} value={department} />
                        ))}
                    </datalist>
                </article>

                <article className="complaints-panel">
                    <div className="complaints-panel-head">
                        <div>
                            <h3>Complaint Register</h3>
                            <p>Filter by text, category, or status and update the resolution state inline.</p>
                        </div>
                    </div>

                    <div className="complaints-filter-bar">
                        <input
                            type="search"
                            placeholder="Search complaint no, department, complainant, category..."
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                        />

                        <input
                            type="text"
                            list="complaint-category-list"
                            placeholder="Filter by category"
                            value={filters.category}
                            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                        />

                        <select
                            value={filters.status}
                            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        >
                            <option value="">All statuses</option>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="complaints-btn complaints-btn-secondary"
                            onClick={() => setFilters({ search: "", category: "", status: "" })}
                        >
                            Clear Filters
                        </button>

                        <button
                            type="button"
                            className="complaints-btn complaints-btn-primary"
                            onClick={handleExportExcel}
                            disabled={exporting}
                        >
                            {exporting ? "Exporting..." : "Export Excel"}
                        </button>
                    </div>

                    <div className="complaints-table-wrap">
                        <table className="complaints-table">
                            <thead>
                                <tr>
                                    <th>Complaint No</th>
                                    <th>Department</th>
                                    <th>Category</th>
                                    <th>Mode</th>
                                    <th>Complainant</th>
                                    <th>Status</th>
                                    <th>Created By Username</th>
                                    <th>Photos</th>
                                    <th>Created</th>
                                    <th>Resolved</th>
                                    <th>Admin Remarks</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loading && complaints.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="complaints-empty">
                                            No complaints found
                                        </td>
                                    </tr>
                                ) : (
                                    complaints.map((complaint) => {
                                        const draft = rowEdits[complaint.id] || {
                                            status: complaint.status,
                                            adminRemarks: complaint.adminRemarks || "",
                                            complaintMode: complaint.complaintMode || "",
                                        };

                                        return (
                                            <tr key={complaint.id}>
                                                <td>{complaint.complaintNo}</td>
                                                <td>
                                                    <strong>{complaint.department || "-"}</strong>
                                                    <p>{complaint.description}</p>
                                                </td>
                                                <td>{complaint.category}</td>
                                                <td>{complaint.complaintMode || "-"}</td>
                                                <td>
                                                    <strong>{complaint.complainantDisplayName}</strong>
                                                    {complaint.complainantContact ? <p>{complaint.complainantContact}</p> : null}
                                                </td>
                                                <td>
                                                    <select
                                                        value={draft.status}
                                                        onChange={(event) => setRowEdit(complaint.id, "status", event.target.value)}
                                                    >
                                                        {STATUS_OPTIONS.map((status) => (
                                                            <option key={status} value={status}>
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>{complaint.createdByUsername || "-"}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="complaints-btn complaints-btn-secondary complaints-photo-action"
                                                        onClick={() => openComplaintAttachments(complaint)}
                                                    >
                                                        {complaint.attachmentCount > 0
                                                            ? `View/Add photos (${complaint.attachmentCount})`
                                                            : "Add photos"}
                                                    </button>
                                                </td>
                                                <td>{formatDateTime(complaint.createdAt)}</td>
                                                <td>{formatDateTime(complaint.resolvedAt)}</td>
                                                <td>
                                                    <textarea
                                                        value={draft.adminRemarks}
                                                        rows="3"
                                                        onChange={(event) =>
                                                            setRowEdit(complaint.id, "adminRemarks", event.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="complaints-btn complaints-btn-primary"
                                                        disabled={savingRowId === complaint.id}
                                                        onClick={() => handleSaveRow(complaint.id)}
                                                    >
                                                        {savingRowId === complaint.id ? "Saving..." : "Save"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>

            {attachmentsModalOpen && attachmentsComplaint ? (
                <div className="complaints-attachments-modal-overlay" onClick={closeComplaintAttachmentsModal}>
                    <div
                        className="complaints-attachments-modal"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="complaints-attachments-modal-head">
                            <div>
                                <p className="complaints-attachments-modal-eyebrow">Complaint Photos</p>
                                <h3>{attachmentsComplaint.complaintNo || "Complaint"}</h3>
                                <p>
                                    {attachmentsComplaint.department || "-"}{" "}
                                    {attachmentsComplaint.category ? `• ${attachmentsComplaint.category}` : ""}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="complaints-mail-close-btn"
                                onClick={closeComplaintAttachmentsModal}
                            >
                                Close
                            </button>
                        </div>

                        <div className="complaints-attachments-modal-body">
                            <section className="complaints-attachments-upload-panel">
                                <div className="complaints-panel-head complaints-attachments-panel-head">
                                    <div>
                                        <h3>Add More Photos</h3>
                                        <p>Upload additional images to keep the complaint record complete.</p>
                                    </div>
                                </div>

                                <div className="complaints-attachments-upload">
                                    <label className="complaints-upload">
                                        <span>Select photos</span>
                                        <input
                                            ref={modalPhotoInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleModalPhotoChange}
                                        />
                                        <small>Up to 5 images at a time, 5 MB each.</small>
                                    </label>

                                    {attachmentModalPreviews.length > 0 ? (
                                        <div className="complaints-photo-grid complaints-photo-grid-tight">
                                            {attachmentModalPreviews.map(({ file, url }, index) => (
                                                <article key={`${file.name}-${file.lastModified}-${index}`} className="complaints-photo-card">
                                                    <div className="complaints-photo-thumb">
                                                        <img src={url} alt={file.name} />
                                                    </div>
                                                    <div className="complaints-photo-meta">
                                                        <strong>{file.name}</strong>
                                                        <span>{formatFileSize(file.size)}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="complaints-photo-remove"
                                                        onClick={() => removeModalPhoto(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                </article>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="complaints-actions complaints-attachments-actions">
                                        <button
                                            type="button"
                                            className="complaints-btn complaints-btn-secondary"
                                            onClick={() => loadComplaintAttachments(attachmentsComplaint.id)}
                                            disabled={attachmentsLoading || attachmentsSaving}
                                        >
                                            {attachmentsLoading ? "Refreshing..." : "Refresh Photos"}
                                        </button>

                                        <button
                                            type="button"
                                            className="complaints-btn complaints-btn-primary"
                                            onClick={handleUploadComplaintPhotos}
                                            disabled={attachmentsSaving || attachmentModalFiles.length === 0}
                                        >
                                            {attachmentsSaving ? "Uploading..." : "Upload Photos"}
                                        </button>
                                    </div>

                                    {attachmentsError ? <p className="complaints-upload-note is-error">{attachmentsError}</p> : null}
                                </div>
                            </section>

                            <section className="complaints-attachments-preview-panel">
                                <div className="complaints-panel-head complaints-attachments-panel-head">
                                    <div>
                                        <h3>Existing Photos</h3>
                                        <p>Click a thumbnail to preview the image here.</p>
                                    </div>
                                </div>

                                {attachmentsLoading ? (
                                    <div className="complaints-empty">Loading complaint photos...</div>
                                ) : attachments.length === 0 ? (
                                    <div className="complaints-empty">No photos have been attached yet.</div>
                                ) : (
                                    <div className="complaints-attachments-list">
                                        {attachments.map((attachment) => (
                                            <button
                                                key={attachment.id}
                                                type="button"
                                                className="complaints-attachment-item"
                                                onClick={() => previewComplaintAttachment(attachment)}
                                            >
                                                <span className="complaints-attachment-item-thumb">Photo</span>
                                                <span className="complaints-attachment-item-meta">
                                                    <strong>{attachment.originalName || "Complaint photo"}</strong>
                                                    <small>{formatFileSize(attachment.fileSize)}</small>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="complaints-attachment-preview">
                                    <div className="complaints-attachment-preview-head">
                                        <strong>Preview</strong>
                                        <span>{attachmentPreviewName || "Select a photo to preview it"}</span>
                                    </div>

                                    {attachmentPreviewLoading ? (
                                        <div className="complaints-empty">Loading preview...</div>
                                    ) : attachmentPreviewUrl ? (
                                        <img src={attachmentPreviewUrl} alt={attachmentPreviewName || "Complaint photo preview"} />
                                    ) : (
                                        <div className="complaints-attachment-preview-empty">
                                            Choose a photo from the list to view it here.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            ) : null}

            {mailModalOpen ? (
                <div className="complaints-mail-modal-overlay" onClick={() => setMailModalOpen(false)}>
                    <div className="complaints-mail-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="complaints-mail-modal-head">
                            <div>
                                <p className="complaints-mail-modal-eyebrow">Daily Complaints Mail</p>
                                <h3>Scheduler and delivery logs</h3>
                                <p>Set the delivery time, review the last run, or trigger a manual send.</p>
                            </div>

                            <button
                                type="button"
                                className="complaints-mail-close-btn"
                                onClick={() => setMailModalOpen(false)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="complaints-mail-settings-grid">
                            <label className="complaints-mail-field complaints-mail-field-wide">
                                <span>Recipient Emails</span>
                                <input
                                    type="text"
                                    value={mailSettingsForm.recipientEmail}
                                    onChange={(event) => {
                                        setMailSettingsDirty(true);
                                        setMailSettingsForm((current) => ({
                                            ...current,
                                            recipientEmail: event.target.value,
                                        }));
                                    }}
                                    placeholder="head@example.com, qa@example.com"
                                />
                            </label>

                            <label className="complaints-mail-field">
                                <span>Daily Send Time</span>
                                <div className="complaints-time-input-wrap">
                                    <input
                                        ref={mailTimeInputRef}
                                        type="time"
                                        value={mailSettingsForm.sendTimeHhmm}
                                        onChange={(event) => {
                                            setMailSettingsDirty(true);
                                            setMailSettingsForm((current) => ({
                                                ...current,
                                                sendTimeHhmm: event.target.value,
                                            }));
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="complaints-time-input-trigger"
                                        onClick={openMailTimePicker}
                                        aria-label="Open time picker"
                                    >
                                        <svg viewBox="0 0 24 24" focusable="false">
                                            <circle cx="12" cy="12" r="8.5" />
                                            <path d="M12 7.5v5l3.5 2" />
                                        </svg>
                                    </button>
                                </div>
                            </label>

                            <label className="complaints-mail-toggle">
                                <span>Scheduler Enabled</span>
                                <input
                                    type="checkbox"
                                    checked={mailSettingsForm.isEnabled}
                                    onChange={(event) => {
                                        setMailSettingsDirty(true);
                                        setMailSettingsForm((current) => ({
                                            ...current,
                                            isEnabled: event.target.checked,
                                        }));
                                    }}
                                />
                            </label>
                        </div>

                        <div className="complaints-mail-actions">
                            <button
                                type="button"
                                className="complaints-btn complaints-btn-secondary"
                                onClick={() => loadMailStatus({ mode: "manual", syncForm: !mailSettingsDirty })}
                                disabled={mailRefreshing || mailSavingSettings || mailSendingNow}
                            >
                                {mailRefreshing ? "Refreshing..." : "Refresh Status"}
                            </button>

                            <button
                                type="button"
                                className="complaints-btn complaints-btn-secondary"
                                onClick={handleSaveMailSettings}
                                disabled={mailLoading || mailSavingSettings || mailSendingNow}
                            >
                                {mailSavingSettings ? "Saving..." : "Save Schedule"}
                            </button>

                            <button
                                type="button"
                                className="complaints-btn complaints-btn-primary"
                                onClick={handleSendMailNow}
                                disabled={mailLoading || mailSavingSettings || mailSendingNow}
                            >
                                {mailSendingNow ? "Sending..." : "Send Now"}
                            </button>
                        </div>

                        <div className={`complaints-mail-live-strip${isMailRunning ? " is-running" : ""}`}>
                            <span className={`complaints-mail-live-indicator${isMailRunning || mailAutoRefreshing ? " is-pulsing" : ""}`} />
                            <div>
                                <strong>{isMailRunning ? "Mail dispatch in progress" : "Scheduler status"}</strong>
                                <p>
                                    {isMailRunning
                                        ? "The backend is currently preparing or sending the daily complaints reports."
                                        : "This screen refreshes mail status automatically while the complaints module stays open."}
                                </p>
                            </div>
                        </div>

                        <div className="complaints-mail-status-grid">
                            <div>
                                <span>Recipients</span>
                                <strong>{mailSettings.recipientEmail || "-"}</strong>
                            </div>
                            <div>
                                <span>Next Run</span>
                                <strong>{formatDateTimeWithSeconds(mailRuntime.nextRunAt)}</strong>
                            </div>
                            <div>
                                <span>Last Run</span>
                                <strong>{formatDateTimeWithSeconds(mailSettings.lastRunAt)}</strong>
                            </div>
                            <div>
                                <span>Last Success</span>
                                <strong>{formatDateTimeWithSeconds(mailSettings.lastSuccessAt)}</strong>
                            </div>
                            <div className="complaints-mail-status-wide">
                                <span>Last Error</span>
                                <strong className={mailSettings.lastError ? "is-error" : ""}>
                                    {mailSettings.lastError || "-"}
                                </strong>
                            </div>
                        </div>

                        <div className="complaints-mail-log-card">
                            <div className="complaints-panel-head complaints-mail-log-head">
                                <div>
                                    <h3>Recent Mail Runs</h3>
                                    <p>Each row shows one scheduled or manual complaints report send attempt.</p>
                                </div>

                                <button
                                    type="button"
                                    className="complaints-btn complaints-btn-secondary"
                                    onClick={() => loadMailLogs({ mode: "manual" })}
                                    disabled={mailLogsLoading}
                                >
                                    {mailLogsLoading ? "Refreshing..." : "Refresh Logs"}
                                </button>
                            </div>

                            {mailLogsLoading ? (
                                <div className="complaints-empty">Loading complaint mail logs...</div>
                            ) : mailLogs.length === 0 ? (
                                <div className="complaints-empty">No complaint mail runs recorded yet.</div>
                            ) : (
                                <div className="complaints-table-wrap complaints-mail-log-wrap">
                                    <table className="complaints-table complaints-mail-log-table">
                                        <thead>
                                            <tr>
                                                <th>Mode</th>
                                                <th>Status</th>
                                                <th>Recipient</th>
                                                <th>Started</th>
                                                <th>Finished</th>
                                                <th>Pending</th>
                                                <th>Completed</th>
                                                <th>All</th>
                                                <th>Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mailLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>{formatLogStatus(log.run_mode)}</td>
                                                    <td>
                                                        <span className={`complaints-mail-log-pill is-${log.status}`}>
                                                            {formatLogStatus(log.status)}
                                                        </span>
                                                    </td>
                                                    <td>{log.recipient_email || "-"}</td>
                                                    <td>{formatDateTimeWithSeconds(log.started_at)}</td>
                                                    <td>{formatDateTimeWithSeconds(log.finished_at)}</td>
                                                    <td>{log.pending_count}</td>
                                                    <td>{log.completed_count}</td>
                                                    <td>{log.all_count}</td>
                                                    <td>{log.error_message || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default ComplaintsApp;
