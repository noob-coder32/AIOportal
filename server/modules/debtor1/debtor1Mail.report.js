const ExcelJS = require("exceljs");

function toExcelDate(value) {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;

        // SQL Server DATETIME has no timezone. Preserve its local wall-clock
        // components when Excel serializes the value.
        return new Date(Date.UTC(
            value.getFullYear(),
            value.getMonth(),
            value.getDate(),
            value.getHours(),
            value.getMinutes(),
            value.getSeconds(),
            value.getMilliseconds()
        ));
    }

    const text = String(value).trim();
    const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
        return new Date(
            Date.UTC(
                Number(dateOnlyMatch[1]),
                Number(dateOnlyMatch[2]) - 1,
                Number(dateOnlyMatch[3])
            )
        );
    }

    const indianDateMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (indianDateMatch) {
        return new Date(
            Date.UTC(
                Number(indianDateMatch[3]),
                Number(indianDateMatch[2]) - 1,
                Number(indianDateMatch[1])
            )
        );
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function generateDebtorCreditLimitWorkbook(rows) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AIO Portal";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Credit Limit Changes");
    worksheet.columns = [
        { header: "Change Date", key: "change_date", width: 16, style: { numFmt: "dd/mm/yyyy" } },
        { header: "Debtor Code", key: "debtor_code", width: 20 },
        { header: "Debtor Name", key: "debtor_name", width: 36 },
        { header: "Old Credit Limit", key: "old_value", width: 18, style: { numFmt: "#,##0.00" } },
        { header: "New Credit Limit", key: "new_value", width: 18, style: { numFmt: "#,##0.00" } },
        { header: "Updated By", key: "updated_by", width: 22 },
        { header: "Updated On", key: "updated_on", width: 26, style: { numFmt: "dd/mm/yyyy hh:mm AM/PM" } },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
    };
    worksheet.autoFilter = "A1:G1";

    for (const row of rows) {
        worksheet.addRow({
            change_date: toExcelDate(row.change_date),
            debtor_code: row.debtor_code ?? "",
            debtor_name: row.debtor_name ?? "",
            old_value: row.old_value === null || row.old_value === undefined ? null : Number(row.old_value),
            new_value: row.new_value === null || row.new_value === undefined ? null : Number(row.new_value),
            updated_by: row.updated_by ?? "",
            updated_on: toExcelDate(row.updated_on),
        });
    }

    return workbook.xlsx.writeBuffer();
}

module.exports = { generateDebtorCreditLimitWorkbook };
