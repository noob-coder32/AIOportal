const { ToWords } = require("to-words");
const { PDFDocument } = require("pdf-lib");

const workOrderDb = require("../../db/workOrder.db");
const { renderWorkOrderHtml } = require("./workOrder.template");
const { renderHtmlToPdf } = require("./workOrder.pdf");

const toWords = new ToWords({
    localeCode: "en-IN",
    converterOptions: {
        currency: true,
        ignoreDecimal: true,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
    },
});

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    if (date.getUTCFullYear() < 2000) {
        return "";
    }

    return new Intl.DateTimeFormat("en-GB").format(date);
}

function formatNumber(value, minimumFractionDigits = 2, maximumFractionDigits = 2) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
        return "";
    }

    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(numberValue);
}

function cleanLines(values) {
    return values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
}

function buildAmountWords(header) {
    if (header.amount_words) {
        return String(header.amount_words).trim();
    }

    const value = Number(header.po_ord_value_final ?? header.po_ord_value ?? 0);
    if (!value) {
        return "";
    }

    return toWords.convert(value).replace(/^Rupees\s+/i, "").toUpperCase();
}

function buildNoteList(header) {
    return cleanLines([
        header.heading1,
        header.heading2,
        header.supplier_ref,
        header.footer_text,
    ]);
}

function compactValue(value) {
    return String(value ?? "").trim();
}

function joinText(parts) {
    return parts
        .map((part) => compactValue(part))
        .filter(Boolean)
        .join(" ");
}

function buildOtherChargesLabel(header) {
    return cleanLines([
        header.other_charge_name_1,
        header.other_charge_name_2,
        header.other_charge_name_3,
    ]).join(", ") || "N/A";
}

function buildTaxSummary(detailRows) {
    const totals = {
        sgst: 0,
        cgst: 0,
        igst: 0,
        cess: 0,
    };

    for (const row of detailRows) {
        totals.sgst += Number(row.sgst_value || 0);
        totals.cgst += Number(row.cgst_value || 0);
        totals.igst += Number(row.igst_value || 0);
        totals.cess += Number(row.cess_value || 0);
    }

    const parts = [];
    if (totals.sgst) {
        parts.push(`SGST ${formatNumber(totals.sgst)}`);
    }
    if (totals.cgst) {
        parts.push(`CGST ${formatNumber(totals.cgst)}`);
    }
    if (totals.igst) {
        parts.push(`IGST ${formatNumber(totals.igst)}`);
    }
    if (totals.cess) {
        parts.push(`CESS ${formatNumber(totals.cess)}`);
    }

    return parts.join(" | ") || "As applicable";
}

