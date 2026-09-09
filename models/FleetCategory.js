const mongoose = require("mongoose");
const { CATEGORY_KEYS } = require("../config/fleetCategories");

// One document per category (5 total, fixed set — see config/fleetCategories.js).
// No individual vehicles are tracked anymore: the public site shows a rate
// range per category, and the admin dashboard just edits that range.
const fleetCategorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: CATEGORY_KEYS,
      unique: true,
    },
    minRate: { type: Number, required: true, min: 0 }, // ZMW/day
    maxRate: { type: Number, required: true, min: 0 }, // ZMW/day
    acceptingBookings: { type: Boolean, default: true },
  },
  { timestamps: true }
);

fleetCategorySchema.pre("validate", function (next) {
  if (this.minRate != null && this.maxRate != null && this.maxRate < this.minRate) {
    return next(new Error("Maximum rate can't be lower than the minimum rate."));
  }
  next();
});

module.exports = mongoose.model("FleetCategory", fleetCategorySchema);