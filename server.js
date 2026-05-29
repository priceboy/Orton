const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// ======================================
// DATABASE
// ======================================

const db = require("./db/database");

// ======================================
// ROUTES
// ======================================

const uploadRoute = require("./routes/upload");
const searchRoute = require("./routes/search");

// ======================================
// APP
// ======================================

const app = express();

// ======================================
// MIDDLEWARE
// ======================================

app.use(cors());

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

// ======================================
// ROUTES
// ======================================

app.use("/upload", uploadRoute);

app.use("/search", searchRoute);

// ======================================
// GET ALL TICKETS
// ======================================

app.get("/all", (req, res) => {

    db.all(

        "SELECT * FROM tickets ORDER BY id DESC",

        (err, rows) => {

            if (err) {

                console.log(err);

                return res.status(500).json({

                    error: err.message
                });
            }

            res.json(rows);
        }
    );
});

// ======================================
// SERVER
// ======================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);
});
