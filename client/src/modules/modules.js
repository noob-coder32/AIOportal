export const modules = [
    {
        id: "qa",
        name: "QA",
        description: "Manage coil deletion and audit tracking",
        allowedRoles: ["qa", "admin"],
    },
    {
        id: "hr",
        name: "HOD Assignment",
        description: "Manage employee-HOD assignments",
        allowedRoles: ["hr", "admin"],
    },
    {
        id: "admin",
        name: "User Management",
        description: "Manage user accounts and permissions",
        allowedRoles: ["admin"],
    },
    // {
    //     id: "ba",
    //     name: "Batch Analysis",
    //     description: "Analyze batch data and generate reports(Under Development)",
    //     allowedRoles: ["ba", "admin"],
    // },
    {
        id: "pg",
        name: "Payslip Generator",
        description: "Generate payslips for employees",
        allowedRoles: ["payslip", "admin"]
    },
    {
        id: "qa-request",
        name: "Coil Request (QA Remove)",
        description: "QA Remove Requests",
        allowedRoles: ["qa-request", "admin"],
    }, {
        id: "destination",  //dest
        name: "Destination Update",
        description: "Update Distname and Pincode",
        allowedRoles: ["destination", "admin"]
    }, {
        id: "invoice",  //inv
        name: "Invoice Request",
        description: "Make requests for cancelling not final invoices",
        allowedRoles: ["invoice", "admin"]
    }, {
        id: "workOrder",
        name: "PO/WO PDF",
        description: "Preview and download purchase order or work order PDFs by PO header ID or PO number",
        allowedRoles: ["invoice", "admin"]
    }, {
        id: "thicknessChange",  //tc
        name: "Thickness Change",
        description: "Make request for Coil Thickness Change",
        allowedRoles: ["thickness-change", "admin"]
    }, {
        id: "payrollUpd",   //p
        name: "Payroll Update Request",
        description: "Requests for Payroll Updations",
        allowedRoles: ["division-request", "admin"]
    }, {
        id: "idc",
        name: "Invoice Date Change",
        description: "Requests for Date Change in not final invoices ",
        allowedRoles: ["invoice-date-change", "admin"]
    }, {
        id: "dcUpd",
        name: "Creditor/Debtor Update",
        description: "Creditor/Debtor Update requests",
        allowedRoles: ["debtor-update", "admin"]
    }, {
        id: "DCU",
        name: "Rate Update",
        description: "Requests for Rate Update",
        allowedRoles: ["debt-class-update", "admin"]
    }, {
        id: "mail",
        name: "Mail Sender",
        description: "Send Payslip Emails",
        allowedRoles: ["mail", "admin"]
    }, {
        id: "dbt1",
        name: "Credit Update",
        description: "Update credit limit/credit days",
        allowedRoles: ["credit-update", "admin"]
    }, {
        id: "defaultCredLimit",
        name: "Default Credit Limit",
        description: "Set and edit debtor default credit limit",
        allowedRoles: ["admin"]
    }, {
        id: "freeze",
        name: "Date Freeze",
        description: "Control date freezing functionality",
        allowedRoles: ["freeze", "admin"]
    }, {
        id: "billSubmission",
        name: "Bill Submission",
        description: "Manage bill submission requests",
        allowedRoles: ["bill-submission", "admin"]
    },
    {
        id: "medical-allowance",
        name: "Medical Allowance Report",
        description: "Generate and view medical allowance reports",
        allowedRoles: ["medical-allowance", "admin"]
    },
    {
        id: "employeeBonus",
        name: "Employee Bonus",
        description: "Manage employee bonuses",
        allowedRoles: ["employee-bonus", "admin"]
    }, {
        id: "thickness",
        name: "Thickness Master",
        description: "Manage thickness master data",
        allowedRoles: ["admin"],
    }, {
        id: "debtorGstin",
        name: "Debtor GSTIN Update",
        description: "Manage debtor GSTIN update requests",
        allowedRoles: ["debtorGstin", "admin"],
    }, {
        id: "coilLineEntry",
        name: "Coil Line Entry",
        description: "Store coil entries by production line with logs",
        allowedRoles: ["coil-line-entry", "admin"],
    }, {
        id: "coilDetails",
        name: "Coil Details",
        description: "Capture and search full coil detail snapshots by division and line",
        allowedRoles: ["coil-details", "admin"],
    }, {
        id: "attendanceSync",
        name: "Attendance Sync",
        description: "Sync local punching data into the AWS attendance table with background auto-update",
        allowedRoles: ["admin", "attendance-sync"],
    }, {
        id: "complaints",
        name: "Complaint Tracking",
        description: "Log, review, and resolve complaints with dated status tracking",
        allowedRoles: ["admin", "complaints"],
    }

];
