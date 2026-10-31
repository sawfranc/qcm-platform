const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
// CORS_ORIGIN accepte une ou plusieurs adresses séparées par des virgules,
// ex. "https://sawfr.com,https://www.sawfr.com"
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" })); // import en masse : jusqu'à 200 questions par requête

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/v1", routes);

app.use(errorHandler);

module.exports = app;
