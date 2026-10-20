const AdminActivity = require("../models/AdminActivity");

function recordAdminActivity(req, res, next) {
  if (!req.path.startsWith("/api/") || req.path === "/api/admin-activity" || req.path === "/api/auth/me") {
    return next();
  }

  const initialAdminId = req.session && req.session.adminId;
  const initialUsername = req.session && req.session.username;

  res.on("finish", () => {
    const adminId = initialAdminId || (req.session && req.session.adminId) ||
      (req.adminActivityActor && req.adminActivityActor.adminId);
    const username = initialUsername || (req.session && req.session.username) ||
      (req.adminActivityActor && req.adminActivityActor.username);
    if (!adminId || !username) return;

    const path = req.originalUrl.split("?")[0];
    AdminActivity.create({
      adminId,
      username,
      action: `${req.method} ${path}`,
      method: req.method,
      path,
      statusCode: res.statusCode,
      ip: req.ip || "",
      userAgent: req.get("user-agent") || "",
    }).catch((err) => {
      console.error("Could not record admin activity:", err);
    });
  });

  next();
}

module.exports = recordAdminActivity;
