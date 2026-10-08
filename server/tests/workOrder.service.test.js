const test = require("node:test");
const assert = require("node:assert/strict");

const {
    mapWorkOrderViewModel,
    formatDate,
} = require("../modules/workOrder/workOrder.service");
const { renderWorkOrderHtml } = require("../modules/workOrder/workOrder.template");

test("mapWorkOrderViewModel maps header and tax visibility", () => {
    const header = {
        company_name: "ASSAM ROOFING LIMITED",
        company_address1: "BONDA NARENGI",
        company_address2: "GUWAHATI",
        company_address3: "781026",
        company_state: "Assam",
        company_phone_nos: "03612640213",
        company_fax_nos: "",
        company_email_id: "INFOGHY@ASSAMROOF.COM",
        GSTN_No: "18AABCA7734K1ZG",
        supplier_name: "ELECTRONICS AND CONTROLS POWER SYSTEM PVT LTD",
        supplier_address1: "29/A, Peenya Industrial Area,",
        supplier_address2: "Bangalore",
        supplier_city_town: "Bangalore",
        supplier_postcode: "560058",
        supplier_state: "Karnataka",
        supplier_pan: "AAACE3200F",
        supplier_gstn: "29AAACE3200F1Z8",
        ship_to_name: "ARL ASBESTOS ASSAM DIVISION",
        ship_to_address: "Bonda, Narangi",
        ship_to_state_name: "Assam",
        ship_to_state_code: "18",
        ship_to_gstin: "18AABCA7734K1ZG",
        division_name: "ASSAM DIVISION",
        po_no: "ARL/ASB/GWH/SB/2025-2026/000258",
        po_date: "2026-03-09T00:00:00.000Z",
        amendment_srl: 0,
        supplier_ref: "REF NO- GHY/AMC/26-27/2113933",
        heading: "WORK ORDER",
        footer_text: "N.B. Challan and Invoices must quote our order no.",
        po_ord_value: 4200,
        po_ord_value_final: 4956,
        round_off: 0,
        amount_words: "FOUR THOUSAND NINE HUNDRED FIFTY SIX ONLY",
        other_charge_name_1: "N/A",
        other_charge_name_2: "N/A",
        other_charge_name_3: "N/A",
        igst_exists: "N",
        cess_exists: "N",
        auth_desig: "Authorised Signatory",
    };

    const detailRows = [
        {
            sl_no: 1,
            item_name: "Annual Maintenance Contract",
            item_remarks: "Location: Asb Plant PLC Room",
            indent_no: "IND-1",
            indent_date: "2026-03-01T00:00:00.000Z",
            hsn_code: "998719",
            item_make: "Online",
            item_model: "Renata 5 KVA",
            item_dimension: "Srl. No.BCC051688017",
            item_qty: 1,
            uom_code: "Each",
            item_rate: 4200,
            item_amount: 4200,
            sgst_rate: 9,
            sgst_value: 378,
            cgst_rate: 9,
            cgst_value: 378,
            igst_rate: 0,
            igst_value: 0,
            cess_rate: 0,
            cess_value: 0,
            item_gross_value: 4956,
            item_net_value: 4200,
        },
    ];

    const termRows = [
        { clause_head: "Price", clause_text: "Ex-Guwahati.", clause_id: 1 },
        { clause_head: "Payment Terms", clause_text: "Within 30 days.", clause_id: 2 },
    ];

    const viewModel = mapWorkOrderViewModel(header, detailRows, "Tester", termRows);

    assert.equal(viewModel.header.companyName, "ASSAM ROOFING LIMITED");
    assert.equal(viewModel.header.poDate, "09/03/2026");
    assert.equal(viewModel.header.preparedBy, "Tester");
    assert.equal(viewModel.taxColumns.showSgst, true);
    assert.equal(viewModel.taxColumns.showCgst, true);
    assert.equal(viewModel.taxColumns.showIgst, false);
    assert.equal(viewModel.totals.finalOrderValue, 4956);
    assert.deepEqual(viewModel.terms.sections, [
        { label: "Price", value: "Ex-Guwahati." },
        { label: "Payment Terms", value: "Within 30 days." },
    ]);
});

