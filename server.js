const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Site files live in /public
const SITE_DIR = path.join(__dirname, "public");

app.use(express.static(SITE_DIR));

// Fallback to index.html for any unmatched route (keeps direct links like
// /services.html working, and covers refreshes on any page)
app.get("*", (req, res) => {
  res.sendFile(path.join(SITE_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Bee Cee Logistics site running on port ${PORT}`);
});