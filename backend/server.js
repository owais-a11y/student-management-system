require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/database");
const studentRoutes = require("./routes/studentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Security headers ----
app.use(helmet());

// ---- CORS: only the authorised frontend(s) may call this API ----
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser tools (curl/Postman have no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "100kb" }));

// ---- Routes ----
app.get("/", (req, res) => res.json({ service: "student-api", status: "running" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/students", studentRoutes);

// ---- 404 ----
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// ---- Central error handler (never leaks internals) ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "Origin not allowed" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON body" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "A student with this Student ID already exists" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Validation failed", errors: Object.values(err.errors).map((e) => e.message) });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Student API listening on port ${PORT}`));
});
