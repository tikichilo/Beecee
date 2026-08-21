const mongoose = require("mongoose");

// Tokens are stored hashed (never the raw token an admin clicks in
// their email) so a database leak alone can't be used to reset anyone's
// password. Each token is single-use and expires after 1 hour.
const passwordResetSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
