// backend/modules/payslip/pdf.generator.js
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

async function generatePayslipPdf(excelFilePath) {
    const PDF_OUT_DIR = path.join(__dirname, "output", "pdf");

    if (!fs.existsSync(PDF_OUT_DIR)) {
        fs.mkdirSync(PDF_OUT_DIR, { recursive: true });
    }

    const command = `"soffice" --headless --convert-to pdf "${excelFilePath}" --outdir "${PDF_OUT_DIR}"`;

    return new Promise((resolve, reject) => {
        exec(command, { timeout: 30000 }, (error) => {
            if (error) {
                return reject(new Error("PDF conversion failed"));
            }

            const pdfFile = excelFilePath
                .replace(/\.xlsx$/, ".pdf")
                .replace("excel", "pdf");

            resolve(pdfFile);
        });
    });
}

module.exports = generatePayslipPdf;