test("renderWorkOrderHtml includes critical sections", () => {
    const viewModel = {
        header: {
            companyName: "ASSAM ROOFING LIMITED",
            companyAddressLines: ["BONDA NARENGI", "GUWAHATI", "781026"],
            companyState: "Assam",
            companyPhone: "123",
            companyFax: "",
            companyEmail: "mail@example.com",
            companyGstin: "GSTIN",
            supplierName: "Supplier Name",
            supplierAddressLines: ["Address 1"],
            supplierState: "Assam",
            supplierPan: "PAN",
            supplierGstin: "GST",
            shipToName: "Ship To",
            shipToAddressLines: ["Ship Address"],
            shipToStateName: "Assam",
            shipToStateCode: "18",
            shipToGstin: "GSTIN",
            divisionName: "Division",
            poNo: "PO123",
            poDate: "21/07/2026",
            amendment: 0,
            supplierReference: "REF123",
            title: "WORK ORDER",
            copyLabel: "Supplier Copy",
            heading1: "",
            heading2: "",
            footerText: "Footer text",
            notes: ["Term 1"],
            preparedBy: "Tester",
            checkedBy: "",
            authorisedDesignation: "Authorised Signatory",
            otherChargeName1: "N/A",
            otherChargeName2: "N/A",
        },
        detailRows: [
            {
                slNo: 1,
                itemCode: "S_SC028",
                descriptionLines: ["Annual Maintenance Contract"],
                hsn: "998719",
                makeModelLines: ["Online"],
                dimensionLine: "",
                qtyDisplay: "1.000",
                uom: "Each",
                rate: 4200,
                amount: 4200,
                discountRateDisplay: "-",
                discountAmountDisplay: "-",
                otherCharge1RateDisplay: "-",
                otherCharge1AmountDisplay: "-",
                otherCharge2RateDisplay: "-",
                otherCharge2AmountDisplay: "-",
                cgstRateDisplay: "9.00",
                cgstAmountDisplay: "378.00",
                sgstRateDisplay: "9.00",
                sgstAmountDisplay: "378.00",
                igstRateDisplay: "-",
                igstAmountDisplay: "-",
                cessRateDisplay: "-",
                cessAmountDisplay: "-",
                grossValue: 4956,
            },
        ],
        taxColumns: {
            showSgst: true,
            showCgst: true,
            showIgst: false,
            showCess: false,
        },
        totals: {
            taxSummary: "SGST 378.00 | CGST 378.00",
            baseAmount: 4200,
            grossTotal: 4956,
            otherChargesLabel: "N/A",
            roundOff: 0,
            finalOrderValue: 4956,
            amountWords: "FOUR THOUSAND NINE HUNDRED FIFTY SIX ONLY",
            discountAmountDisplay: "-",
            otherCharge1AmountDisplay: "-",
            otherCharge2AmountDisplay: "-",
            cgstTotalDisplay: "378.00",
            sgstTotalDisplay: "378.00",
            igstTotalDisplay: "-",
            cessTotalDisplay: "0.00",
        },
        terms: {
            sections: [
                { label: "Price", value: "Ex-Guwahati." },
                { label: "Taxes & Duties", value: "GST @ 18% is given in the order." },
            ],
        },
    };

    const html = renderWorkOrderHtml(viewModel);

    assert.match(html, /WORK ORDER/);
    assert.match(html, /Supplier Copy/);
    assert.match(html, /Final Order Value/);
    assert.match(html, /Annual Maintenance Contract/);
});

test("formatDate returns en-GB style date", () => {
    assert.equal(formatDate("2026-07-21T00:00:00.000Z"), "21/07/2026");
});
