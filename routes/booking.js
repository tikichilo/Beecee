const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  next();
}

/** Adds a derived `computedStatus` of "out" | "overdue" | "returned" without touching the stored `status`. */
function withComputedStatus(booking) {
  const obj = booking.toObject ? booking.toObject() : booking;
  let computedStatus = obj.status;
  if (obj.status === "out" && new Date(obj.expectedReturnDate) < new Date()) {
    computedStatus = "overdue";
  }
  return { ...obj, computedStatus };
}

router.use(requireAuth);

// --------------------------------------------------------------------
// GET /api/bookings — ?status=out|overdue|returned filters after the fact
// since "overdue" isn't a stored value.
// --------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ pickupDate: -1 });
    let withStatus = bookings.map(withComputedStatus);

    const { status } = req.query;
    if (status && ["out", "overdue", "returned"].includes(status)) {
      withStatus = withStatus.filter((b) => b.computedStatus === status);
    }

    res.json(withStatus);
  } catch (err) {
    console.error("Booking list error:", err.message);
    res.status(500).json({ error: "Could not load bookings." });
  }
});

// --------------------------------------------------------------------
// POST /api/bookings — create a new booking
// --------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { vehicleId, vehicleName, renterName, renterPhone, renterEmail, pickupDate, expectedReturnDate, dailyRate, notes } = req.body;

    if (!vehicleId || !vehicleName || !renterName || !renterPhone || !pickupDate || !expectedReturnDate) {
      return res.status(400).json({ error: "Vehicle, renter name, phone, pickup date, and expected return date are required." });
    }
    if (new Date(expectedReturnDate) < new Date(pickupDate)) {
      return res.status(400).json({ error: "Expected return date can't be before the pickup date." });
    }

    const booking = await Booking.create({
      vehicleId,
      vehicleName,
      renterName,
      renterPhone,
      renterEmail,
      pickupDate,
      expectedReturnDate,
      dailyRate: dailyRate || undefined,
      notes,
    });

    res.status(201).json(withComputedStatus(booking));
  } catch (err) {
    console.error("Booking creation error:", err.message);
    res.status(500).json({ error: "Something went wrong creating the booking." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/bookings/:id/return — mark a booking returned
// --------------------------------------------------------------------
router.patch("/:id/return", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "returned", actualReturnDate: new Date() },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json(withComputedStatus(booking));
  } catch (err) {
    console.error("Booking return error:", err.message);
    res.status(500).json({ error: "Could not mark booking returned." });
  }
});

// --------------------------------------------------------------------
// DELETE /api/bookings/:id
// --------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Booking delete error:", err.message);
    res.status(500).json({ error: "Could not delete booking." });
  }
});

module.exports = router;
