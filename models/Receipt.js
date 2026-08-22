const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true }, // e.g. "BC-2026-0001", assigned in receipt.js

    serviceType: {
      type: String,
      required: true,
      enum: ["freight", "car-hire", "clearing", "removals", "warehousing"],
    },

    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "ZMW" },

    description: { type: String, trim: true, default: "" },
    issuedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
