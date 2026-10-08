// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");


// // Middleware (JWT + role based)
const authMiddleware = require("./middleware/auth");
const requireAnyRole = require("./middleware/requireAnyRole");
const adminDb = require("./db/admin.db");
const { getRequiredRoleNames, getRouteRoles } = require("./modules/moduleAccess");

// // Module routes
const authRoutes = require("./auth.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const hrRoutes = require("./modules/hr/hr.routes");
const qaRoutes = require("./modules/qa/qa.routes");
const payslipRoutes = require("./modules/payslip/payslip.routes");
const destinationRoutes = require("./modules/destination/destination.routes");
const invoiceRoutes = require("./modules/invoice/invoice.routes");
const thicknessChangeRoutes = require("./modules/thicknessChange/thicknessChange.routes");
const divisionRoutes = require("./modules/division/division.routes");
const invoiceDateChangeRoutes = require("./modules/invoiceDateChange/invoiceDateChange.routes");
const workOrderRoutes = require("./modules/workOrder/workOrder.routes");
const debtorUpdRoutes = require("./modules/debtorUpd/debtorUpd.routes");
const debtClsUpdRoutes = require("./modules/debtClsUpd/debtClsUpd.routes");
const mailRoutes = require("./modules/mail/mail.routes");
const debtor1Routes = require("./modules/debtor1/debtor1.routes");
const debtor1MailService = require("./services/debtor1Mail.service");
const freezeRoutes = require("./modules/freeze/freeze.routes");
const billSubmissionRoutes = require("./modules/billSubmission/billSubmission.routes");
const medicalAllowanceRoutes = require("./modules/medicalAllowance/medicalAllowance.routes");
const employeeBonusRoutes = require("./modules/employeeBonus/employeeBonus.routes");
const thickness2Routes = require("./modules/thickness2/thickness2.routes");
const debtorGstinRoutes = require("./modules/debtorGstin/debtorGstin.routes");
const defaultCredLimitRoutes = require("./modules/defaultCredLimit/defaultCredLimit.routes");
const defaultCredLimitScheduler = require("./services/defaultCredLimitScheduler.service");
const coilLineEntryRoutes = require("./modules/coilLineEntry/coilLineEntry.routes");
const coilDetailsRoutes = require("./modules/coilDetails/coilDetails.routes");
const attendanceSyncRoutes = require("./modules/attendanceSync/attendanceSync.routes");
const attendanceSyncService = require("./services/attendanceSync.service");
const complaintsRoutes = require("./modules/complaints/complaints.routes");
const { ensureComplaintTables } = require("./scripts/create-complaints-table");
const complaintsMailService = require("./services/complaintsMail.service");

const qaRouteRoles = [
    ...new Set([...getRouteRoles("qa"), ...getRouteRoles("qa-request")]),
];

const app = express();

app.use(cors({
    exposedHeaders: ["Content-Disposition"],
}));
app.use(express.json());

// --------------------
// Auth routes (PUBLIC)
// --------------------
// ❗ No authMiddleware here
app.use("/", authRoutes);

// --------------------
// Admin routes (PROTECTED)
// --------------------
app.use(
    "/admin",
    authMiddleware,
    requireAnyRole("admin"),
    adminRoutes
);

// --------------------
// HR routes (PROTECTED, ROLE BASED)
// --------------------
app.use(
    "/hr",
    authMiddleware,
    requireAnyRole(...getRouteRoles("hr")),
    hrRoutes
);

// --------------------
// QA routes (PROTECTED, ROLE BASED)
// --------------------
app.use(
    "/qa",
    authMiddleware,
    requireAnyRole(...qaRouteRoles),
    qaRoutes
);

// --------------------
// Payslip routes (PROTECTED)
// --------------------
app.use(
    "/payslip",
    authMiddleware,
    requireAnyRole(...getRouteRoles("payslip")),
    payslipRoutes
);

// For serving generated payslip files (PDFs) via URL like http://localhost:3001/payslip-files/pdf/filename.pdf
app.use(
    "/payslip-files",
    express.static(
        path.join(__dirname, "modules", "payslip", "output")
    )
);

/* --------------------
   DESTINATION routes
-------------------- */

app.use(
    "/destination",
    authMiddleware,
    requireAnyRole(...getRouteRoles("destination")),
    destinationRoutes
);


/* --------------------
   INVOICE routes
-------------------- */

app.use(
    "/invoice",
    authMiddleware,
    requireAnyRole(...getRouteRoles("invoice")),
    invoiceRoutes
);

app.use(
    "/work-orders",
    authMiddleware,
    requireAnyRole(...getRouteRoles("invoice")),
    workOrderRoutes
);

/* --------------------
   THICKNESS CHANGE routes
-------------------- */

app.use(
    "/thickness-change",
    authMiddleware,
    requireAnyRole(...getRouteRoles("thicknessChange")),
    thicknessChangeRoutes
);


/* --------------------
Manage Payable Days and Salary Processing open (Division-request)
-------------------- */

app.use(
    "/division-request",
    authMiddleware,
    requireAnyRole(...getRouteRoles("payrollUpd")),
    divisionRoutes
);


/* --------------------
Invoice Date Change Routes
-------------------- */
app.use(
    "/invoice-date-change",
    authMiddleware,
    requireAnyRole(...getRouteRoles("idc")),
    invoiceDateChangeRoutes
);


/* --------------------
DEBTOR UPDATE ROUTES
-------------------- */
app.use(
    "/debtorUpd",
    authMiddleware,
    requireAnyRole(...getRouteRoles("dcUpd")),
    debtorUpdRoutes
);

/* --------------------
DEBTOR CLASS UPDATE ROUTES
-------------------- */
app.use(
    "/debtClsUpd",
    authMiddleware,
    requireAnyRole(...getRouteRoles("DCU")),
    debtClsUpdRoutes
);


/* --------------------
MAIL ROUTES
-------------------- */
app.use(
    "/mail",
    authMiddleware,
    requireAnyRole(...getRouteRoles("mail")),
    mailRoutes
);


/* --------------------
DEBTOR1 ROUTES
-------------------- */
app.use(
    "/debtor1",
    authMiddleware,
    requireAnyRole(...getRouteRoles("dbt1")),
    debtor1Routes
);

app.use(
    "/default-cred-limit",
    authMiddleware,
    requireAnyRole("admin"),
    defaultCredLimitRoutes
);

/* --------------------
DATE FREEZE CONFIG ROUTES
-------------------- */
app.use(
    "/freeze",
    authMiddleware,
    requireAnyRole(...getRouteRoles("freeze")),
    freezeRoutes
);

/* --------------------
BILL SUBMISSION ROUTES
-------------------- */
app.use(
    "/bill-submission",
    authMiddleware,
    requireAnyRole(...getRouteRoles("billSubmission")),
    billSubmissionRoutes
);

/* --------------------
MEDICAL ALLOWANCE ROUTES
-------------------- */
app.use(
    "/medical-allowance",
    authMiddleware,
    requireAnyRole(...getRouteRoles("medical-allowance")),
    medicalAllowanceRoutes
);

// For serving generated medical allowance files
app.use(
    "/medical-allowance-files",
    express.static(
        path.join(__dirname, "modules", "medicalAllowance", "output")
    )
);

/* --------------------
EMPLOYEE BONUS ROUTES
-------------------- */
app.use(
    "/employee-bonus",
    authMiddleware,
    requireAnyRole(...getRouteRoles("employeeBonus")),
    employeeBonusRoutes
);

app.use(
    "/thickness2",
    authMiddleware,
    requireAnyRole("admin"),
    thickness2Routes
);

app.use(
    "/debtorGstin",
    authMiddleware,
    requireAnyRole(...getRouteRoles("debtorGstin")),
    require("./modules/debtorGstin/debtorGstin.routes")
);

app.use(
    "/coil-line-entry",
    authMiddleware,
    requireAnyRole(...getRouteRoles("coilLineEntry")),
    coilLineEntryRoutes
);

app.use(
    "/coil-details",
    authMiddleware,
    requireAnyRole(...getRouteRoles("coilDetails")),
    coilDetailsRoutes
);

app.use(
    "/attendance-sync",
    authMiddleware,
    requireAnyRole(...getRouteRoles("attendanceSync")),
    attendanceSyncRoutes
);

app.use(
    "/complaints",
    authMiddleware,
    requireAnyRole(...getRouteRoles("complaints")),
    complaintsRoutes
);

// --------------------
// Health check (PUBLIC)
// --------------------
app.get("/health", (req, res) => {
    res.json({ status: "AIO backend running" });
});



// --------------------
const PORT = process.env.PORT || 3001;

async function startServer() {
    await adminDb.ensureUsersFullNameColumn();
    await adminDb.syncRequiredRoles(getRequiredRoleNames());
    await ensureComplaintTables();
    await attendanceSyncService.initializeScheduler();
    await complaintsMailService.initializeScheduler();
    await defaultCredLimitScheduler.initializeScheduler();
    await debtor1MailService.initializeScheduler();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start backend:", err);
    process.exit(1);
});