function sumBy(detailRows, key) {
    return detailRows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

function dedupeDetailRows(detailRows) {
    const seen = new Set();
    const uniqueRows = [];

    for (const row of detailRows) {
        const key = JSON.stringify([
            row.sl_no,
            row.item_code,
            row.hsn_code,
            row.item_name,
            row.item_make,
            row.item_model,
            row.item_dimension,
            row.item_remarks,
            row.item_qty,
            row.uom_code,
            row.item_rate,
            row.item_amount,
            row.item_discount_rate,
            row.item_discount_value,
            row.other_charge_rate_1,
            row.other_charge_amount_1,
            row.other_charge_rate_2,
            row.other_charge_amount_2,
            row.other_charge_rate_3,
            row.other_charge_amount_3,
            row.sgst_rate,
            row.sgst_value,
            row.cgst_rate,
            row.cgst_value,
            row.igst_rate,
            row.igst_value,
            row.cess_rate,
            row.cess_value,
            row.item_gross_value,
        ]);

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        uniqueRows.push(row);
    }

    return uniqueRows;
}

function formatTaxCell(rate, value) {
    const numericRate = Number(rate || 0);
    const numericValue = Number(value || 0);

    if (!numericRate && !numericValue) {
        return "";
    }

    return `${formatNumber(numericRate)}% / ${formatNumber(numericValue)}`;
}

function formatDiscountRate(rate, rateType) {
    const numericRate = Number(rate || 0);
    const normalizedRateType = String(rateType || "").trim();

    if (!numericRate) {
        return "-";
    }

    if (!normalizedRateType) {
        return formatNumber(numericRate);
    }

    return `${formatNumber(numericRate)}${normalizedRateType}`;
}

function buildDescriptionLines(row) {
    return cleanLines([
        row.item_name,
        row.item_make,
        row.item_remarks,
        row.indent_no ? `Indent: ${row.indent_no}` : "",
        row.indent_date ? `Indent Date: ${formatDate(row.indent_date)}` : "",
    ]);
}

function buildMakeModelLines(row) {
    return cleanLines([
        row.item_model,
        row.item_dimension,
    ]);
}

function buildDocumentType(heading) {
    const normalizedHeading = String(heading || "").trim();
    const safeHeading = normalizedHeading.replace(/[^\w\s-]+/g, "").trim();
    const fallbackHeading = "ORDER";

    return {
        label: safeHeading || fallbackHeading,
        fileSlug: (safeHeading || fallbackHeading)
            .toLowerCase()
            .replace(/\s+/g, "-"),
    };
}

function buildTermsSections(termRows) {
    const preferredClauseIdGroups = [
        [54, 56, 62], // Price
        [51, 55, 63], // Taxes & Duties
        [53, 58, 64], // Delivery Schedule
        [33, 59], // Payment
        [31], // Payment Terms
        [16, 18, 57], // Despatch Instruction
        [52, 66], // Insurance Terms
        [46, 48], // Other Term
        [61], // Other Terms
        [75, 77, 79], // GST Compliance
    ];
    const clauseIdRank = new Map();
    preferredClauseIdGroups.forEach((group, index) => {
        group.forEach((clauseId) => {
            clauseIdRank.set(clauseId, index);
        });
    });

    const normalizedSections = (termRows || [])
        .map((row) => ({
            label: compactValue(row.clause_head),
            value: compactValue(row.clause_text),
            clauseId: Number(row.clause_id || 0),
        }))
        .filter((section) => section.label || section.value);

    normalizedSections.sort((left, right) => {
        const leftIndex = clauseIdRank.has(left.clauseId) ? clauseIdRank.get(left.clauseId) : -1;
        const rightIndex = clauseIdRank.has(right.clauseId) ? clauseIdRank.get(right.clauseId) : -1;

        if (leftIndex !== -1 || rightIndex !== -1) {
            if (leftIndex === -1) {
                return 1;
            }
            if (rightIndex === -1) {
                return -1;
            }
            if (leftIndex !== rightIndex) {
                return leftIndex - rightIndex;
            }
        }

        if (left.clauseId !== right.clauseId) {
            return left.clauseId - right.clauseId;
        }

        return left.label.localeCompare(right.label);
    });

    return normalizedSections.map(({ label, value }) => ({ label, value }));
}

function mapWorkOrderViewModel(header, detailRows, requestedBy = "", termRows = []) {
    const normalizedDetailRows = dedupeDetailRows(detailRows);

    const showSgst = normalizedDetailRows.some((row) => Number(row.sgst_rate || 0) || Number(row.sgst_value || 0));
    const showCgst = normalizedDetailRows.some((row) => Number(row.cgst_rate || 0) || Number(row.cgst_value || 0));
    const showIgst = normalizedDetailRows.some((row) => Number(row.igst_rate || 0) || Number(row.igst_value || 0)) || header.igst_exists === "Y";
    const showCess = normalizedDetailRows.some((row) => Number(row.cess_rate || 0) || Number(row.cess_value || 0)) || header.cess_exists === "Y";

    const mappedRows = normalizedDetailRows.map((row, index) => ({
        slNo: row.sl_no ?? index + 1,
        itemCode: row.item_code || "",
        descriptionLines: buildDescriptionLines(row),
        hsn: row.hsn_code || "",
        makeModelLines: buildMakeModelLines(row),
        dimensionLine: compactValue(row.item_dimension),
        qtyDisplay: formatNumber(row.item_qty, 3, 3),
        uom: row.uom_code || "",
        rate: Number(row.item_rate || 0),
        amount: Number(row.item_amount || 0),
        discountRateDisplay: formatDiscountRate(row.item_discount_rate, row.item_discount_rate_type),
        discountAmountDisplay: Number(row.item_discount_value || 0) ? formatNumber(row.item_discount_value) : "-",
        otherCharge1RateDisplay: Number(row.other_charge_rate_1 || 0) ? formatNumber(row.other_charge_rate_1) : "-",
        otherCharge1AmountDisplay: Number(row.other_charge_amount_1 || 0) ? formatNumber(row.other_charge_amount_1) : "-",
        otherCharge2RateDisplay: Number(row.other_charge_rate_2 || 0) ? formatNumber(row.other_charge_rate_2) : "-",
        otherCharge2AmountDisplay: Number(row.other_charge_amount_2 || 0) ? formatNumber(row.other_charge_amount_2) : "-",
        cgstRateDisplay: Number(row.cgst_rate || 0) ? formatNumber(row.cgst_rate) : "-",
        cgstAmountDisplay: Number(row.cgst_value || 0) ? formatNumber(row.cgst_value) : "-",
        sgstRateDisplay: Number(row.sgst_rate || 0) ? formatNumber(row.sgst_rate) : "-",
        sgstAmountDisplay: Number(row.sgst_value || 0) ? formatNumber(row.sgst_value) : "-",
        igstRateDisplay: Number(row.igst_rate || 0) ? formatNumber(row.igst_rate) : "-",
        igstAmountDisplay: Number(row.igst_value || 0) ? formatNumber(row.igst_value) : "-",
        cessRateDisplay: Number(row.cess_rate || 0) ? formatNumber(row.cess_rate) : "-",
        cessAmountDisplay: Number(row.cess_value || 0) ? formatNumber(row.cess_value) : "-",
        grossValue: Number(row.item_gross_value || row.item_net_value || 0),
    }));

    const baseAmount = sumBy(normalizedDetailRows, "item_amount");
    const grossTotal = sumBy(normalizedDetailRows, "item_gross_value") || sumBy(normalizedDetailRows, "item_net_value");
    const discountTotal = sumBy(normalizedDetailRows, "item_discount_value");
    const otherCharge1Total = sumBy(normalizedDetailRows, "other_charge_amount_1");
    const otherCharge2Total = sumBy(normalizedDetailRows, "other_charge_amount_2");
    const cgstTotal = sumBy(normalizedDetailRows, "cgst_value");
    const sgstTotal = sumBy(normalizedDetailRows, "sgst_value");
    const igstTotal = sumBy(normalizedDetailRows, "igst_value");
    const cessTotal = sumBy(normalizedDetailRows, "cess_value");

    return {
        header: {
            companyName: header.company_name || "",
            companyAddressLines: cleanLines([
                header.company_address1,
                header.company_address2,
                header.company_address3,
            ]),
            companyState: header.company_state || "",
            companyPhone: header.company_phone_nos || "",
            companyFax: header.company_fax_nos || "",
            companyEmail: header.company_email_id || "",
            companyGstin: header.GSTN_No || "",
            supplierName: header.supplier_name || "",
            supplierAddressLines: cleanLines([
                header.supplier_address1,
                header.supplier_address2,
                [header.supplier_city_town, header.supplier_postcode].filter(Boolean).join(" "),
                header.supplier_state,
            ]),
            supplierState: header.supplier_state || "",
            supplierCode: header.supplier_code || "",
            supplierCity: header.supplier_city_town || "",
            supplierPostcode: header.supplier_postcode || "",
            supplierPan: header.supplier_pan || "",
            supplierGstin: header.supplier_gstn || "",
            shipToName: header.ship_to_name || "",
            shipToAddressLines: cleanLines([
                header.ship_to_address,
            ]),
            shipToStateName: header.ship_to_state_name || "",
            shipToStateCode: header.ship_to_state_code || "",
            shipToGstin: header.ship_to_gstin || "",
            divisionName: header.division_name || "",
            poNo: header.po_no || "",
            poDate: formatDate(header.po_date),
            amendment: header.amendment_srl ?? "",
            supplierReference: header.supplier_ref || "",
            title: header.heading || "WORK ORDER",
            copyLabel: "Supplier Copy",
            heading1: header.heading1 || "",
            heading2: header.heading2 || "",
            footerText: header.footer_text || "",
            notes: buildNoteList(header),
            preparedBy: requestedBy || "",
            checkedBy: "",
            authorisedDesignation: header.auth_desig || "Authorised Signatory",
            otherChargeName1: header.other_charge_name_1 || "N/A",
            otherChargeName2: header.other_charge_name_2 || "N/A",
        },
        detailRows: mappedRows,
        taxColumns: {
            showSgst,
            showCgst,
            showIgst,
            showCess,
        },
        totals: {
            baseAmount,
            grossTotal: Number(header.po_ord_value || grossTotal || 0),
            otherChargesLabel: buildOtherChargesLabel(header),
            roundOff: Number(header.round_off || 0),
            finalOrderValue: Number(header.po_ord_value_final || header.po_ord_value || grossTotal || 0),
            amountWords: buildAmountWords(header),
            taxSummary: buildTaxSummary(normalizedDetailRows),
            discountAmountDisplay: discountTotal ? formatNumber(discountTotal) : "-",
            otherCharge1AmountDisplay: otherCharge1Total ? formatNumber(otherCharge1Total) : "-",
            otherCharge2AmountDisplay: otherCharge2Total ? formatNumber(otherCharge2Total) : "-",
            cgstTotalDisplay: cgstTotal ? formatNumber(cgstTotal) : "-",
            sgstTotalDisplay: sgstTotal ? formatNumber(sgstTotal) : "-",
            igstTotalDisplay: igstTotal ? formatNumber(igstTotal) : "-",
            cessTotalDisplay: cessTotal ? formatNumber(cessTotal) : "0.00",
        },
        terms: {
            sections: buildTermsSections(termRows),
        },
    };
}

async function getWorkOrderData({ poHdrId, poNo }) {
    const header = poHdrId
        ? await workOrderDb.getWorkOrderHeaderById(poHdrId)
        : await workOrderDb.getWorkOrderHeaderByPoNo(poNo);

    if (!header) {
        const error = new Error("Work order not found");
        error.statusCode = 404;
        throw error;
    }

    const [detailRows, termRows] = await Promise.all([
        workOrderDb.getWorkOrderDetails(header.po_hdr_id),
        workOrderDb.getWorkOrderTerms(header.po_hdr_id),
    ]);
    return { header, detailRows, termRows };
}

async function buildWorkOrderPayload({ header, detailRows, termRows, requestedBy }) {
    const viewModel = mapWorkOrderViewModel(header, detailRows, requestedBy, termRows);
    const documentType = buildDocumentType(viewModel.header.title);
    const html = renderWorkOrderHtml(viewModel);
    const pdf = await renderHtmlToPdf(html, {
        footerText: header.footer_text || "",
    });

    return {
        pdf,
        fileName: `${documentType.fileSlug}-${header.po_no || header.po_hdr_id}.pdf`.replace(/[^\w.-]+/g, "_"),
        html,
        viewModel,
        poHdrId: header.po_hdr_id,
        poNo: header.po_no,
    };
}

async function getWorkOrderPdf({ poHdrId, poNo, requestedBy }) {
    const { header, detailRows, termRows } = await getWorkOrderData({ poHdrId, poNo });
    return buildWorkOrderPayload({ header, detailRows, termRows, requestedBy });
}

async function getAllWorkOrdersMergedPdf({ requestedBy }) {
    const headers = await workOrderDb.getAllWorkOrderHeaders();

    if (!headers.length) {
        const error = new Error("No work orders found");
        error.statusCode = 404;
        throw error;
    }

    const mergedPdf = await PDFDocument.create();
    const documentTypeSlugs = new Set();

    for (const header of headers) {
        const [detailRows, termRows] = await Promise.all([
            workOrderDb.getWorkOrderDetails(header.po_hdr_id),
            workOrderDb.getWorkOrderTerms(header.po_hdr_id),
        ]);
        const payload = await buildWorkOrderPayload({
            header,
            detailRows,
            termRows,
            requestedBy,
        });
        documentTypeSlugs.add(buildDocumentType(header.heading).fileSlug);

        const sourcePdf = await PDFDocument.load(payload.pdf);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        for (const page of pages) {
            mergedPdf.addPage(page);
        }
    }

    const pdf = await mergedPdf.save();

    return {
        pdf: Buffer.from(pdf),
        fileName: "merged_orders.pdf",
        count: headers.length,
    };
}

module.exports = {
    getAllWorkOrdersMergedPdf,
    getWorkOrderPdf,
    getWorkOrderData,
    mapWorkOrderViewModel,
    formatDate,
};
