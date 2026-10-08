const payslipDb = require("../../db/payslip.db");
const generateExcel = require("./excel.generator");
const generatePdf = require("./pdf.generator");
const { ToWords } = require("to-words");
const path = require("path");


const COOP_INTEREST_PERCENT = "6.00";
// const PDF_CONCURRENCY = 1;

const toWords = new ToWords({
    localeCode: "en-IN",
    converterOptions: {
        currency: false,
        ignoreDecimal: true,
    },
});

//CALCULATE WORKING DAYS(Calculate Days From Cycle)

function getDaysInMonthFromCycle(cycleName) {
    if (!cycleName) return null;

    const parts = cycleName.trim().split(/\s+/);

    if (parts.length < 2) return null;

    const monthStr = parts[0].substring(0, 3).toUpperCase();
    const year = Number(parts[1]);

    const monthMap = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3,
        MAY: 4, JUN: 5, JUL: 6, AUG: 7,
        SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };

    const monthIndex = monthMap[monthStr];

    if (monthIndex === undefined || isNaN(year)) return null;

    return new Date(year, monthIndex + 1, 0).getDate();
}


/**
 * Build structured object
 */
function buildPayslipObject(rows) {
    if (!rows || rows.length === 0) {
        throw new Error("No payslip data found");
    }

    const first = rows[0];

    const earnings = [];
    const deductions = [];

    rows.forEach((r) => {
        const rate = Number(r.head_default_amount || 0);
        const amount = Number(r.head_actual_amount || 0);
        const type = r.head_type?.toUpperCase();

        // Hide only if BOTH rate and amount are 0
        if (rate === 0 && amount === 0) {
            return;
        }

        let headName = r.head_name;
        let sortKey = 0;

        const normalizedName = headName
            ?.replace(/\s+/g, " ")
            .trim()
            .toUpperCase();

        // =====================================
        // 🔹 DISPLAY NAME NORMALIZATION
        // =====================================
        if (normalizedName === "PROVIDENT FUND") {
            headName = "Provident Fund";
        }

        if (normalizedName === "PROFESSIONAL TAX") {
            headName = "Professional Tax";
        }
        // =====================================
        // 🔹 SHIFT ALLOW LOGIC (STRICT)
        // =====================================
        if (normalizedName && normalizedName.includes("SHIFT ALLOW")) {

            if (rate === 3) {
                headName = "Shift Allow (A)";
                sortKey = 6.1;
            } else if (rate === 4) {
                headName = "Shift Allow (B)";
                sortKey = 6.2;
            } else if (rate === 20) {
                headName = "Shift Allow (C)";
                sortKey = 6.3;
            } else {
                return; // 🔴 Skip ALL other shift allowance rows
            }

        }

        if (normalizedName && normalizedName.includes("WASH")) {
            sortKey = 7;
        }

        if (normalizedName && normalizedName.includes("MED")) {
            sortKey = 8;
        }
        // =====================================
        // 🔹 CO-OP LOAN SPLIT LOGIC (SAFE)
        // =====================================
        if (normalizedName === "CO-OP. LOAN") {

            const principalAmount = rate;
            const interestAmount = amount - rate;

            if (principalAmount !== 0) {
                deductions.push({
                    head_name: "Co-op Loan Principal",
                    rate: rate,
                    amount: principalAmount,
                    sortKey: 100
                });
            }

            if (interestAmount !== 0) {
                deductions.push({
                    head_name: "Co-op Loan Interest",
                    rate: 0,
                    amount: interestAmount,
                    sortKey: 101
                });
            }

            return; // skip original loan row
        }

        // =====================================
        // 🔹 CO-OP CONTRIBUTION ORDER FIX
        // =====================================
        if (
            normalizedName === "CO-OP. CONT." ||
            normalizedName === "CO-OP. CONT" ||
            normalizedName === "CO OP CONT." ||
            normalizedName === "CO-OP CONT"
        ) {
            sortKey = 99;  // must be before principal (100)
        }

        const head = {
            head_name: headName,
            rate: rate,
            amount: amount,
            sortKey: sortKey
        };

        if (type === "ERN") {
            earnings.push(head);
        } else {
            deductions.push(head);
        }
    });

    earnings.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
    deductions.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));



    const gross = earnings.reduce((s, h) => s + h.amount, 0);
    const total_deductions = deductions.reduce((s, h) => s + h.amount, 0);
    const net_pay = gross - total_deductions;
    const rounded_net_pay = Math.round(net_pay);


    return {
        header: {
            company_id: first.company_id,
            division_name: first.division_name,
            category_name: first.category_name,
            sub_category_name: first.sub_category_name,
            department_name: first.department_name,
            employee_code: first.employee_code,
            employee_name: first.emp_name,
            payroll_cycle_name: first.payroll_cycle_name,
            bank_name: first.bank_name,
            bank_acct_no: first.bank_acct_no,
            working_days: getDaysInMonthFromCycle(first.payroll_cycle_name),

        },
        attendance: {
            payable_days: first.payable_Days,
            absent_days: first.absent_days,
            adjusted_days: first.excess_days,

            leave_detail: first.leave_detail && first.leave_detail.trim() !== ""
                ? first.leave_detail
                : null,

            shift_detail: first.shift_detail && first.shift_detail.trim() !== ""
                ? first.shift_detail
                : null,

            coop_balance: first.coop_balance > 0
                ? first.coop_balance
                : null,

            coop_interest_percent:
                first.coop_balance > 0
                    ? COOP_INTEREST_PERCENT
                    : null,
        },

        earnings,
        deductions,
        totals: {
            gross,
            total_deductions,
            net_pay: rounded_net_pay,
            net_pay_in_words:
                toWords.convert(rounded_net_pay).toUpperCase() + " ONLY",
        },
    };
}

/**
 * Generate Payslips (Excel + PDF)
 */
async function generatePayslips(employeeIds, cycle, generatedBy) {

    const results = [];

    for (const employeeId of employeeIds) {

        try {

            // 1️⃣ Fetch data
            const rows = await payslipDb.getPayslipRows(
                employeeId,
                cycle
            );

            const payslipObject = buildPayslipObject(rows);
            const employeeCode = rows[0].employee_code;
            const employeeName = rows[0].emp_name;

            // 2️⃣ Capture time RIGHT BEFORE Excel generation
            const generatedAt = new Date();

            payslipObject.printMeta = {
                generatedBy,
                generatedAt
            };

            // 3️⃣ Generate Excel
            const excelPath = await generateExcel(payslipObject);

            // 4️⃣ Immediately convert to PDF
            const pdfPath = await generatePdf(excelPath);

            const pdfFile = path.basename(pdfPath);

            results.push({
                employeeId,        // keep existing (important)
                employeeCode,      // new
                employeeName,      // new
                excelPath,         // keep existing
                pdfPath,           // keep existing
                pdfUrl: `/payslip-files/pdf/${pdfFile}`, // new download URL
                status: "success"
            });

        } catch (err) {

            results.push({
                employeeId,
                status: "failed",
                error: err.message
            });
        }
    }

    return results;
}
module.exports = {
    buildPayslipObject,
    generatePayslips,
};
