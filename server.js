require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");

require("./utils/CloudinaryUpload"); // fail-fast Cloudinary env check + config

const authRoutes = require("./routes/auth");
const fleetRoutes = require("./routes/fleet");
const quoteRoutes = require("./routes/quote");
const bookingRoutes = require("./routes/booking"); // <-- added
const receiptRoutes = require("./routes/receipt"); // <-- added

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-.env";

if (!MONGO_URI) {
  console.error("FATAL: MONGO_URI is not set. Check your .env file.");
  process.exit(1);
}

// Site files live in /public
const SITE_DIR = path.join(__dirname, "public");

// --------------------------------------------------------------------
// Database
// --------------------------------------------------------------------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error (post-connect):", err.message);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected — Mongoose will attempt to reconnect automatically.");
});
mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected.");
});

// --------------------------------------------------------------------
// Core middleware
// --------------------------------------------------------------------
// Render (and most PaaS hosts) terminate HTTPS at a proxy in front of
// this app, so Express never sees the connection as secure on its own.
// Without this, secure session cookies don't reliably survive between
// requests, which is what was causing the login -> dashboard -> login
// bounce: the cookie from /api/auth/login wasn't sticking, so
// /api/auth/me on the dashboard came back loggedIn:false.
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(express.static(SITE_DIR));

// --------------------------------------------------------------------
// API routes
// --------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/fleet", fleetRoutes);
app.use("/api/quote-requests", quoteRoutes);
app.use("/api/bookings", bookingRoutes); // <-- added
app.use("/api/receipts", receiptRoutes); // <-- added

// --------------------------------------------------------------------
// Clean-URL routes for each page (Phase 1 — public site, per sitemap)
// --------------------------------------------------------------------
const PAGES = {
  "/": "index.html",
  "/services": "services.html",
  "/fleet": "fleet.html",
  "/client": "client.html",
  "/contact": "contact.html",
  "/request": "request.html",
  "/clientarea": "clientarea.html",
  "/admin": "admin/login.html",
  "/admin/dashboard": "admin/dashboard.html",
  "/admin/fleet": "admin/fleet.html",
  "/admin/quotes": "admin/quotes.html",
  "/admin/bookings": "admin/bookings.html",
  "/admin/receipts": "admin/receipts.html",
  "/admin/access": "admin/access.html",
  "/admin/signup": "admin/signup.html",
  "/admin/forgot-password": "admin/forgot-password.html",
  "/admin/reset-password": "admin/reset-password.html",
};

Object.entries(PAGES).forEach(([route, file]) => {
  app.get(route, (req, res, next) => {
    const filePath = path.join(SITE_DIR, file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });
});

// Real 404 for anything unmatched — no wildcard needed
app.use((req, res) => {
  const notFoundPath = path.join(SITE_DIR, "404.html");
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send("Page not found");
  }
});

// --------------------------------------------------------------------
// Error handling — must be registered after all routes (catches
// multer/Cloudinary upload errors bubbled up from routes/fleet.js)
// --------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "Image is too large — max 5MB per file.",
      LIMIT_FILE_COUNT: "Too many images — max 10 per fleet listing.",
      LIMIT_UNEXPECTED_FILE: "Too many images — max 10 per fleet listing.",
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }
  if (err && err.message && err.message.includes("JPG, PNG, WEBP")) {
    return res.status(400).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Bee Cee Logistics site running on port ${PORT}`);
});