const express = require("express");
const router = express.Router();

const AdminActivity = require("../models/AdminActivity");
const { requireSuperAdmin } = require("../middleware/auth");

router.get("/", requireSuperAdmin, async (req, res) => {
  try {
    const activity = await AdminActivity.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(activity);
  } catch (err) {
    console.error("Admin activity list error:", err);
    res.status(500).json({ error: "Could not load admin activity." });
  }
});

module.exports = router;
