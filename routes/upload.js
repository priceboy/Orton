const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const parseTicket = require("../services/parser");
const db = require("../db/database");

const router = express.Router();

const upload = multer({
    dest: "uploads/"
});


// ==========================================
// ✅ UPLOAD ROUTE
// ==========================================

router.post(
    "/",
    upload.single("ticket"),
    async (req, res) => {

    try {

        console.log("UPLOAD HIT");

        // =========================
        // ✅ VALIDATE FILE
        // =========================

        if (!req.file) {

            return res
            .status(400)
            .send("No file uploaded");
        }

        // =========================
        // ✅ READ PDF
        // =========================

        const dataBuffer =
            fs.readFileSync(req.file.path);

        const pdfData =
            await pdfParse(dataBuffer);

        console.log(
            "PDF TEXT FULL:\n",
            pdfData.text
        );

        // =========================
        // ✅ PARSE TICKET
        // =========================

        const parsed =
            parseTicket(pdfData.text);

        console.log(
            "PARSED DATA:",
            parsed
        );

        // =========================
        // ✅ FORM DATA
        // =========================

        const {
            phone,
            reference
        } = req.body;

        // =========================
        // ✅ SAVE TO DATABASE
        // =========================

        db.run(`

            INSERT INTO tickets (

                customer_name,
                phone,
                reference,

                departure_airport,
                arrival_airport,

                departure_date,
                departure_time,
                checkin_time,

                airline_name,
                flight_number,

                cabin_luggage,
                checked_luggage,

                trip_type

            )

            VALUES (

                ?, ?, ?,
                ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?

            )

        `, [

            parsed.customer_name,

            phone,

            reference,

            parsed.departure_airport,

            parsed.arrival_airport,

            parsed.departure_date,

            parsed.departure_time,

            parsed.checkin_time,

            parsed.airline_name,

            parsed.flight_number,

            parsed.cabin_luggage,

            parsed.checked_luggage,

            parsed.trip_type

        ],

        function(err) {

            // =========================
            // ❌ DB ERROR
            // =========================

            if (err) {

                console.error(
                    "❌ DB INSERT ERROR:",
                    err
                );

                return res
                .status(500)
                .send("Database insert failed");
            }

            // =========================
            // ✅ SUCCESS
            // =========================

            console.log(
                "✅ DATA INSERTED, ID:",
                this.lastID
            );

            res.send(
                "Uploaded successfully"
            );
        });

        // =========================
        // ✅ CLEAN UP TEMP FILE
        // =========================

        fs.unlinkSync(req.file.path);

    } catch (err) {

        console.error(
            "UPLOAD ERROR:",
            err
        );

        res
        .status(500)
        .send("Error processing file");
    }
});

module.exports = router;
