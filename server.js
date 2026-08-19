const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Site files live in /public
const SITE_DIR = path.join(__dirname, "public");

app.use(express.static(SITE_DIR));

// Clean-URL routes for each page (Phase 1 — public site, per sitemap)
const PAGES = {
  "/": "index.html",
  "/services": "services.html",
  "/fleet": "fleet.html",
  "/client": "client.html",
  "/contact": "contact.html",
  "/request": "request.html",
  "/clientarea": "clientarea.html",
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