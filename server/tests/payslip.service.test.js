const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPayslipObject } = require("../modules/payslip/payslip.service");

test("buildPayslipObject keeps shift, wash, and med rows in DB order", () => {
    const rows = [
        {
            company_id: "C1",
            division_name: "D1",
            category_name: "CAT",
            sub_category_name: "SUB",
            department_name: "DEP",
            employee_code: "E001",
            emp_name: "Test Employee",
            payroll_cycle_name: "JAN 2026",
            bank_name: "BANK",
            bank_acct_no: "123",
            payable_Days: 30,
            absent_days: 0,
            excess_days: 0,
            leave_detail: "",
            shift_detail: "",
            coop_balance: 0,
            head_type: "ERN",
            head_name: "WASH ALLOWANCE",
            head_default_amount: 0,
            head_actual_amount: 100,
        },
        {
            company_id: "C1",
            division_name: "D1",
            category_name: "CAT",
            sub_category_name: "SUB",
            department_name: "DEP",
            employee_code: "E001",
            emp_name: "Test Employee",
            payroll_cycle_name: "JAN 2026",
            bank_name: "BANK",
            bank_acct_no: "123",
            payable_Days: 30,
            absent_days: 0,
            excess_days: 0,
            leave_detail: "",
            shift_detail: "",
            coop_balance: 0,
            head_type: "ERN",
            head_name: "SHIFT ALLOW",
            head_default_amount: 3,
            head_actual_amount: 200,
        },
    ];

    const result = buildPayslipObject(rows);

    assert.deepEqual(
        result.earnings.map((item) => item.head_name),
        ["Shift Allow (A)", "WASH ALLOWANCE"]
    );
});
