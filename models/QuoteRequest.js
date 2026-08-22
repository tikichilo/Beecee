const mongoose = require("mongoose");

const quoteRequestSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },

    serviceType: {
      type: String,
      required: true,
      enum: ["freight", "car-hire", "clearing", "removals", "warehousing"],
    },

    // Free-text extras from the public "Request a Quote" form — not every
    // service type uses all of these, so none are required.
    dateRange: { type: String, trim: true },
    route: { type: String, trim: true },
    cargoDetails: { type: String, trim: true },

    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuoteRequest", quoteRequestSchema);
