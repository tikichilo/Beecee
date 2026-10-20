const mongoose = require("mongoose");

const adminActivitySchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    username: { type: String, required: true },
    action: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

adminActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminActivity", adminActivitySchema);
