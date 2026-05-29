const sqlite3 = require("sqlite3").verbose();

const path = require("path");

const fs = require("fs");

// ======================================
// DATABASE PATH
// ======================================

const dbPath = path.join(
    __dirname,
    "../tickets.db"
);

console.log("DB PATH:", dbPath);

// ======================================
// CREATE DB FILE IF MISSING
// ======================================

if (!fs.existsSync(dbPath)) {

    fs.writeFileSync(dbPath, "");

    console.log("tickets.db CREATED");
}

// ======================================
// CONNECT DATABASE
// ======================================

const db = new sqlite3.Database(

    dbPath,

    (err) => {

        if (err) {

            console.error(
                "DB CONNECTION ERROR:",
                err.message
            );

        } else {

            console.log(
                "Connected to tickets database"
            );
        }
    }
);

// ======================================
// CREATE TABLE
// ======================================

db.serialize(() => {

    db.run(`

        CREATE TABLE IF NOT EXISTS tickets (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer_name TEXT,

            phone TEXT,

            reference TEXT,

            departure_airport TEXT,

            arrival_airport TEXT,

            departure_date TEXT,

            departure_time TEXT,

            checkin_time TEXT,

            airline_name TEXT,

            flight_number TEXT,

            cabin_luggage TEXT,

            checked_luggage TEXT,

            trip_type TEXT,

            return_departure_airport TEXT,

            return_arrival_airport TEXT,

            return_departure_date TEXT,

            return_departure_time TEXT,

            return_checkin_time TEXT,

            return_flight_number TEXT

        )

    `, (err) => {

        if (err) {

            console.log(
                "TABLE ERROR:",
                err
            );

        } else {

            console.log(
                "tickets table ready"
            );
        }
    });
});

module.exports = db;
