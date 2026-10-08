const moduleAccess = [
    {
        id: "admin",
        label: "User Management",
        roleName: "admin",
        type: "system",
    },
    {
        id: "qa",
        label: "QA Remove",
        roleName: "qa",
    },
    {
        id: "hr",
        label: "HOD Assignment",
        roleName: "hr",
    },
    {
        id: "payslip",
        label: "Payslip Generator",
        roleName: "payslip",
    },
    {
        id: "qa-request",
        label: "Coil Request",
        roleName: "qa-request",
    },
    {
        id: "destination",
        label: "Destination Update",
        roleName: "destination",
    },
    {
        id: "invoice",
        label: "Invoice Request",
        roleName: "invoice",
    },
    {
        id: "thicknessChange",
        label: "Thickness Change",
        roleName: "thickness-change",
    },
    {
        id: "payrollUpd",
        label: "Payroll Update Request",
        roleName: "division-request",
    },
    {
        id: "idc",
        label: "Invoice Date Change",
        roleName: "invoice-date-change",
    },
    {
        id: "dcUpd",
        label: "Creditor/Debtor Update",
        roleName: "debtor-update",
    },
    {
        id: "DCU",
        label: "Rate Update",
        roleName: "debt-class-update",
    },
    {
        id: "mail",
        label: "Mail Sender",
        roleName: "mail",
    },
    {
        id: "dbt1",
        label: "Credit Update",
        roleName: "credit-update",
    },
    {
        id: "freeze",
        label: "Date Freeze",
        roleName: "freeze",
    },
    {
        id: "billSubmission",
        label: "Bill Submission",
        roleName: "bill-submission",
    },
    {
        id: "medical-allowance",
        label: "Medical Allowance Report",
        roleName: "medical-allowance",
    },
    {
        id: "employeeBonus",
        label: "Employee Bonus",
        roleName: "employee-bonus",
    },
    {
        id: "debtorGstin",
        label: "Debtor GSTIN Update",
        roleName: "debtor-gstin",
    },
    {
        id: "coilLineEntry",
        label: "Coil Line Entry",
        roleName: "coil-line-entry",
    },
    {
        id: "coilDetails",
        label: "Coil Details",
        roleName: "coil-details",
    }, {
        id: "complaints",
        label: "Complaint Tracking",
        roleName: "complaints",
    },
    {
        id: "attendanceSync",
        label: "Attendance Sync",
        roleName: "attendance-sync",
    }
];

const roleMetadata = moduleAccess.reduce((map, module) => {
    map[module.roleName] = {
        name: module.roleName,
        label: module.label,
        type: module.type || "module",
        moduleId: module.id,
    };

    return map;
}, {});

function getModule(moduleId) {
    const module = moduleAccess.find((item) => item.id === moduleId);

    if (!module) {
        throw new Error(`Unknown module access id: ${moduleId}`);
    }

    return module;
}

function getRouteRoles(moduleId) {
    const module = getModule(moduleId);
    return ["admin", module.roleName];
}

function getRequiredRoleNames() {
    return [...new Set(moduleAccess.map((module) => module.roleName))];
}

function getRoleMetadata(roleName) {
    return roleMetadata[roleName] || {
        name: roleName,
        label: roleName,
        type: "custom",
        moduleId: null,
    };
}

module.exports = {
    moduleAccess,
    getRequiredRoleNames,
    getRoleMetadata,
    getRouteRoles,
};
    