const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "output", "excel");

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function formatDateTime(value) {
    if (!value) {
        return "";
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

function buildFilterSummary(filters) {
    const parts = [];

    if (filters.search) {
        parts.push(`Search: ${filters.search}`);
    }

    if (filters.category) {
        parts.push(`Category: ${filters.category}`);
    }

    if (filters.status) {
        parts.push(`Status: ${filters.status}`);
    }

    return parts.length ? parts.join(" | ") : "All complaints";
}

async function generateComplaintsRegisterExcel(rows, filters = {}, options = {}) {
    const reportTitle = options.reportTitle || "Complaint Register";
    const fileNamePrefix = options.fileNamePrefix || "Complaint_Register";
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Complaint Register", {
        views: [{ state: "frozen", ySplit: 3 }],
    });

    sheet.columns = [
        { header: "Complaint No", key: "complaintNo", width: 18 },
        { header: "Department", key: "department", width: 22 },
        { header: "Category", key: "category", width: 18 },
        { header: "Mode", key: "complaintMode", width: 18 },
        { header: "Description", key: "description", width: 42 },
        { header: "Complainant", key: "complainantDisplayName", width: 24 },
        { header: "Contact / Notes", key: "complainantContact", width: 20 },
        { header: "Status", key: "status", width: 14 },
        { header: "Created By Full Name", key: "createdByDisplayName", width: 22 },
        { header: "Created At", key: "createdAt", width: 20 },
        { header: "Resolved At", key: "resolvedAt", width: 20 },
        { header: "Admin Remarks", key: "adminRemarks", width: 30 },
    ];

    sheet.insertRow(1, []);
    sheet.mergeCells("A1:L1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = reportTitle;
    titleCell.font = { bold: true, size: 15 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    sheet.insertRow(2, []);
    sheet.mergeCells("A2:L2");
    const summaryCell = sheet.getCell("A2");
    summaryCell.value = `${buildFilterSummary(filters)} | Generated: ${formatDateTime(new Date())}`;
    summaryCell.font = { italic: true, size: 10 };
    summaryCell.alignment = { horizontal: "left", vertical: "middle" };

    const headerRow = sheet.getRow(3);
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F4E78" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    rows.forEach((row) => {
        sheet.addRow({
            complaintNo: row.complaintNo,
            department: row.department,
            category: row.category,
            complaintMode: row.complaintMode,
            description: row.description,
            complainantDisplayName: row.complainantDisplayName,
            complainantContact: row.complainantContact,
            status: row.status,
            createdByDisplayName: row.createdByFullName || row.createdByUsername,
            createdAt: formatDateTime(row.createdAt),
            resolvedAt: formatDateTime(row.resolvedAt),
            adminRemarks: row.adminRemarks,
        });
    });

    sheet.autoFilter = {
        from: "A3",
        to: "L3",
    };

    for (let rowNumber = 4; rowNumber <= rows.length + 3; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        row.alignment = { vertical: "top", wrapText: true };

        if (rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF7FBFF" },
                };
            });
        }
    }

    sheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.3,
            right: 0.3,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2,
        },
    };

    const fileStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(OUTPUT_DIR, `${fileNamePrefix}_${fileStamp}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
}

module.exports = {
    generateComplaintsRegisterExcel,
};
 
