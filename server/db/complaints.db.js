const db = require("./mssql");

const DB_NAME = process.env.DB_NAME;

const BASE_SELECT = `
    SELECT
        c.id,
        c.complaint_no,
        c.department,
        c.description,
        c.category,
        c.complaint_mode,
        c.status,
        c.complainant_user_id,
        c.complainant_name,
        c.complainant_contact,
        c.admin_remarks,
        c.created_by_user_id,
        c.created_at,
        c.resolved_at,
        linked_user.employee_code AS complainant_employee_code,
        linked_user.employee_name AS complainant_employee_name,
        creator.username AS created_by_username,
        creator.full_name AS created_by_full_name,
        (
            SELECT COUNT(1)
            FROM dbo.complaint_attachments ca
            WHERE ca.complaint_id = c.id
        ) AS attachment_count,
        COALESCE(
            NULLIF(LTRIM(RTRIM(linked_user.employee_name)), ''),
            NULLIF(LTRIM(RTRIM(linked_user.employee_code)), ''),
            NULLIF(LTRIM(RTRIM(c.complainant_name)), ''),
            'Unknown'
        ) AS complainant_display_name
    FROM dbo.complaints c
    LEFT JOIN dbo.users2 linked_user
        ON linked_user.id = c.complainant_user_id
    LEFT JOIN dbo.users creator
        ON creator.id = c.created_by_user_id
`;

function normalizeComplaint(row) {
    return {
        id: row.id,
        complaintNo: row.complaint_no,
        department: row.department || "",
        description: row.description,
        category: row.category,
        complaintMode: row.complaint_mode || "",
        status: row.status,
        complainantUserId: row.complainant_user_id,
        complainantName: row.complainant_name || "",
        complainantContact: row.complainant_contact || "",
        complainantEmployeeCode: row.complainant_employee_code || "",
        complainantEmployeeName: row.complainant_employee_name || "",
        complainantDisplayName: row.complainant_display_name || "Unknown",
        adminRemarks: row.admin_remarks || "",
        createdByUserId: row.created_by_user_id,
        createdByUsername: row.created_by_username || "",
        createdByFullName: row.created_by_full_name || "",
        attachmentCount: Number(row.attachment_count || 0),
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
    };
}

function normalizeComplaintAttachment(row) {
    return {
        id: row.id,
        complaintId: row.complaint_id,
        originalName: row.original_name || "",
        storedName: row.stored_name || "",
        storedPath: row.stored_path || "",
        mimeType: row.mime_type || "",
        fileSize: Number(row.file_size || 0),
        uploadedByUserId: row.uploaded_by_user_id,
        createdAt: row.created_at,
    };
}

function getRows(result) {
    if (Array.isArray(result)) {
        return result;
    }

    return result?.recordset || [];
}

