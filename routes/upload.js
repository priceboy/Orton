const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const parseTicket = require("../services/parser");
const db = require("../db/database");

const router = express.Router();

// ==========================================
// MULTER
// ==========================================

const upload = multer({

    dest: "uploads/",

    limits: {

        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// ==========================================
// SAFE FILE DELETE
// ==========================================

function safeDelete(path) {

    try {

        if (path && fs.existsSync(path)) {

            fs.unlinkSync(path);
        }

    } catch (err) {

        console.log("Delete warning:", err.message);
    }
}

// ==========================================
// UPLOAD ROUTE
// ==========================================

router.post(
    "/",
    upload.single("ticket"),
    async (req, res) => {

    try {

        console.log("=================================");
        console.log("UPLOAD ROUTE HIT");
        console.log("=================================");

        // ======================================
        // VALIDATE FILE
        // ======================================

        if (!req.file) {

            return res.status(400).json({

                success: false,
                error: "No file uploaded"
            });
        }

        console.log("FILE:", req.file.originalname);

        // ======================================
        // READ PDF
        // ======================================

        const dataBuffer =
            fs.readFileSync(req.file.path);

        const pdfData =
            await pdfParse(dataBuffer);

        if (!pdfData?.text) {

            safeDelete(req.file.path);

            return res.status(400).json({

                success: false,
                error: "Could not read PDF"
            });
        }

        console.log("PDF PARSED");

        // ======================================
        // PARSE TICKET
        // ======================================

        const parsed =
            parseTicket(pdfData.text);

        console.log("PARSED RESULT:");
        console.log(parsed);

        // ======================================
        // FORM DATA
        // ======================================

        const phone =
            req.body.phone || null;

        const reference =
            req.body.reference || null;

        // ======================================
        // SQL
        // ======================================

        const sql = `

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

                trip_type,

                return_departure_airport,

                return_arrival_airport,

                return_departure_date,

                return_departure_time,

                return_checkin_time,

                return_flight_number

            )

            VALUES (

                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `;

        // ======================================
        // VALUES
        // ======================================

        const values = [

            parsed.customer_name || null,

            phone,

            reference,

            parsed.departure_airport || null,

            parsed.arrival_airport || null,

            parsed.departure_date || null,

            parsed.departure_time || null,

            parsed.checkin_time || null,

            parsed.airline_name || null,

            parsed.flight_number || null,

            parsed.cabin_luggage || null,

            parsed.checked_luggage || null,

            parsed.trip_type || null,

            parsed.return_departure_airport || null,

            parsed.return_arrival_airport || null,

            parsed.return_departure_date || null,

            parsed.return_departure_time || null,

            parsed.return_checkin_time || null,

            parsed.return_flight_number || null
        ];

        console.log("INSERTING INTO DB...");

        // ======================================
        // INSERT
        // ======================================

        db.run(sql, values, function(err) {

            // ======================================
            // INSERT ERROR
            // ======================================

            if (err) {

                console.log("=================================");
                console.log("DB INSERT ERROR");
                console.log(err);
                console.log("=================================");

                safeDelete(req.file.path);

                return res.status(500).json({

                    success: false,

                    error: err.message
                });
            }

            console.log("=================================");
            console.log("INSERT SUCCESS");
            console.log("ID:", this.lastID);
            console.log("=================================");

            // ======================================
            // DELETE TEMP FILE
            // ======================================

            safeDelete(req.file.path);

            // ======================================
            // SUCCESS
            // ======================================

            res.json({

                success: true,

                ticket_id: this.lastID,

                parsed
            });
        });

    } catch (err) {

        console.log("=================================");
        console.log("UPLOAD CRASH");
        console.log(err);
        console.log("=================================");

        if (req.file?.path) {

            safeDelete(req.file.path);
        }

        return res.status(500).json({

            success: false,

            error: err.message
        });
    }
});

module.exports = router;
