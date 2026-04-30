const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const parseTicket = require("../services/parser");
const db = require("../db/database");

const router = express.Router(); // ✅ THIS FIXES YOUR ERROR

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("ticket"), async (req, res) => {
    try {
        console.log("UPLOAD HIT");

        const dataBuffer = fs.readFileSync(req.file.path);

        const pdfData = await pdfParse(dataBuffer);
console.log("PDF TEXT FULL:\n", pdfData.text);

        const parsed = parseTicket(pdfData.text);

        console.log("PARSED DATA:", parsed);

        const { phone, reference } = req.body;

        db.run(`
            INSERT INTO tickets (
                customer_name, phone, reference,
                departure_airport, arrival_airport,
                departure_time, checkin_time,
                airline_name, flight_number,
                cabin_luggage, checked_luggage
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            parsed.customer_name,
            phone,
            reference,
            parsed.departure_airport,
            parsed.arrival_airport,
            parsed.departure_time,
            parsed.checkin_time,
            parsed.airline_name,
            parsed.flight_number,
            parsed.cabin_luggage,
            parsed.checked_luggage
        ], function(err) {

            if (err) {
                console.error("❌ DB INSERT ERROR:", err);
                return res.status(500).send("Database insert failed");
            }

            console.log("✅ DATA INSERTED, ID:", this.lastID);

            res.send("Uploaded successfully");
        });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        res.status(500).send("Error processing file");
    }
});

module.exports = router;