async function getComplaints({ search = "", category = "", status = "" } = {}) {
    const params = {};
    const clauses = [];

    if (search) {
        params.search = `%${search}%`;
        clauses.push(`
            (
                c.complaint_no LIKE @search
                OR c.department LIKE @search
                OR c.description LIKE @search
                OR c.category LIKE @search
                OR c.complaint_mode LIKE @search
                OR c.complainant_name LIKE @search
                OR c.complainant_contact LIKE @search
                OR linked_user.employee_code LIKE @search
                OR linked_user.employee_name LIKE @search
            )
        `);
    }

    if (category) {
        params.category = category;
        clauses.push("c.category = @category");
    }

    if (status) {
        params.status = status;
        clauses.push("c.status = @status");
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await db.query(
        DB_NAME,
        `
        ${BASE_SELECT}
        ${whereClause}
        ORDER BY c.created_at DESC, c.id DESC
        `,
        params
    );

    return rows.map(normalizeComplaint);
}

async function getComplaintById(id) {
    const rows = await db.query(
        DB_NAME,
        `
        ${BASE_SELECT}
        WHERE c.id = @id
        `,
        { id }
    );

    return rows[0] ? normalizeComplaint(rows[0]) : null;
}

async function createComplaint({
    department,
    description,
    category,
    complaintMode = null,
    complainantUserId = null,
    complainantName = null,
    complainantContact = null,
    adminRemarks = null,
    createdByUserId,
}) {
    const result = await createComplaintWithAttachments({
        department,
        description,
        category,
        complaintMode,
        complainantUserId,
        complainantName,
        complainantContact,
        adminRemarks,
        createdByUserId,
    });

    return result.complaint;
}

async function createComplaintWithAttachments({
    department,
    description,
    category,
    complaintMode = null,
    complainantUserId = null,
    complainantName = null,
    complainantContact = null,
    adminRemarks = null,
    createdByUserId,
    attachments = [],
}) {
    const pool = await db.getPool(DB_NAME);
    const transaction = new db.sql.Transaction(pool);

    await transaction.begin();

    try {
        const request = new db.sql.Request(transaction);
        request.input("department", db.sql.NVarChar(200), department);
        request.input("description", db.sql.NVarChar(db.sql.MAX), description);
        request.input("category", db.sql.NVarChar(100), category);
        request.input("complaintMode", db.sql.NVarChar(50), complaintMode);
        request.input("complainantUserId", db.sql.Int, complainantUserId);
        request.input("complainantName", db.sql.NVarChar(150), complainantName);
        request.input("complainantContact", db.sql.NVarChar(150), complainantContact);
        request.input("adminRemarks", db.sql.NVarChar(1000), adminRemarks);
        request.input("createdByUserId", db.sql.Int, createdByUserId);

        const result = await request.query(
            `
            DECLARE @inserted TABLE (id INT);

            INSERT INTO dbo.complaints (
                department,
                description,
                category,
                complaint_mode,
                status,
                complainant_user_id,
                complainant_name,
                complainant_contact,
                admin_remarks,
                created_by_user_id
            )
            OUTPUT INSERTED.id INTO @inserted (id)
            VALUES (
                @department,
                @description,
                @category,
                @complaintMode,
                'Pending',
                @complainantUserId,
                @complainantName,
                @complainantContact,
                @adminRemarks,
                @createdByUserId
            );

            UPDATE c
            SET complaint_no = 'CMP-' + RIGHT('000000' + CAST(c.id AS VARCHAR(6)), 6)
            FROM dbo.complaints c
            INNER JOIN @inserted i ON i.id = c.id;

            ${BASE_SELECT}
            WHERE c.id = (SELECT TOP 1 id FROM @inserted);
            `
        );

        const rows = getRows(result);
        const complaint = rows[0] ? normalizeComplaint(rows[0]) : null;
        if (!complaint) {
            throw new Error("Failed to create complaint");
        }

        if (attachments.length) {
            await insertComplaintAttachments(transaction, complaint.id, attachments);
        }

        const storedAttachments = await fetchComplaintAttachments({
            transaction,
            complaintId: complaint.id,
        });

        await transaction.commit();

        return {
            complaint,
            attachments: storedAttachments,
        };
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_rollbackError) {
            // Ignore rollback failures so the original error can bubble up.
        }

        throw error;
    }
}

async function insertComplaintAttachments(transaction, complaintId, attachments) {
    for (const attachment of attachments) {
        const request = new db.sql.Request(transaction);
        request.input("complaintId", db.sql.Int, complaintId);
        request.input("originalName", db.sql.NVarChar(255), attachment.originalName);
        request.input("storedName", db.sql.NVarChar(255), attachment.storedName);
        request.input("storedPath", db.sql.NVarChar(500), attachment.storedPath);
        request.input("mimeType", db.sql.NVarChar(100), attachment.mimeType);
        request.input("fileSize", db.sql.BigInt, attachment.fileSize);
        request.input("uploadedByUserId", db.sql.Int, attachment.uploadedByUserId);

        await request.query(
            `
            INSERT INTO dbo.complaint_attachments (
                complaint_id,
                original_name,
                stored_name,
                stored_path,
                mime_type,
                file_size,
                uploaded_by_user_id
            )
            VALUES (
                @complaintId,
                @originalName,
                @storedName,
                @storedPath,
                @mimeType,
                @fileSize,
                @uploadedByUserId
            );
            `
        );
    }
}

