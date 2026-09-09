const mongoose = require("mongoose");
const { CATEGORY_KEYS } = require("../config/fleetCategories");

const bookingSchema = new mongoose.Schema(
  {
    // No individual vehicles anymore — a booking is against a fleet
    // category, with the renter's own proposed rate within that
    // category's posted range. categoryLabel is a snapshot for display,
    // in case the label ever changes later.
    category: { type: String, required: true, enum: CATEGORY_KEYS },
    categoryLabel: { type: String, required: true, trim: true },
    proposedRate: { type: Number, required: true, min: 0 }, // ZMW/day

    renterName: { type: String, required: true, trim: true },
    renterPhone: { type: String, required: true, trim: true },
    renterEmail: { type: String, trim: true, lowercase: true },
    residentialAddress: { type: String, required: true, trim: true },

    // Whether the renter drives the vehicle themselves or uses a Bee Cee
    // driver. Next-of-kin and driver's-licence details are only collected
    // (and required) for self-drive — a company driver doesn't need them.
    driverOption: {
      type: String,
      enum: ["self", "company-driver"],
      required: true,
    },

    nextOfKin: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true },
    },

    driverLicenseNumber: { type: String, trim: true },
    driverLicenseImageUrl: { type: String }, // Cloudinary URL — self-drive only
    proofOfResidenceUrl: { type: String }, // Cloudinary URL — required for every booking

    // A public submission (request.html) starts as "pending" — it's a
    // request, not a real booking yet, until staff review and confirm it.
    // A booking created directly by a logged-in admin (walk-in customer)
    // is auto-"confirmed" since staff already vetted it in person.
    requestStatus: {
      type: String,
      enum: ["pending", "confirmed", "declined"],
      default: "pending",
    },

    // The physical rental contract is signed in person at pickup, not
    // online — this just lets admin staff tick it off from the dashboard.
    contractSigned: { type: Boolean, default: false },

    pickupDate: { type: Date, required: true },
    expectedReturnDate: { type: Date, required: true },
    actualReturnDate: { type: Date },
    // "overdue" is never stored here — it's derived in booking.js from expectedReturnDate vs now.
    // This only reflects whether the vehicle is physically out once a booking is confirmed —
    // see requestStatus above for whether it's been reviewed/accepted at all.
    status: {
      type: String,
      enum: ["out", "returned"],
      default: "out",
    },

    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);