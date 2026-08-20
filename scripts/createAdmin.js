// Run once to create your dashboard login:
//   node scripts/createAdmin.js <username> <password>
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Usage: node scripts/createAdmin.js <username> <password>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Admin.findOne({ username: username.toLowerCase() });
  if (existing) {
    console.error(`Admin "${username}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await Admin.hashPassword(password);
  await Admin.create({ username: username.toLowerCase(), passwordHash });

  console.log(`Admin "${username}" created. You can now log in at /admin.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
