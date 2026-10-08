const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const complaintsDb = require("../../db/complaints.db");
const { generateComplaintsRegisterExcel } = require("./excel.generator");
const complaintsMailService = require("../../services/complaintsMail.service");

const router = express.Router();
const ATTACHMENTS_DIR = path.join(__dirname, "output", "attachments");
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_FILES = 5;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
]);

const VALID_STATUSES = new Set(["Pending", "Completed"]);

fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

function cleanText(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function isMultipartRequest(req) {
    return String(req.headers["content-type"] || "").toLowerCase().includes("multipart/form-data");
}

function makeStoredFileName(originalName) {
    const safeExt = path.extname(originalName || "").toLowerCase();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueId = `${stamp}-${Math.random().toString(36).slice(2, 10)}`;
    return `complaint-${uniqueId}${safeExt}`;
}

function buildStoredAttachmentPath(fileName) {
    return path.join(ATTACHMENTS_DIR, fileName);
}

const uploadMiddleware = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, ATTACHMENTS_DIR);
        },
        filename: (_req, file, cb) => {
            cb(null, makeStoredFileName(file.originalname));
        },
    }),
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
            cb(new Error("Only image files are allowed"));
            return;
        }

        cb(null, true);
    },
    limits: {
        fileSize: MAX_ATTACHMENT_SIZE_BYTES,
        files: MAX_ATTACHMENT_FILES,
    },
});

function runUpload(req, res) {
    return new Promise((resolve, reject) => {
        uploadMiddleware.array("photos", MAX_ATTACHMENT_FILES)(req, res, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(req.files || []);
        });
    });
}

async function parseComplaintUploads(req, res) {
    if (!isMultipartRequest(req)) {
        return [];
    }

    return runUpload(req, res);
}

async function cleanupUploadedFiles(files = []) {
    await Promise.all(
        files.map(async (file) => {
            if (!file?.path) {
                return;
            }

            try {
                await fs.promises.unlink(file.path);
            } catch (_error) {
                // Ignore cleanup failures so the original request error can surface.
            }
        })
    );
}

function normalizeUploadFiles(files, uploadedByUserId) {
    return (files || []).map((file) => ({
        originalName: file.originalname,
        storedName: file.filename,
        storedPath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedByUserId,
    }));
}

function getAttachmentDownloadName(attachment) {
    return attachment.originalName || attachment.storedName || "complaint-attachment";
}

function isUploadValidationError(error) {
    return [
        "LIMIT_FILE_SIZE",
        "LIMIT_FILE_COUNT",
        "LIMIT_UNEXPECTED_FILE",
    ].includes(error?.code)
        || /Only image files are allowed|file too large/i.test(error?.message || "");
}

function getAuthenticatedUserId(req) {
    const userId = Number(req.user?.id);
    return Number.isInteger(userId) ? userId : null;
}

async function sendAttachmentResponse(res, attachment, { download = false } = {}) {
    if (!attachment?.storedPath || !fs.existsSync(attachment.storedPath)) {
        return res.status(404).json({ message: "Attachment file not found" });
    }

    if (download) {
        res.attachment(getAttachmentDownloadName(attachment));
    } else {
        res.setHeader("Content-Disposition", `inline; filename="${getAttachmentDownloadName(attachment)}"`);
    }

    res.type(attachment.mimeType || "application/octet-stream");
    return res.sendFile(path.resolve(attachment.storedPath));
}

router.get("/", async (req, res) => {
    try {
        const rows = await complaintsDb.getComplaints({
            search: cleanText(req.query.search),
            category: cleanText(req.query.category),
            status: cleanText(req.query.status),
        });

        res.json(rows);
    } catch (error) {
        console.error("Complaints list error:", error);
        res.status(500).json({ message: "Failed to fetch complaints" });
    }
});

