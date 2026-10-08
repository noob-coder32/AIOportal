const express = require("express");

const db = require("../../db/coilDetails.db");

const router = express.Router();

const DIVISION_OPTIONS = [
    {
        value: "ARL",
        label: "ARL",
        productionLines: [
            { value: "ETL", label: "ETL" },
            { value: "CRS", label: "CRS" },
            { value: "GL", label: "GL" },
            // { value: "CCL", label: "CCL" },
        ],
    },
    {
        value: "PDP",
        label: "PDP",
        productionLines: [
            { value: "HRS", label: "HRS" },
            { value: "Pickling", label: "Pickling" },
            { value: "Wider Mill", label: "Wider Mill" },
            { value: "Annealing", label: "Annealing" },
            { value: "Segregation", label: "Segregation" },
        ],
    },
];

const DIVISION_MAP = DIVISION_OPTIONS.reduce((map, division) => {
    map[division.value] = division;
    return map;
}, {});

const REQUIRED_FIELDS = [
    "existing_thickness",
    "existing_item_code",
    "existing_output_qty",
    "existing_output_width",
    "existing_output_length",
    "existing_output_grade",
    "existing_output_bw",
    "existing_output_logo",
    "existing_output_print_thickness",
    "existing_output_remarks",
    "to_be_thickness",
    "to_be_item_code",
    "to_be_output_qty",
    "to_be_output_width",
    "to_be_output_length",
    "to_be_output_grade",
    "to_be_output_bw",
    "to_be_output_logo",
    "to_be_output_print_thickness",
    "to_be_output_remarks",
];

const DECIMAL_FIELDS = new Set([
    "existing_thickness",
    "existing_output_qty",
    "existing_output_width",
    "existing_output_length",
    "existing_output_bw",
    "to_be_thickness",
    "to_be_output_qty",
    "to_be_output_width",
    "to_be_output_length",
    "to_be_output_bw",
]);

function normalizeString(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function normalizeDecimal(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = typeof value === "string" ? value.trim() : value;

    if (normalized === "") {
        return null;
    }

    const numberValue = Number(normalized);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function validateDivisionLine(divisionCode, productionLine) {
    const division = DIVISION_MAP[divisionCode];

    if (!division) {
        return "Invalid division selected";
    }

    const isValidLine = division.productionLines.some((line) => line.value === productionLine);

    if (!isValidLine) {
        return "Selected production line does not belong to the chosen division";
    }

    return null;
}

router.get("/options", async (req, res) => {
    res.json({ divisions: DIVISION_OPTIONS });
});

router.get("/recent", async (req, res) => {
    try {
        const rows = await db.getRecentEntries(8);
        res.json(rows);
    } catch (err) {
        console.error("Failed to fetch recent coil detail entries:", err);
        res.status(500).json({ message: "Failed to fetch recent entries" });
    }
});

router.get("/search", async (req, res) => {
    try {
        const coil_no = normalizeString(req.query.coil_no);
        const division_code = normalizeString(req.query.division) || null;
        const production_line = normalizeString(req.query.production_line) || null;

        if (!coil_no) {
            return res.status(400).json({ message: "coil_no is required for search" });
        }

        if (division_code && production_line) {
            const divisionError = validateDivisionLine(division_code, production_line);

            if (divisionError) {
                return res.status(400).json({ message: divisionError });
            }
        } else if (production_line && !division_code) {
            return res.status(400).json({ message: "Division is required when production line is selected" });
        }

        const rows = await db.searchEntries({
            coil_no,
            division_code,
            production_line,
        });

        res.json({
            latest: rows[0] || null,
            history: rows.slice(1),
        });
    } catch (err) {
        console.error("Failed to search coil detail entries:", err);
        res.status(500).json({ message: "Failed to search entries" });
    }
});

router.post("/", async (req, res) => {
    try {
        const coil_no = normalizeString(req.body.coil_no);
        const division_code = normalizeString(req.body.division_code);
        const production_line = normalizeString(req.body.production_line);

        if (!coil_no || !division_code || !production_line) {
            return res.status(400).json({
                message: "coil_no, division_code, and production_line are required",
            });
        }

        const divisionError = validateDivisionLine(division_code, production_line);

        if (divisionError) {
            return res.status(400).json({ message: divisionError });
        }

        const payload = {
            coil_no,
            division_code,
            production_line,
            created_by: req.user?.id || null,
        };

        for (const field of REQUIRED_FIELDS) {
            if (DECIMAL_FIELDS.has(field)) {
                const normalizedValue = normalizeDecimal(req.body[field]);

                if (normalizedValue === null) {
                    return res.status(400).json({ message: `${field} is required` });
                }

                payload[field] = normalizedValue;
                continue;
            }

            const normalizedValue = normalizeString(req.body[field]);

            if (!normalizedValue) {
                return res.status(400).json({ message: `${field} is required` });
            }

            payload[field] = normalizedValue;
        }

        const entry = await db.createEntry(payload);

        res.json({
            message: "Coil details saved successfully",
            entry,
        });
    } catch (err) {
        console.error("Failed to create coil detail entry:", err);
        res.status(500).json({ message: "Failed to save coil details" });
    }
});

module.exports = router;
