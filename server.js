const sqlite3 = require("sqlite3").verbose();

// ======================================
// CREATE / CONNECT DATABASE
// ======================================

const db = new sqlite3.Database("./tickets.db", (err) => {

    if (err) {

        console.error(err.message);

    } else {

        console.log("Connected to tickets database");
    }
});

// ======================================
// CREATE TABLE
// ======================================

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS tickets (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            customer_name TEXT,

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

            console.log("Table creation error:", err);

        } else {

            console.log("tickets table ready");
        }
    });
});

module.exports = db;
