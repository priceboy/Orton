const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./db/tickets.db");

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

            trip_type TEXT

        )

    `);

});

module.exports = db;
