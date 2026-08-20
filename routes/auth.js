const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
  if (!admin) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const ok = await admin.checkPassword(password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.adminId = admin._id.toString();
  req.session.username = admin.username;
  res.json({ ok: true, username: admin.username });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me — lets the admin dashboard check if it's already logged in
router.get("/me", (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  res.json({ loggedIn: false });
});

module.exports = router;
