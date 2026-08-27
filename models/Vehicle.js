const mongoose = require("mongoose");

// Categories that don't carry passengers, so seating capacity doesn't
// apply — mirrors CARGO_ONLY_CATEGORIES in admin/fleet.html.
const CARGO_ONLY_CATEGORIES = ["truck"];

const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Toyota Land Cruiser Prado"
    category: {
      type: String,
      required: true,
      enum: ["saloon", "4x4", "bus", "truck"],
    },
    // Stored as web paths e.g. "/uploads/fleet/<id>/1.jpg" — min 1, max 10
    images: {
      type: [String],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 10,
        message: "A vehicle needs between 1 and 10 images.",
      },
      required: true,
    },
    seatingCapacity: {
      type: Number,
      min: 1,
      required: function () {
        // "this" is the document being validated — not required for
        // cargo-only categories like trucks.
        return !CARGO_ONLY_CATEGORIES.includes(this.category);
      },
    },
    loadLimitKg: { type: Number, min: 0 }, // optional — not every saloon car needs this
    bookingFee: { type: Number, required: true, min: 0 }, // ZMW per day, kept numeric for sorting/filtering
    location: { type: String, required: true, trim: true }, // e.g. "Lusaka Depot"
    status: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
    },
    description: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);