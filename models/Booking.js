const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    vehicleName: { type: String, required: true, trim: true }, // snapshot at booking time, in case the vehicle is edited/deleted later

    renterName: { type: String, required: true, trim: true },
    renterPhone: { type: String, required: true, trim: true },
    renterEmail: { type: String, trim: true, lowercase: true },

    pickupDate: { type: Date, required: true },
    expectedReturnDate: { type: Date, required: true },
    actualReturnDate: { type: Date },

    dailyRate: { type: Number, min: 0 }, // ZMW/day — optional, usually pulled from the vehicle's bookingFee

    // "overdue" is never stored here — it's derived in booking.js from expectedReturnDate vs now
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