async function fetchComplaintAttachments({ complaintId, transaction = null }) {
    const rows = transaction
        ? getRows(
            await new db.sql.Request(transaction).input("complaintId", db.sql.Int, complaintId).query(
                `
                SELECT
                    id,
                    complaint_id,
                    original_name,
                    stored_name,
                    stored_path,
                    mime_type,
                    file_size,
                    uploaded_by_user_id,
                    created_at
                FROM dbo.complaint_attachments
                WHERE complaint_id = @complaintId
                ORDER BY created_at DESC, id DESC
                `
            )
        )
        : await db.query(
            DB_NAME,
            `
            SELECT
                id,
                complaint_id,
                original_name,
                stored_name,
                stored_path,
                mime_type,
                file_size,
                uploaded_by_user_id,
                created_at
            FROM dbo.complaint_attachments
            WHERE complaint_id = @complaintId
            ORDER BY created_at DESC, id DESC
            `,
            { complaintId }
        );

    return rows.map(normalizeComplaintAttachment);
}

async function getComplaintAttachments(complaintId) {
    return fetchComplaintAttachments({ complaintId });
}

async function getComplaintAttachmentById(id) {
    const rows = await db.query(
        DB_NAME,
        `
        SELECT
            id,
            complaint_id,
            original_name,
            stored_name,
            stored_path,
            mime_type,
            file_size,
            uploaded_by_user_id,
            created_at
        FROM dbo.complaint_attachments
        WHERE id = @id
        `,
        { id }
    );

    return rows[0] ? normalizeComplaintAttachment(rows[0]) : null;
}

async function addComplaintAttachments({
    complaintId,
    attachments = [],
    uploadedByUserId = null,
}) {
    const complaint = await getComplaintById(complaintId);
    if (!complaint) {
        return null;
    }

    if (!attachments.length) {
        return [];
    }

    const pool = await db.getPool(DB_NAME);
    const transaction = new db.sql.Transaction(pool);

    await transaction.begin();

    try {
        for (const attachment of attachments) {
            const request = new db.sql.Request(transaction);
            request.input("complaintId", db.sql.Int, complaintId);
            request.input("originalName", db.sql.NVarChar(255), attachment.originalName);
            request.input("storedName", db.sql.NVarChar(255), attachment.storedName);
            request.input("storedPath", db.sql.NVarChar(500), attachment.storedPath);
            request.input("mimeType", db.sql.NVarChar(100), attachment.mimeType);
            request.input("fileSize", db.sql.BigInt, attachment.fileSize);
            request.input("uploadedByUserId", db.sql.Int, uploadedByUserId);

            await request.query(
                `
                INSERT INTO dbo.complaint_attachments (
                    complaint_id,
                    original_name,
                    stored_name,
                    stored_path,
                    mime_type,
                    file_size,
                    uploaded_by_user_id
                )
                VALUES (
                    @complaintId,
                    @originalName,
                    @storedName,
                    @storedPath,
                    @mimeType,
                    @fileSize,
                    @uploadedByUserId
                );
                `
            );
        }

        const storedAttachments = await fetchComplaintAttachments({
            complaintId,
            transaction,
        });

        await transaction.commit();
        return storedAttachments;
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (_rollbackError) {
            // Ignore rollback failures so the original error can bubble up.
        }

        throw error;
    }
}

async function updateComplaintStatus(id, { status, adminRemarks = null }) {
    const rows = await db.query(
        DB_NAME,
        `
        UPDATE dbo.complaints
        SET
            status = @status,
            admin_remarks = @adminRemarks,
            resolved_at = CASE
                WHEN @status = 'Completed' THEN GETDATE()
                ELSE NULL
            END
        WHERE id = @id;

        ${BASE_SELECT}
        WHERE c.id = @id;
        `,
        {
            id,
            status,
            adminRemarks,
        }
    );

    return rows[0] ? normalizeComplaint(rows[0]) : null;
}

async function getComplaintUsers() {
    const rows = await db.query(
        DB_NAME,
        `
        SELECT
            id,
            employee_name,
            employee_code
        FROM dbo.users2
        ORDER BY
            COALESCE(NULLIF(LTRIM(RTRIM(employee_name)), ''), employee_code),
            employee_code
        `
    );

    return rows.map((row) => ({
        id: row.id,
        employeeName: row.employee_name || "",
        employeeCode: row.employee_code || "",
        displayName: row.employee_name || row.employee_code || `User ${row.id}`,
    }));
}

module.exports = {
    getComplaints,
    getComplaintById,
    createComplaint,
    createComplaintWithAttachments,
    getComplaintAttachments,
    getComplaintAttachmentById,
    addComplaintAttachments,
    updateComplaintStatus,
    getComplaintUsers,
};
