const express = require("express");
const router = express.Router();

const db = require("../../db/thicknessChange.db");
const thicknessDb = require("../../db/thickness2.db");

// GET
router.get("/", async (req, res) => {
    try {
        res.json(await db.getRequests());
    } catch (err) {
        res.status(500).json({ message: "Fetch failed" });
    }
});

// POST
router.post("/", async (req, res) => {
    try {
        const {
            coil_no,
            thickness,
            qty,
            to_be_thickness,
            width,
            bundle_weight,
            remark
        } = req.body;

        const toNumberOrNull = (value) => {
            if (value === null || value === undefined) return null;
            if (typeof value === "string" && value.trim() === "") return null;
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
        };

        const normalizedCoilNo = typeof coil_no === "string" ? coil_no.trim() : coil_no;
        const normalizedThickness = toNumberOrNull(thickness);
        const normalizedQty = toNumberOrNull(qty);
        const normalizedToBeThickness = toNumberOrNull(to_be_thickness);
        const normalizedWidth = toNumberOrNull(width);
        const normalizedBundleWeight = toNumberOrNull(bundle_weight);
        const normalizedRemark = typeof remark === "string" && remark.trim() ? remark.trim() : null;

        if (
            !normalizedCoilNo ||
            normalizedThickness === null ||
            normalizedQty === null ||
            normalizedToBeThickness === null ||
            normalizedWidth === null
        ) {
            return res.status(400).json({ message: "All required fields except bundle weight are required" });
        }

        const hasBundleWeight = normalizedBundleWeight !== null;

        if (hasBundleWeight) {
            const masterRow = await thicknessDb.getMasterByThicknessAndWidth(
                normalizedToBeThickness,
                normalizedWidth
            );

            if (!masterRow) {
                return res.status(400).json({
                    message:
                        "No matching thickness master record found for the entered thickness and width. Please verify values."
                });
            }

            const minRange = Number(masterRow.min_range);
            const maxRange = Number(masterRow.max_range);
            const isOutOfRange =
                normalizedBundleWeight < minRange || normalizedBundleWeight > maxRange;

            if (isOutOfRange && !normalizedRemark) {
                return res.status(400).json({
                    message:
                        "Remark is required when bundle weight is out of range. Please enter a remark."
                });
            }
        }

        await db.createRequest({
            coil_no: normalizedCoilNo,
            thickness: normalizedThickness,
            qty: normalizedQty,
            to_be_thickness: normalizedToBeThickness,
            width: normalizedWidth,
            bundle_weight: normalizedBundleWeight,
            remark: normalizedRemark,
            requested_by: req.user.username
        });

        res.json({ message: "Saved successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Insert failed" });
    }
});

module.exports = router;