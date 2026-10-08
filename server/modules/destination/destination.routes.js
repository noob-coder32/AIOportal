const express = require("express");
const router = express.Router();

const destinationDb = require("../../db/destination.db");

/* =========================
   SEARCH DESTINATIONS
   GET /destination/search
========================= */

router.get("/search", async (req, res) => {
    try {
        const search = req.query.search || "";

        const rows = await destinationDb.searchDestinations(search);

        res.json(rows);
    } catch (err) {
        console.error("Error fetching destinations:", err);
        res.status(500).json({ message: "Failed to fetch destinations" });
    }
});


/* =========================
   UPDATE DESTINATION
   PUT /destination/:id
========================= */

router.put("/:id", async (req, res) => {


    try {
        const id = Number(req.params.id);
        const { distname, pincode } = req.body;

        const destination = await destinationDb.getDestinationById(id);

        if (!destination) {
            return res.status(404).json({ message: "Destination not found" });
        }

        /* Check ONLY if field is being updated */

        if (distname !== undefined && destination.distname) {
            return res.status(400).json({
                message: "District already filled. Editing not allowed."
            });
        }

        if (pincode !== undefined && destination.pincode) {
            return res.status(400).json({
                message: "Pincode already filled. Editing not allowed."
            });
        }

        await destinationDb.updateDestination(id, distname, pincode);

        const userId = req.user?.id || null;

        if (distname !== undefined) {
            await destinationDb.insertDestinationLog(
                id,
                "distname",
                destination.distname,
                distname,
                userId
            );
        }

        if (pincode !== undefined) {
            await destinationDb.insertDestinationLog(
                id,
                "pincode",
                destination.pincode,
                pincode,
                userId
            );
        }

        res.json({
            message: "Destination updated successfully"
        });

    } catch (err) {
        console.error("Error updating destination:", err);
        res.status(500).json({ message: "Update failed" });
    }
});

router.get("/logs", async (req, res) => {
    try {

        const rows = await destinationDb.getDestinationLogs();

        res.json(rows);

    } catch (err) {
        console.error("Error fetching logs:", err);
        res.status(500).json({ message: "Failed to fetch logs" });
    }
});

module.exports = router;