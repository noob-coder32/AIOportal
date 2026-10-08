function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function money(value) {
    if (value === "" || value == null) {
        return "";
    }

    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
        return "";
    }

    return numberValue.toFixed(2);
}

function lineBlock(lines, className = "") {
    const content = (lines || [])
        .filter(Boolean)
        .map((line) => `<div>${escapeHtml(line)}</div>`)
        .join("");

    return `<div class="${className}">${content}</div>`;
}

function renderWorkOrderHtml(viewModel) {
    const {
        header,
        detailRows,
        totals,
        terms,
    } = viewModel;

    const rowsHtml = detailRows.map((row) => `
        <tr>
            <td class="center">${escapeHtml(row.slNo)}</td>
            <td class="center">${escapeHtml(row.itemCode)}</td>
            <td class="description-cell">
                ${lineBlock(row.descriptionLines)}
                ${lineBlock(row.makeModelLines)}
                ${row.dimensionLine ? `<div>${escapeHtml(row.dimensionLine)}</div>` : ""}
            </td>
            <td class="center">${escapeHtml(row.hsn)}</td>
            <td class="right">${escapeHtml(row.qtyDisplay)}</td>
            <td class="center">${escapeHtml(row.uom)}</td>
            <td class="right">${money(row.rate)}</td>
            <td class="right">${money(row.amount)}</td>
            <td class="center">${escapeHtml(row.discountRateDisplay)}</td>
            <td class="right">${escapeHtml(row.discountAmountDisplay)}</td>
            <td class="center">${escapeHtml(row.otherCharge1RateDisplay)}</td>
            <td class="right">${escapeHtml(row.otherCharge1AmountDisplay)}</td>
            <td class="center">${escapeHtml(row.otherCharge2RateDisplay)}</td>
            <td class="right">${escapeHtml(row.otherCharge2AmountDisplay)}</td>
            <td class="center">${escapeHtml(row.cgstRateDisplay)}</td>
            <td class="right">${escapeHtml(row.cgstAmountDisplay)}</td>
            <td class="center">${escapeHtml(row.sgstRateDisplay)}</td>
            <td class="right">${escapeHtml(row.sgstAmountDisplay)}</td>
            <td class="center">${escapeHtml(row.igstRateDisplay)}</td>
            <td class="right">${escapeHtml(row.igstAmountDisplay)}</td>
            <td class="center">${escapeHtml(row.cessRateDisplay)}</td>
            <td class="right">${escapeHtml(row.cessAmountDisplay)}</td>
            <td class="right value-cell">${money(row.grossValue)}</td>
        </tr>
    `).join("");

    const termsHtml = terms.sections.map((section) => `
        <div class="terms-row">
            <div class="terms-label">${escapeHtml(section.label)}</div>
            <div class="terms-value">${escapeHtml(section.value || "")}</div>
        </div>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(header.title)} - ${escapeHtml(header.poNo)}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 7mm 7mm 9mm 7mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9.4px;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .document {
            width: 100%;
        }

        .top-header {
            position: relative;
            min-height: 82px;
            margin-bottom: 4px;
        }

        .top-left {
            position: absolute;
            left: 0;
            top: 0;
            width: 34%;
        }

        .top-center {
            width: 100%;
            text-align: center;
        }

        .top-right {
            position: absolute;
            right: 0;
            top: 0;
            width: 28%;
        }

        .company-name {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 3px;
            text-transform: uppercase;
        }

        .title-block {
            text-align: center;
            padding-top: 2px;
        }

        .title-block .title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 1px;
        }

        .title-block .copy {
            font-size: 10px;
            font-weight: 700;
        }

        .contact-block {
            padding-top: 16px;
            font-size: 9px;
        }

        .contact-row {
            display: flex;
            gap: 6px;
            margin-bottom: 4px;
        }

        .contact-label {
            width: 34px;
        }

        .financial-note {
            text-align: right;
            margin-top: 12px;
            font-size: 9px;
        }

        .tax-details {
            margin: 5px 0 6px;
            font-size: 9px;
        }

        .tax-details .heading {
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 2px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .header-table,
        .items-table {
            border: 0.16px solid #444;
        }

        .header-table td,
        .header-table th,
        .items-table td,
        .items-table th {
            border: 0.6px solid #555;
            padding: 1px 2px;
            vertical-align: top;
            overflow: hidden;
            overflow-wrap: anywhere;
            word-break: break-word;
        }

        .header-table td {
            height: 48px;
        }
       
        .mini-title,
        .items-table th {
            font-weight: 700;
        }

        .supplier-box .supplier-name {
            font-size: 9px;
            font-weight: 700;
            margin: 3px 0 4px;
            text-transform: uppercase;
        }

        .supplier-layout {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            column-gap: 8px;
            row-gap: 4px;
            min-height: 86px;
        }

        .supplier-left {
            grid-column: 1;
            grid-row: 1;
        }

        .supplier-right {
            grid-column: 2;
            grid-row: 1;
            text-align: center;
            align-self: start;
        }

        .supplier-meta-label {
            font-weight: 700;
            margin-top: 1px;
        }

        .center {
            text-align: center;
        }

        .right {
            text-align: right;
        }

        .middle {
            vertical-align: middle;
        }

        .seal-cell {
            padding-top: 3px !important;
        }

        .seal-label {
            margin-top: 18px;
            font-size: 9px;
            font-weight: 700;
        }

        .seal-note {
            min-height: 44px;
            font-size: 8.9px;
            line-height: 1.15;
            font-weight: 700;
        }

        .supplier-reference {
            display: grid;
            grid-template-columns: 170px 1fr;
            gap: 10px;
            align-items: start;
            margin: 6px 0 8px;
            font-size: 9px;
        }

        .supplier-reference .label {
            font-weight: 700;
        }

        .supplier-reference-note {
            grid-column: 1 / -1;
            font-weight: 700;
            margin-top: 2px;
        }

        .items-table {
            margin-bottom: 0;
        }

        .items-table thead th {
            background: #fff;
            text-align: center;
            vertical-align: middle;
            padding: 0 1px;
            font-size: 8.1px;
            line-height: 1;
        }

        .items-table .description-cell {
            line-height: 1.02;
            word-break: normal;
            overflow-wrap: break-word;
        }

        .items-table .value-cell {
            font-weight: 400;
        }

        .items-table tbody td {
            font-size: 8.3px;
            line-height: 1.01;
        }

        .items-table tbody td:nth-child(7),
        .items-table tbody td:nth-child(8),
        .items-table tbody td:nth-child(9),
        .items-table tbody td:nth-child(10),
        .items-table tbody td:nth-child(11),
        .items-table tbody td:nth-child(12),
        .items-table tbody td:nth-child(13),
        .items-table tbody td:nth-child(14),
        .items-table tbody td:nth-child(15),
        .items-table tbody td:nth-child(16),
        .items-table tbody td:nth-child(17),
        .items-table tbody td:nth-child(18),
        .items-table tbody td:nth-child(19),
        .items-table tbody td:nth-child(20),
        .items-table tbody td:nth-child(21),
        .items-table tbody td:nth-child(22),
        .items-table tbody td:nth-child(23) {
            white-space: nowrap;
            word-break: keep-all;
            overflow-wrap: normal;
        }

        .totals-row td,
        .amount-words-row td,
        .final-row td {
            font-weight: 700;
        }

        .amount-words-row .summary-label,
        .final-row .summary-label {
            border-left: none;
            text-align: right;
            padding-right: 6px;
            white-space: nowrap;
        }

        .amount-words-label {
            width: 140px;
            font-weight: 700;
        }

        .label-total {
            text-align: right;
            font-weight: 700;
        }

        .terms-section {
            margin-top: 10px;
            font-size: 9px;
        }   

        .terms-row {
            display: grid;
            grid-template-columns: 110px 1fr;
            gap: 8px;
            margin-bottom: 1px;
        }

        .terms-label {
            font-weight: 700;
        }

        .ship-to-block {
            margin-top: 10px;
            border: 0.6px solid #555;
            font-size: 8.8px;
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .ship-to-title {
            padding: 1px 4px;
            border-bottom: 0.6px solid #555;
            font-weight: 700;
        }

        .ship-to-body {
            padding: 2px 4px 1px;
            line-height: 1.08;
        }

        .ship-to-name {
            font-weight: 700;
            margin-bottom: 2px;
        }

        .ship-to-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 2px;
        }

        .signature-strip {
            display: grid;
            grid-template-columns: 1fr 1fr 1.2fr;
            align-items: end;
            margin-top: 8px;
            min-height: 38px;
            font-size: 8.8px;
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .header-table,
        .header-table tr,
        .supplier-box,
        .ship-to-section {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .signature-label {
            font-weight: 700;
        }

        .signature-center {
            text-align: center;
        }

        .signature-right {
            text-align: center;
        }

        .footer-spacer {
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <div class="document">
        <div class="top-header">
            <div class="top-left">
                <div class="company-name">${escapeHtml(header.companyName)}</div>
                ${lineBlock(header.companyAddressLines)}
            </div>
            <div class="top-center">
                <div class="title-block">
                    <div class="title">${escapeHtml(header.title)}</div>
                    <div class="copy">(${escapeHtml(header.copyLabel || "Supplier Copy")})</div>
                </div>
            </div>
            <div class="top-right">
                <div class="contact-block">
                    <div class="contact-row"><div class="contact-label">Phone :</div><div>${escapeHtml(header.companyPhone)}</div></div>
                    <div class="contact-row"><div class="contact-label">Fax</div><div>: ${escapeHtml(header.companyFax)}</div></div>
                    <div class="contact-row"><div class="contact-label">Email</div><div>: ${escapeHtml(header.companyEmail)}</div></div>
                    <div class="financial-note">All financials are in (Rs.)</div>
                </div>
            </div>
        </div>

        <div class="tax-details">
            <div class="heading">Tax Registration Details:</div>
            <div>GSTIN : ${escapeHtml(header.companyGstin)}</div>
        </div>

        <table class="header-table">
            <colgroup>
                <col style="width:36%">
                <col style="width:23.5%">
                <col style="width:10.5%">
                <col style="width:30%">
            </colgroup>
            <tr>
                <td class="supplier-box">
                    <div class="mini-title">Supplier : (${escapeHtml(header.supplierCode)})</div>
                    <div class="supplier-layout">
                        <div class="supplier-left">
                            <div class="supplier-name">${escapeHtml(header.supplierName)}</div>
                            ${lineBlock(header.supplierAddressLines)}
                        </div>
                        <div class="supplier-right">
                            <div class="supplier-meta-label">GSTIN</div>
                            <div>${escapeHtml(header.supplierGstin)}</div>
                            <div class="supplier-meta-label">PAN</div>
                            <div>${escapeHtml(header.supplierPan)}</div>
                        </div>
                    </div>
                </td>
                <td class="center middle">
                    <div class="mini-title">Order No.</div>
                    <div style="margin-top: 6px;">${escapeHtml(header.poNo)}</div>
                    <div class="mini-title" style="margin-top: 8px;">For</div>
                    <div>${escapeHtml(header.shipToName)}</div>
                    <div>${escapeHtml(header.divisionName)}</div>
                </td>   
                <td class="center middle">
                    <div class="mini-title">Date</div>
                    <div style="margin-top: 6px;">${escapeHtml(header.poDate)}</div>
                    <div class="mini-title" style="margin-top: 8px;">Amendment #</div>
                    <div>${escapeHtml(header.amendment)}</div>
                </td>
                <td class="seal-cell">
                    <div class="seal-note">${escapeHtml(header.heading1)}</div>
                    <div class="seal-label">Seal &amp; Signature of supplier</div>
                    <div class="seal-label" style="margin-top: 10px;">Date :</div>
                </td>
            </tr>
        </table>

        <div class="supplier-reference">
            <div class="label">Supplier Reference</div>
            <div>${escapeHtml(header.supplierReference)}</div>
            <div class="supplier-reference-note">${escapeHtml(header.heading2)}</div>
        </div>

        <table class="items-table">
            <colgroup>
                <col style="width:1.8%">
                <col style="width:4.5%"> 
                <col style="width:19.0%">
                <col style="width:4.4%">
                <col style="width:3.9%">
                <col style="width:2.3%">
                <col style="width:3.8%">
                <col style="width:5.0%">
                <col style="width:3.2%">
                <col style="width:3.5%">
                <col style="width:3.4%">
                <col style="width:3.2%">
                <col style="width:2.95%">
                <col style="width:3.2%">
                <col style="width:2.95%">
                <col style="width:3.55%">
                <col style="width:2.95%">
                <col style="width:3.55%">
                <col style="width:2.95%">
                <col style="width:3.55%">
                <col style="width:2.95%">
                <col style="width:3.55%">
                <col style="width:5.50%">
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="3">Sl.<br>No.</th>
                    <th rowspan="3">Code</th>
                    <th rowspan="3">Item Description</th>
                    <th rowspan="3">HSN<br>Code</th>
                    <th rowspan="3">Qty.</th>
                    <th rowspan="3">UOM</th>
                    <th rowspan="3">Rate</th>
                    <th rowspan="3">Amount</th>
                    <th colspan="2" rowspan="2">Discount</th>
                    <th colspan="4">Other Charges</th>
                    <th colspan="8">Taxes &amp; CESS</th>
                    <th rowspan="3">Item Value</th>
                </tr>
                <tr>
                    <th colspan="2">${escapeHtml(header.otherChargeName1)}</th>
                    <th colspan="2">${escapeHtml(header.otherChargeName2)}</th>
                    <th colspan="2">CGST</th>
                    <th colspan="2">SGST/UGST</th>
                    <th colspan="2">IGST</th>
                    <th colspan="2">CESS</th>
                </tr>
                <tr>
                    <th>Rate</th>
                    <th>Amt.</th>
                    <th>Rate</th>
                    <th>Amt.</th>
                    <th>Rate</th>
                    <th>Amt.</th>
                    <th>%</th>
                    <th>Amt.</th>
                    <th>%</th>
                    <th>Amt.</th>
                    <th>%</th>
                    <th>Amt.</th>
                    <th>Rate</th>
                    <th>Amt.</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                <tr class="totals-row">
                    <td colspan="7" class="label-total">Total :</td>
                    <td class="right">${money(totals.baseAmount)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.discountAmountDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.otherCharge1AmountDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.otherCharge2AmountDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.cgstTotalDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.sgstTotalDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.igstTotalDisplay)}</td>
                    <td></td>
                    <td class="right">${escapeHtml(totals.cessTotalDisplay)}</td>
                    <td class="right">${money(totals.grossTotal)}</td>
                </tr>
                <tr class="amount-words-row">
                    <td colspan="20">(In Words)</td>
                    <td colspan="2" class="summary-label">Round Off</td>
                    <td class="right">${money(totals.roundOff)}</td>
                </tr>
                <tr class="final-row">
                    <td colspan="20">${escapeHtml(totals.amountWords)}</td>
                    <td colspan="2" class="summary-label">Final Order Value</td>
                    <td class="right">${money(totals.finalOrderValue)}</td>
                </tr>
            </tbody>
        </table>

        <div class="terms-section">
            ${termsHtml}
        </div>

        <div class="ship-to-section">
            <div class="ship-to-block">
                <div class="ship-to-title">Ship To :-</div>
                <div class="ship-to-body">
                    <div class="ship-to-name">${escapeHtml(header.shipToName)}</div>
                    ${lineBlock(header.shipToAddressLines)}
                    <div class="ship-to-meta">
                        <span><strong>GSTIN :</strong> ${escapeHtml(header.shipToGstin)}</span>
                        <span><strong>State :</strong> ${escapeHtml(header.shipToStateName)}</span>
                        <span><strong>State Code :</strong> ${escapeHtml(header.shipToStateCode)}</span>
                    </div>
                </div>
            </div>

            <div class="signature-strip">
                <div class="signature-label">Prepared By</div>
                <div class="signature-label signature-center">Checked By</div>
                <div class="signature-right">
                    <div class="signature-label">for ${escapeHtml(header.companyName)}</div>
                    <div style="margin-top: 18px; font-weight: 700;">Authorised Signatory</div>
                </div>
            </div>
        </div>

        <div class="footer-spacer"></div>
    </div>
</body>
</html>
    `.trim();
}

module.exports = {
    renderWorkOrderHtml,
};
