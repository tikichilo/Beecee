// Run once to create your dashboard login:
//   node scripts/createAdmin.js <username> <email> <password>
//
// Now that /admin/signup exists, this script is mainly a fallback for
// creating the very first admin before anyone can invite-code their
// way in, or for recovering access if email/reset ever breaks.
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

async function main() {
  const [, , username, email, password] = process.argv;
  if (!username || !email || !password) {
    console.error("Usage: node scripts/createAdmin.js <username> <email> <password>");
    process.exit(1);
  }

  // NOTE: this previously read process.env.MONGODB_URI, but .env only
  // defines MONGO_URI (same var server.js uses) — that mismatch meant
  // this script would always fail to connect. Fixed to match.
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Admin.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });
  if (existing) {
    console.error(`An admin with that username or email already exists.`);
    process.exit(1);
  }

  const passwordHash = await Admin.hashPassword(password);
  await Admin.create({ username: username.toLowerCase(), email: email.toLowerCase(), passwordHash });

  console.log(`Admin "${username}" created. You can now log in at /admin.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