router.get("/users", async (req, res) => {
    try {
        const users = await complaintsDb.getComplaintUsers();
        res.json(users);
    } catch (error) {
        console.error("Complaint users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

router.get("/:id/attachments", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid complaint id" });
    }

    try {
        const complaint = await complaintsDb.getComplaintById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const attachments = await complaintsDb.getComplaintAttachments(id);
        res.json(
            attachments.map((attachment) => ({
                ...attachment,
                downloadUrl: `/complaints/attachments/${attachment.id}/download`,
                viewUrl: `/complaints/attachments/${attachment.id}`,
            }))
        );
    } catch (error) {
        console.error("Complaint attachments list error:", error);
        res.status(500).json({ message: "Failed to fetch complaint attachments" });
    }
});

router.post("/:id/attachments", async (req, res) => {
    const complaintId = Number(req.params.id);
    const uploadedByUserId = getAuthenticatedUserId(req);

    if (!Number.isInteger(complaintId)) {
        return res.status(400).json({ message: "Invalid complaint id" });
    }

    if (!uploadedByUserId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    let uploadedFiles = [];

    try {
        uploadedFiles = await parseComplaintUploads(req, res);

        if (!uploadedFiles.length) {
            return res.status(400).json({ message: "Select at least one image to upload" });
        }

        const attachments = normalizeUploadFiles(uploadedFiles, req.user?.id || null);
        const savedAttachments = await complaintsDb.addComplaintAttachments({
            complaintId,
            attachments,
            uploadedByUserId,
        });

        if (!savedAttachments) {
            await cleanupUploadedFiles(uploadedFiles);
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(201).json({
            message: "Complaint photos uploaded successfully",
            attachments: savedAttachments.map((attachment) => ({
                ...attachment,
                downloadUrl: `/complaints/attachments/${attachment.id}/download`,
                viewUrl: `/complaints/attachments/${attachment.id}`,
            })),
        });
    } catch (error) {
        await cleanupUploadedFiles(uploadedFiles);
        console.error("Complaint attachment upload error:", error);
        const statusCode = isUploadValidationError(error)
            ? 400
            : 500;
        res.status(statusCode).json({ message: error.message || "Failed to upload complaint photos" });
    }
});

router.get("/attachments/:attachmentId", async (req, res) => {
    const attachmentId = Number(req.params.attachmentId);

    if (!Number.isInteger(attachmentId)) {
        return res.status(400).json({ message: "Invalid attachment id" });
    }

    try {
        const attachment = await complaintsDb.getComplaintAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ message: "Attachment not found" });
        }

        return sendAttachmentResponse(res, attachment, { download: false });
    } catch (error) {
        console.error("Complaint attachment view error:", error);
        res.status(500).json({ message: "Failed to load complaint attachment" });
    }
});

router.get("/attachments/:attachmentId/download", async (req, res) => {
    const attachmentId = Number(req.params.attachmentId);

    if (!Number.isInteger(attachmentId)) {
        return res.status(400).json({ message: "Invalid attachment id" });
    }

    try {
        const attachment = await complaintsDb.getComplaintAttachmentById(attachmentId);
        if (!attachment) {
            return res.status(404).json({ message: "Attachment not found" });
        }

        return sendAttachmentResponse(res, attachment, { download: true });
    } catch (error) {
        console.error("Complaint attachment download error:", error);
        res.status(500).json({ message: "Failed to download complaint attachment" });
    }
});

router.get("/mail/status", async (req, res) => {
    try {
        const snapshot = await complaintsMailService.getStatus();
        res.json(snapshot);
    } catch (error) {
        console.error("Complaint mail status error:", error);
        res.status(500).json({ message: error.message || "Failed to load complaint mail status" });
    }
});

router.get("/mail/logs", async (req, res) => {
    try {
        const logs = await complaintsMailService.getLogs(Number(req.query.limit) || 20);
        res.json(logs);
    } catch (error) {
        console.error("Complaint mail logs error:", error);
        res.status(500).json({ message: error.message || "Failed to load complaint mail logs" });
    }
});

router.post("/mail/settings", async (req, res) => {
    const hasEnabledFlag = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        || Object.prototype.hasOwnProperty.call(req.body, "is_enabled");
    const rawEnabled = Object.prototype.hasOwnProperty.call(req.body, "isEnabled")
        ? req.body.isEnabled
        : req.body.is_enabled;
    const recipientEmail = cleanText(
        Object.prototype.hasOwnProperty.call(req.body, "recipientEmail")
            ? req.body.recipientEmail
            : req.body.recipient_email
    );
    const sendTimeHhmm = cleanText(
        Object.prototype.hasOwnProperty.call(req.body, "sendTimeHhmm")
            ? req.body.sendTimeHhmm
            : req.body.send_time_hhmm
    );

    if (!hasEnabledFlag) {
        return res.status(400).json({ message: "isEnabled is required" });
    }

    try {
        const snapshot = await complaintsMailService.updateSettings({
            recipientEmail,
            isEnabled: typeof rawEnabled === "string" ? rawEnabled.toLowerCase() === "true" : Boolean(rawEnabled),
            sendTimeHhmm,
        });

        res.json({
            message: "Complaint mail settings saved",
            ...snapshot,
        });
    } catch (error) {
        console.error("Complaint mail save settings error:", error);
        const statusCode = /required|valid|format/i.test(error.message || "") ? 400 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to save complaint mail settings" });
    }
});

router.post("/mail/send-now", async (req, res) => {
    try {
        const result = await complaintsMailService.runManualSend({
            triggeredByUserId: req.user?.id || null,
        });

        if (result?.skipped && result.reason === "already_running") {
            return res.status(409).json({
                message: "Complaint mail is already running",
                ...result,
            });
        }

        res.json({
            message: "Complaint mail sent successfully",
            ...result,
        });
    } catch (error) {
        console.error("Complaint mail send error:", error);
        const statusCode = /missing|invalid/i.test(error.message || "") ? 400 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to send complaint mail" });
    }
});

router.post("/export-excel", async (req, res) => {
    try {
        const filters = {
            search: cleanText(req.body.search),
            category: cleanText(req.body.category),
            status: cleanText(req.body.status),
        };

        const rows = await complaintsDb.getComplaints(filters);

        if (rows.length === 0) {
            return res.status(400).json({
                message: "No complaints found for the selected filters",
            });
        }

        const filePath = await generateComplaintsRegisterExcel(rows, filters);

        res.download(filePath, "Complaint_Register.xlsx", (error) => {
            if (error) {
                console.error("Complaint Excel download error:", error);
            }
        });
    } catch (error) {
        console.error("Complaint Excel export error:", error);
        res.status(500).json({ message: "Failed to export complaint register" });
    }
});

router.post("/", async (req, res) => {
    let uploadedFiles = [];
    const createdByUserId = getAuthenticatedUserId(req);

    try {
        uploadedFiles = await parseComplaintUploads(req, res);
        const respondValidationError = async (status, message) => {
            await cleanupUploadedFiles(uploadedFiles);
            return res.status(status).json({ message });
        };

        const body = req.body || {};
        const department = cleanText(body.department);
        const description = cleanText(body.description);
        const category = cleanText(body.category);
        const complaintMode = cleanText(body.complaintMode);
        const complainantName = cleanText(body.complainantName);
        const complainantContact = cleanText(body.complainantContact);
        const adminRemarks = cleanText(body.adminRemarks);
        const rawComplainantUserId = body.complainantUserId;
        const complainantUserId = rawComplainantUserId ? Number(rawComplainantUserId) : null;

        if (!createdByUserId) {
            return respondValidationError(401, "Authentication required");
        }

        if (!department || !description || !category || !complaintMode) {
            return respondValidationError(400, "Department, description, category and mode of complaint are required");
        }

        if (rawComplainantUserId && !Number.isInteger(complainantUserId)) {
            return respondValidationError(400, "Complainant user is invalid");
        }

        if (!complainantUserId && !complainantName) {
            return respondValidationError(400, "Provide either a linked user or a complainant name");
        }

        const attachments = normalizeUploadFiles(uploadedFiles, createdByUserId);
        const result = await complaintsDb.createComplaintWithAttachments({
            department,
            description,
            category,
            complaintMode,
            complainantUserId,
            complainantName: complainantName || null,
            complainantContact: complainantContact || null,
            adminRemarks: adminRemarks || null,
            createdByUserId,
            attachments,
        });

        res.status(201).json({
            message: "Complaint created successfully",
            complaint: result.complaint,
            attachments: result.attachments.map((attachment) => ({
                ...attachment,
                downloadUrl: `/complaints/attachments/${attachment.id}/download`,
                viewUrl: `/complaints/attachments/${attachment.id}`,
            })),
        });
    } catch (error) {
        await cleanupUploadedFiles(uploadedFiles);
        console.error("Create complaint error:", error);
        const statusCode = isUploadValidationError(error)
            ? 400
            : 500;
        res.status(statusCode).json({ message: error.message || "Failed to create complaint" });
    }
});

router.put("/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const status = cleanText(req.body.status);
    const adminRemarks = cleanText(req.body.adminRemarks);

    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid complaint id" });
    }

    if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ message: "Invalid complaint status" });
    }

    try {
        const updated = await complaintsDb.updateComplaintStatus(id, {
            status,
            adminRemarks: adminRemarks || null,
        });

        if (!updated) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.json({
            message: "Complaint updated successfully",
            complaint: updated,
        });
    } catch (error) {
        console.error("Update complaint status error:", error);
        res.status(500).json({ message: "Failed to update complaint" });
    }
});

module.exports = router;
