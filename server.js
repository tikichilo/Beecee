require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const authRoutes = require("./routes/auth");
const fleetRoutes = require("./routes/fleet");

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

// --------------------------------------------------------------------
// Core middleware
// --------------------------------------------------------------------
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
    },
  })
);

app.use(express.static(SITE_DIR));

// --------------------------------------------------------------------
// API routes
// --------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/fleet", fleetRoutes);

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
  "/admin/fleet": "admin/fleet.html",
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

app.listen(PORT, () => {
  console.log(`Bee Cee Logistics site running on port ${PORT}`);
});