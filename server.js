const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const uploadRoute = require("./routes/upload");
const searchRoute = require("./routes/search");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.use("/upload", uploadRoute);
app.use("/search", searchRoute);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.get("/all", (req, res) => {
    const db = require("./db/database");
    db.all("SELECT * FROM tickets", (err, rows) => {
        if (err) return res.send(err);
        res.json(rows);
    });
});const path = require("path");

// serve frontend files
app.use(express.static(path.join(__dirname, "public")));