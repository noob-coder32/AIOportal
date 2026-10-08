// backend/modules/medicalAllowance/excel.generator.js

const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const OUTPUT_DIR = path.join(__dirname, "output", "excel");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to format numbers in Indian style
function formatINR(num) {
    return Number(num || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function generateMedicalAllowanceExcel(cycle, records) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Medical Allowance");

    // Set column widths
    sheet.columns = [
        { header: "Employee Code", key: "employee_code", width: 15 },
        { header: "Employee Name", key: "emp_name", width: 25 },
        { header: "Division", key: "division_name", width: 20 },
        { header: "Category", key: "category_name", width: 15 },
        { header: "Sub Category", key: "sub_category_name", width: 18 },
        { header: "Department", key: "department_name", width: 18 },
        { header: "Payable Days", key: "payable_days", width: 12 },
        { header: "Total Basic (Cons)", key: "total_basic_cons", width: 16 },
        { header: "Medical Allowance Rate", key: "medical_allowance_rate", width: 16 },
        { header: "Payable Medical Allowance", key: "payable_medical_allowance", width: 18 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
    };
    headerRow.alignment = { horizontal: "center", vertical: "center", wrapText: true };

    // Add title row (before headers)
    sheet.insertRow(1, []);
    const titleCell = sheet.getCell("A1");
    titleCell.value = `Medical Allowance Report - ${cycle}`;
    titleCell.font = { bold: true, size: 14 };
    sheet.mergeCells("A1:J1");
    titleCell.alignment = { horizontal: "center", vertical: "center" };

    // Add data rows
    records.forEach((record) => {
        sheet.addRow({
            employee_code: record.employee_code,
            emp_name: record.emp_name,
            division_name: record.division_name,
            category_name: record.category_name,
            sub_category_name: record.sub_category_name,
            department_name: record.department_name,
            payable_days: record.payable_days,
            total_basic_cons: record.total_basic_cons,
            medical_allowance_rate: record.medical_allowance_rate,
            payable_medical_allowance: record.payable_medical_allowance,
        });
    });

    // Format number columns
    for (let row = 3; row <= records.length + 2; row++) {
        sheet.getCell(`G${row}`).numFmt = '0.00';
        sheet.getCell(`H${row}`).numFmt = '#,##0.00';
        sheet.getCell(`I${row}`).numFmt = '#,##0';
        sheet.getCell(`J${row}`).numFmt = '#,##0';

        // Center align numeric columns
        sheet.getCell(`G${row}`).alignment = { horizontal: "right" };
        sheet.getCell(`H${row}`).alignment = { horizontal: "right" };
        sheet.getCell(`I${row}`).alignment = { horizontal: "right" };
        sheet.getCell(`J${row}`).alignment = { horizontal: "right" };
    }

    // Add totals row
    const totalsRowNum = records.length + 3;
    sheet.getCell(`A${totalsRowNum}`).value = "TOTAL";
    sheet.getCell(`A${totalsRowNum}`).font = { bold: true };

    const totalPayableDays = records.reduce((sum, r) => sum + (r.payable_days || 0), 0);
    const totalBasicCons = records.reduce((sum, r) => sum + (r.total_basic_cons || 0), 0);
    const totalMedicalAllowance = records.reduce((sum, r) => sum + (r.payable_medical_allowance || 0), 0);

    sheet.getCell(`G${totalsRowNum}`).value = totalPayableDays;
    sheet.getCell(`H${totalsRowNum}`).value = totalBasicCons;
    sheet.getCell(`J${totalsRowNum}`).value = totalMedicalAllowance;

    sheet.getCell(`G${totalsRowNum}`).font = { bold: true };
    sheet.getCell(`H${totalsRowNum}`).font = { bold: true };
    sheet.getCell(`J${totalsRowNum}`).font = { bold: true };

    sheet.getCell(`G${totalsRowNum}`).numFmt = '0.00';
    sheet.getCell(`H${totalsRowNum}`).numFmt = '#,##0.00';
    sheet.getCell(`J${totalsRowNum}`).numFmt = '#,##0';

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filePath = path.join(OUTPUT_DIR, `Medical_Allowance_${cycle}_${timestamp}.xlsx`);

    // Save file
    await workbook.xlsx.writeFile(filePath);

    return filePath;
}

module.exports = {
    generateMedicalAllowanceExcel,
};
