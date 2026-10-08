// backend/modules/payslip/excel.generator.js

const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const INDIAN_NUM_FMT = '#,##,##0.00';

const TEMPLATE_PATH = path.join(__dirname, "template", "Payslip.xlsx");
const OUTPUT_DIR = path.join(__dirname, "output", "excel");

// Table configuration (based on your template)
const TABLE_HEADER_ROW = 8;
const START_DATA_ROW = 9;
const BASE_TEMPLATE_ROWS = 1; // Keep only ONE base row in template

// Helper function to format numbers in Indian style
function formatINR(num) {
    return Number(num || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function generatePayslipExcel(p) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);

    const sheet = workbook.worksheets[0];

    // =========================
    // HEADER SECTION
    // =========================
    let companyName = "";

    switch (Number(p.header.company_id)) {
        case 1:
            companyName = "ASSAM ROOFING LIMITED";
            break;
        case 2:
            companyName = "PDP STEELS LIMITED";
            break;
        case 3:
            companyName = "NORTH EAST ROOFING PRIVATE LIMITED";
            break;
    }

    sheet.getCell("A1").value = companyName;
    // sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A2").value = p.header.division_name;
    // sheet.getCell("A2").font = { bold: true, size: 13 };
    sheet.getCell("A3").value =
        `PAYSLIP FOR ${p.header.payroll_cycle_name} (WORKING DAYS : ${p.header.working_days})`;

    // =========================
    // EMPLOYEE DETAILS
    // =========================
    sheet.getCell("B4").value = p.header.employee_code;
    sheet.getCell("E4").value = p.header.employee_name;

    sheet.getCell("B5").value = p.header.category_name;
    sheet.getCell("E5").value = p.header.sub_category_name;

    sheet.getCell("B6").value = p.header.department_name;
    // sheet.getCell("E6").value =
    //     `${p.attendance.payable_days} / ${p.attendance.absent_days} / 0.00`;

    const payable = Number(p.attendance.payable_days || 0).toFixed(2);
    const absent = Number(p.attendance.absent_days || 0).toFixed(2);
    const adjusted = Number(p.attendance.adjusted_days || 0).toFixed(2);

    sheet.getCell("E6").value = `${payable} / ${absent} / ${adjusted}`;

    sheet.getCell("B7").value = p.header.bank_name;
    sheet.getCell("E7").value = p.header.bank_acct_no;

    // =========================
    // DYNAMIC TABLE EXPANSION
    // =========================
    const earningCount = p.earnings.length;
    const deductionCount = p.deductions.length;
    const requiredRows = Math.max(earningCount, deductionCount);

    if (requiredRows > BASE_TEMPLATE_ROWS) {
        const extraRows = requiredRows - BASE_TEMPLATE_ROWS;

        for (let i = 0; i < extraRows; i++) {
            const newRow = sheet.insertRow(START_DATA_ROW + 1);

            const templateRow = sheet.getRow(START_DATA_ROW);

            templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);

                newCell.style = { ...cell.style };
                newCell.border = { ...cell.border };
                newCell.alignment = { ...cell.alignment };
            });
        }

    }

    // =========================
    // FILL EARNINGS
    // =========================
    p.earnings.forEach((e, index) => {
        const row = START_DATA_ROW + index;

        sheet.getCell(`A${row}`).value = e.head_name;

        const rateCell = sheet.getCell(`B${row}`);
        rateCell.value = e.rate;
        rateCell.numFmt = INDIAN_NUM_FMT;

        const amountCell = sheet.getCell(`C${row}`);
        amountCell.value = e.amount;
        amountCell.numFmt = INDIAN_NUM_FMT;

    });

    // =========================
    // FILL DEDUCTIONS
    // =========================
    p.deductions.forEach((d, index) => {
        const row = START_DATA_ROW + index;
        sheet.getCell(`D${row}`).value = d.head_name;

        const dedCell = sheet.getCell(`E${row}`);
        dedCell.value = d.amount;
        dedCell.numFmt = INDIAN_NUM_FMT;

    });

    // =========================
    // TOTALS (Dynamic Position)
    // =========================
    const totalsRow = START_DATA_ROW + requiredRows;
    const netRow = totalsRow + 1;

    // sheet.getCell(`A${totalsRow}`).value = "Gross Earnings";
    // sheet.getCell(`C${totalsRow}`).value = p.totals.gross;

    // sheet.getCell(`D${totalsRow}`).value = "Total Deductions";
    // sheet.getCell(`E${totalsRow}`).value = p.totals.total_deductions;

    // sheet.getCell(`D${netRow}`).value = "Net Pay";
    // sheet.getCell(`E${netRow}`).value = p.totals.net_pay;

    // Gross Earnings
    sheet.getCell(`A${totalsRow}`).value = "Gross Earnings";

    const grossCell = sheet.getCell(`C${totalsRow}`);
    grossCell.value = p.totals.gross;
    grossCell.numFmt = INDIAN_NUM_FMT;

    // Total Deductions
    sheet.getCell(`D${totalsRow}`).value = "Total Deductions";

    const totalDedCell = sheet.getCell(`E${totalsRow}`);
    totalDedCell.value = p.totals.total_deductions;
    totalDedCell.numFmt = INDIAN_NUM_FMT;

    // Net Pay
    sheet.getCell(`D${netRow}`).value = "Net Pay";

    const netCell = sheet.getCell(`E${netRow}`);
    netCell.value = p.totals.net_pay;
    netCell.numFmt = INDIAN_NUM_FMT;


    // =========================
    // IN WORDS
    // =========================
    const wordsRow = netRow + 1;
    sheet.getCell(`A${wordsRow}`).value =
        `In Words : ${p.totals.net_pay_in_words}`;

    // =========================
    // SHIFT DETAILS (Optional)
    // =========================
    let footerRow = wordsRow + 1;

    // if (p.attendance.shift_detail) {
    //     sheet.getCell(`A${footerRow}`).value =
    //         `Shift Details (Shift : Days) : ${p.attendance.shift_detail}`;
    //     footerRow++;
    // }

    // if (p.attendance.shift_detail) {
    //     sheet.getCell(`A${footerRow}`).value = {
    //         richText: [
    //             { text: 'Shift Details (Shift : Days) : ', font: { bold: true } },
    //             { text: `${p.attendance.shift_detail}` }
    //         ]
    //     };
    //     footerRow++;
    // }

    if (p.attendance.shift_detail) {

        const formattedShift = p.attendance.shift_detail
            .split("|")
            .map(item => {
                const [shift, count] = item.trim().split(/\s*=\s*/);
                return `${shift.trim()}: ${count.trim()}`;
            })
            .join("; ");

        sheet.getCell(`A${footerRow}`).value = {
            richText: [
                { text: 'Shift Details (Shift: Days) : ', font: { bold: true } },
                { text: formattedShift }
            ]
        };

        footerRow++;
    }

    // if (p.attendance.leave_detail) {
    //     sheet.getCell(`A${footerRow}`).value =
    //         `Leaves Availed (Type: Days) : ${p.attendance.leave_detail}`;
    //     footerRow++;
    // }

    if (p.attendance.leave_detail) {
        sheet.getCell(`A${footerRow}`).value = {
            richText: [
                {
                    text: 'Leaves Availed (Type: Days) : ',
                    font: { bold: true }
                },
                {
                    text: `${p.attendance.leave_detail}`
                }
            ]
        };

        footerRow++;
    }

    // if (p.attendance.leave_detail) {
    //     sheet.getCell(`A${footerRow}`).value = {
    //         richText: [
    //             { text: 'Leaves Availed (Type: Days) : ', font: { bold: true } },
    //             { text: `${p.attendance.leave_detail}` }
    //         ]
    //     };
    //     footerRow++;
    // }

    // if (p.attendance.leave_detail) {

    //     const formattedLeave = p.attendance.leave_detail
    //         .split("|")
    //         .map(item => {
    //             const [type, days] = item.trim().split(/\s+/);
    //             return `${type}: ${days}`;
    //         })
    //         .join("; ");

    //     sheet.getCell(`A${footerRow}`).value = {
    //         richText: [
    //             { text: 'Leaves Availed (Type: Days) : ', font: { bold: true } },
    //             { text: formattedLeave }
    //         ]
    //     };

    //     footerRow++;
    // }

    // if (p.attendance.coop_balance > 0) {
    //     sheet.getCell(`A${footerRow}`).value =
    //         `Co Operative Loan balance (Rs.) ${p.attendance.coop_balance.toLocaleString()}  ` +
    //         `Interest deducted @ ${p.attendance.coop_interest_percent} %`;
    //     footerRow++;
    // }

    if (p.attendance.coop_balance > 0) {
        sheet.getCell(`A${footerRow}`).value = {
            richText: [
                {
                    text: 'Co Operative Loan balance (Rs.) ',
                    font: { bold: true }
                },
                {
                    text: `${formatINR(p.attendance.coop_balance)}  `

                },
                {
                    text: 'Interest deducted @ ',
                    font: { bold: true }
                },
                {
                    text: `${p.attendance.coop_interest_percent} %`
                }
            ]
        };
        footerRow++;
    }

    // =========================
    // PRINT META (Printed By)
    // =========================

    function formatDateTime(date) {
        const pad = (n) => n.toString().padStart(2, "0");

        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();

        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds}`;
    }

    if (p.printMeta) {

        footerRow += 2; // spacing like screenshot

        const formattedDate = formatDateTime(p.printMeta.generatedAt);

        const cell = sheet.getCell(`A${footerRow}`);

        cell.value =
            `Printed By ${p.printMeta.generatedBy} on ${formattedDate}`;

        cell.alignment = {
            horizontal: "center"
        };

        cell.font = {
            size: 12
        };
        // sheet.mergeCells(`A${footerRow}:E${footerRow}`);
        const footerRange = `A${footerRow}:E${footerRow}`;

        if (!sheet.getCell(`A${footerRow}`).isMerged) {
            sheet.mergeCells(footerRange);
        }
    }

    // =========================
    // SAVE FILE
    // =========================
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const [mm, yyyy] = p.header.payroll_cycle_name.split(" ");

    const fileName = `${p.header.employee_code}-${yyyy}-${mm}.xlsx`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
}

module.exports = generatePayslipExcel;
