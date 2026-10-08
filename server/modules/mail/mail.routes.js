const express = require("express");
const mailDb = require("../../db/mail.db");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { sendMail } = require("../../services/mail.service");

const PDF_FOLDER =
    path.join(__dirname, "../payslip/output/pdf");

/* ===============================
   GET EMPLOYEES
=============================== */
router.get("/employees", async (req, res) => {
    try {
        const rows = await mailDb.getEmployees();
        res.json(rows);
    } catch (err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({
            message: "Failed to fetch employees"
        });
    }
});

/* ===============================
   ADD EMPLOYEE
=============================== */
router.post("/employees", async (req, res) => {

    const {
        employee_code,
        employee_name,
        email,
        unit_name
    } = req.body;

    if (!employee_code || !email) {
        return res.status(400).json({
            message: "Employee code and email required"
        });
    }

    try {

        await mailDb.addEmployee(
            employee_code,
            employee_name,
            email,
            unit_name
        );

        res.json({
            message: "Employee added successfully"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Failed to add employee"
        });
    }
});

/* ===============================
   UPDATE EMPLOYEE
=============================== */
router.put("/employees/:id", async (req, res) => {

    const {
        employee_code,
        employee_name,
        email,
        unit_name
    } = req.body;

    try {

        await mailDb.updateEmployee(
            Number(req.params.id),
            employee_code,
            employee_name,
            email,
            unit_name
        );

        res.json({
            message: "Employee updated"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Failed to update employee"
        });
    }
});

/* ===============================
   DELETE EMPLOYEE (SOFT)
=============================== */
router.delete("/employees/:id", async (req, res) => {

    try {

        await mailDb.deleteEmployee(
            Number(req.params.id)
        );

        res.json({
            message: "Employee deleted"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Delete failed"
        });
    }
});

/* ===============================
   SEND MAILS
=============================== */
router.post("/send", async (req, res) => {

    const { employeeIds, subject, body } = req.body;

    try {

        const employees = await mailDb.getEmployees();

        const selected = employees.filter(e =>
            employeeIds.includes(e.id)
        );

        const files = fs.readdirSync(PDF_FOLDER);

        const sent = [];
        const failed = [];

        // for (const emp of selected) {

        //     try {

        //         // const file = files.find(f =>
        //         //     f.startsWith(emp.employee_code + "_")
        //         // );

        //         const file = files.find(f =>
        //             f === `${emp.employee_code}.pdf`
        //         );

        //         if (!file) {
        //             failed.push({
        //                 id: emp.id,
        //                 employee_code: emp.employee_code,
        //                 reason: "PDF not found"
        //             });
        //             continue;
        //         }

        //         const filePath = path.join(PDF_FOLDER, file);

        //         const mailBody =
        //             body.replace(
        //                 "{employee_code}",
        //                 emp.employee_code
        //             );

        //         await sendMail({
        //             to: emp.email,
        //             subject,
        //             text: mailBody,
        //             attachments: [
        //                 {
        //                     filename: file,
        //                     path: filePath
        //                 }
        //             ]
        //         });

        //         sent.push({
        //             id: emp.id,
        //             employee_code: emp.employee_code
        //         });

        //     } catch (err) {

        //         failed.push({
        //             id: emp.id,
        //             employee_code: emp.employee_code,
        //             reason: "Mail failed"
        //         });

        //     }
        // }

        const total = selected.length;
        let count = 0;

        console.log("Starting mail send...");
        console.log("Total:", total);

        for (const emp of selected) {

            count++;

            console.log(
                `[${count}/${total}] Sending ${emp.employee_code}...`
            );

            try {

                // Current payslips use EMPLOYEE_CODE-YEAR-MONTH.pdf, while
                // previously generated payslips used EMPLOYEE_CODE.pdf. Keep
                // both formats available when sending existing payslips.
                const employeeCode = String(emp.employee_code).trim().toLowerCase();
                const file = files.find(f => {
                    const normalizedFile = f.toLowerCase();

                    return normalizedFile.endsWith(".pdf") && (
                        normalizedFile === `${employeeCode}.pdf` ||
                        normalizedFile.startsWith(`${employeeCode}-`)
                    );
                });

                if (!file) {

                    console.log(
                        `✖ Failed ${emp.employee_code} (PDF not found)`
                    );

                    failed.push({
                        id: emp.id,
                        employee_code: emp.employee_code,
                        reason: "Payslip not found"
                    });

                    continue;
                }

                const filePath = path.join(PDF_FOLDER, file);

                const mailBody =
                    body.replace(
                        "{employee_code}",
                        emp.employee_code
                    );

                await sendMail({
                    to: emp.email,
                    subject,
                    text: mailBody,
                    attachments: [
                        {
                            filename: file,
                            path: filePath
                        }
                    ]
                });

                //Delay between mails to avoid spam issues (adjust as needed)
                // await new Promise(r => setTimeout(r, 3000));

                console.log(
                    `✔ Sent ${emp.employee_code}`
                );

                sent.push({
                    id: emp.id,
                    employee_code: emp.employee_code
                });

            } catch (err) {

                console.error(
                    `Failed to send payslip for ${emp.employee_code}:`,
                    err
                );

                console.log(
                    `✖ Failed ${emp.employee_code}`
                );

                failed.push({
                    id: emp.id,
                    employee_code: emp.employee_code,
                    reason: "Mail failed"
                });
            }
        }

        console.log(
            `Done. Sent: ${sent.length} | Failed: ${failed.length}`
        );

        res.json({
            sent,
            failed
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Send failed"
        });
    }

});

module.exports = router;

