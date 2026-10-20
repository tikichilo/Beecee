const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

adminSchema.statics.ensureFirstSuperAdmin = async function () {
  const existingSuperAdmin = await this.findOne({ isSuperAdmin: true });
  if (existingSuperAdmin) return existingSuperAdmin;

  const firstAdmin = await this.findOne().sort({ createdAt: 1, _id: 1 });
  if (!firstAdmin) return null;

  firstAdmin.isSuperAdmin = true;
  return firstAdmin.save();
};

module.exports = mongoose.model("Admin", adminSchema);
