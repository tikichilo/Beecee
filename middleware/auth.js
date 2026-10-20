const Admin = require("../models/Admin");

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ error: "Not logged in." });
}

async function requireSuperAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    const admin = await Admin.findById(req.session.adminId).select("isSuperAdmin");
    if (!admin || !admin.isSuperAdmin) {
      return res.status(403).json({ error: "Super admin access required." });
    }
    next();
  } catch (err) {
    console.error("Super admin authorization error:", err);
    res.status(500).json({ error: "Could not verify super admin access." });
  }
}

module.exports = { requireAdmin, requireSuperAdmin };
