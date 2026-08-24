const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Admin = require("../models/Admin");
const PasswordReset = require("../models/PasswordReset");
const { sendPasswordResetEmail } = require("../lib/mailer");

const INVITE_CODE = (process.env.INVITE_CODE || "").toUpperCase();

if (!INVITE_CODE) {
  console.warn("⚠️  INVITE_CODE is not set in .env — /admin/signup will reject everyone until it is.");
}

// POST /api/auth/verify-invite
// Used by the /admin/access gate page before it lets someone through to
// the actual signup form. This is a UX convenience only — the real
// enforcement happens again on POST /api/auth/signup below, so someone
// can't just skip this endpoint and post straight to signup.
router.post("/verify-invite", (req, res) => {
  const { code } = req.body;
  if (!code || code.toUpperCase().trim() !== INVITE_CODE) {
    return res.status(403).json({ error: "Invalid invite code." });
  }
  res.json({ ok: true });
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, inviteCode } = req.body;

    if (!username || !email || !password || !inviteCode) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (inviteCode.toUpperCase().trim() !== INVITE_CODE) {
      return res.status(403).json({ error: "Invalid invite code." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    const existing = await Admin.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existing) {
      return res.status(409).json({ error: "An account with that username or email already exists." });
    }

    const passwordHash = await Admin.hashPassword(password);
    const admin = await Admin.create({ username: cleanUsername, email: cleanEmail, passwordHash });

    // Log the new admin straight in, same as after a normal login
    req.session.adminId = admin._id.toString();
    req.session.username = admin.username;
    res.status(201).json({ ok: true, username: admin.username });
  } catch (err) {
    console.error("POST /api/auth/signup:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    // Always respond success — don't reveal whether the email exists
    if (!admin) return res.json({ ok: true });

    await PasswordReset.deleteMany({ adminId: admin._id });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await PasswordReset.create({
      adminId: admin._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/admin/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail({ to: admin.email, username: admin.username, resetUrl });

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/forgot-password:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await PasswordReset.findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const passwordHash = await Admin.hashPassword(password);
    await Admin.findByIdAndUpdate(resetRecord.adminId, { passwordHash });
    await PasswordReset.findByIdAndUpdate(resetRecord._id, { used: true });

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/reset-password:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
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
  } catch (err) {
    console.error("POST /api/auth/login:", err);
    res.status(500).json({ error: "Server error." });
  }
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