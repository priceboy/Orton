const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/", (req, res) => {

    if (!req.query.q || req.query.q.trim() === "") {
        return res.json([]);
    }

    const rawSearch = req.query.q.trim().toLowerCase();

    console.log("🔍 SEARCHING FOR:", rawSearch);

    // 🔥 Split search into words (advanced search)
    const terms = rawSearch.split(/\s+/);

    // Build dynamic WHERE conditions
    const conditions = [];
    const values = [];

    const fields = [
        "customer_name",
        "phone",
        "reference",
        "departure_airport",
        "arrival_airport",
        "airline_name",
        "flight_number"
    ];

    // 🔥 For each word, search across all fields
    terms.forEach(term => {
        const like = `%${term}%`;

        const subConditions = fields.map(field => {
            values.push(like);
            return `LOWER(COALESCE(${field}, '')) LIKE ?`;
        });

        // Each word must match at least ONE field
        conditions.push(`(${subConditions.join(" OR ")})`);
    });

    const query = `
        SELECT * FROM tickets
        WHERE ${conditions.join(" AND ")}
        ORDER BY id DESC
    `;

    db.all(query, values, (err, rows) => {

        if (err) {
            console.error("❌ SEARCH ERROR:", err);
            return res.status(500).send("Search failed");
        }

        console.log("✅ RESULTS:", rows.length);

        res.json(rows);
    });
});

module.exports = router;