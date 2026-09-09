const mongoose = require("mongoose");

// Just photos for the homepage gallery — no category, price, or vehicle
// metadata attached. That all lives on FleetCategory instead.
const fleetImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FleetImage", fleetImageSchema);