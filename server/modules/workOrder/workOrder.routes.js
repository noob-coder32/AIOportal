const express = require("express");

const { getAllWorkOrdersMergedPdf, getWorkOrderPdf } = require("./workOrder.service");

const router = express.Router();

function sendPdfResponse(res, payload) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${payload.fileName}"`);
    res.send(payload.pdf);
}

router.get("/all/pdf", async (req, res) => {
    try {
        const payload = await getAllWorkOrdersMergedPdf({
            requestedBy: req.user?.fullName || req.user?.username || "",
        });

        sendPdfResponse(res, payload);
    } catch (error) {
        console.error("Error generating merged WO/PO:", error);

        if (error.statusCode === 404) {
            return res.status(404).json({ message: "No order documents found" });
        }

        return res.status(500).json({ message: "Failed to generate merged WO/PO" });
    }
});

router.get("/:poHdrId/pdf", async (req, res) => {
    try {
        const payload = await getWorkOrderPdf({
            poHdrId: req.params.poHdrId,
            requestedBy: req.user?.fullName || req.user?.username || "",
        });

        sendPdfResponse(res, payload);
    } catch (error) {
        console.error("Error generating WO/PO by header id:", error);

        if (error.statusCode === 404) {
            return res.status(404).json({ message: "WO/PO not found" });
        }

        return res.status(500).json({ message: "Failed to generate WO/PO PDF" });
    }
});

router.get("/by-po-no/:poNo/pdf", async (req, res) => {
    try {
        const payload = await getWorkOrderPdf({
            poNo: req.params.poNo,
            requestedBy: req.user?.fullName || req.user?.username || "",
        });

        sendPdfResponse(res, payload);
    } catch (error) {
        console.error("Error generating WO/PO by PO number:", error);

        if (error.statusCode === 404) {
            return res.status(404).json({ message: "WO/PO not found" });
        }

        return res.status(500).json({ message: "Failed to generate WO/PO PDF" });
    }
});

module.exports = router;


