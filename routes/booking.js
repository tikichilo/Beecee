const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const {
  uploadBookingDocs,
  uploadImageBuffer,
  deleteCloudinaryImage,
} = require("../utils/cloudinaryUpload");

const CLOUDINARY_FOLDER = "bee-cee-logistics/booking-docs";

function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  next();
}

/** Adds a derived `computedStatus` of "requested" | "declined" | "out" | "overdue" | "returned". */
function withComputedStatus(booking) {
  const obj = booking.toObject ? booking.toObject() : booking;
  let computedStatus;
  if (obj.requestStatus === "pending") {
    computedStatus = "requested";
  } else if (obj.requestStatus === "declined") {
    computedStatus = "declined";
  } else if (obj.status === "out" && new Date(obj.expectedReturnDate) < new Date()) {
    computedStatus = "overdue";
  } else {
    computedStatus = obj.status;
  }
  return { ...obj, computedStatus };
}

// --------------------------------------------------------------------
// GET /api/bookings — admin-only. ?status=requested|out|overdue|returned|declined
// filters after the fact since these are computed, not stored directly.
// --------------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ pickupDate: -1 });
    let withStatus = bookings.map(withComputedStatus);

    const { status } = req.query;
    if (status && ["requested", "out", "overdue", "returned", "declined"].includes(status)) {
      withStatus = withStatus.filter((b) => b.computedStatus === status);
    }

    res.json(withStatus);
  } catch (err) {
    console.error("Booking list error:", err.message);
    res.status(500).json({ error: "Could not load bookings." });
  }
});

// --------------------------------------------------------------------
// POST /api/bookings — public. Used by request.html?vehicle=<id> (renter
// self-service) and by the admin "New Booking" form. Accepts
// multipart/form-data so the driver's-licence / proof-of-residence photos
// can ride along with the rest of the fields; a plain JSON POST (no files)
// still works fine too since the fields land in req.body either way.
// --------------------------------------------------------------------
router.post("/", uploadBookingDocs, async (req, res) => {
  let driverLicenseImageUrl;
  let proofOfResidenceUrl;

  try {
    const {
      vehicleId,
      vehicleName,
      renterName,
      renterPhone,
      renterEmail,
      residentialAddress,
      driverOption,
      driverLicenseNumber,
      pickupDate,
      expectedReturnDate,
      dailyRate,
      notes,
    } = req.body;

    // Next-of-kin can arrive either as nested fields (nextOfKin.name, ...)
    // from a plain JSON POST, or as flat fields (nextOfKinName, ...) from
    // a multipart form — normalize to one shape.
    const nextOfKin = req.body.nextOfKin || {
      name: req.body.nextOfKinName,
      phone: req.body.nextOfKinPhone,
      relationship: req.body.nextOfKinRelationship,
    };

    if (
      !vehicleId || !vehicleName || !renterName || !renterPhone ||
      !residentialAddress || !driverOption || !pickupDate || !expectedReturnDate
    ) {
      return res.status(400).json({
        error: "Vehicle, renter name, phone, residential address, driver option, pickup date, and expected return date are required.",
      });
    }
    if (!["self", "company-driver"].includes(driverOption)) {
      return res.status(400).json({ error: "Driver option must be 'self' or 'company-driver'." });
    }
    if (new Date(expectedReturnDate) < new Date(pickupDate)) {
      return res.status(400).json({ error: "Expected return date can't be before the pickup date." });
    }

    const isSelfDrive = driverOption === "self";
    const licenseFile = req.files && req.files.driverLicenseImage && req.files.driverLicenseImage[0];
    const residenceFile = req.files && req.files.proofOfResidenceImage && req.files.proofOfResidenceImage[0];

    if (isSelfDrive) {
      if (!nextOfKin.name || !nextOfKin.phone) {
        return res.status(400).json({ error: "Next of kin name and phone are required for self-drive bookings." });
      }
      if (!driverLicenseNumber || !licenseFile) {
        return res.status(400).json({ error: "Driver's licence number and a photo of the licence are required for self-drive bookings." });
      }
    }
    if (!residenceFile) {
      return res.status(400).json({ error: "A photo of proof of residence is required." });
    }

    if (licenseFile) {
      driverLicenseImageUrl = await uploadImageBuffer(licenseFile.buffer, CLOUDINARY_FOLDER);
    }
    proofOfResidenceUrl = await uploadImageBuffer(residenceFile.buffer, CLOUDINARY_FOLDER);

    // A public renter submitting via request.html is only making a request —
    // it needs staff review. A logged-in admin entering a walk-in booking
    // directly has already vetted the customer in person, so it's confirmed
    // immediately.
    const isAdminSubmission = !!(req.session && req.session.adminId);

    const booking = await Booking.create({
      vehicleId,
      vehicleName,
      renterName,
      renterPhone,
      renterEmail,
      residentialAddress,
      driverOption,
      nextOfKin: isSelfDrive ? nextOfKin : undefined,
      driverLicenseNumber: isSelfDrive ? driverLicenseNumber : undefined,
      driverLicenseImageUrl,
      proofOfResidenceUrl,
      requestStatus: isAdminSubmission ? "confirmed" : "pending",
      pickupDate,
      expectedReturnDate,
      dailyRate: dailyRate || undefined,
      notes,
    });

    res.status(201).json(withComputedStatus(booking));
  } catch (err) {
    // Clean up anything that already made it to Cloudinary if the DB save failed
    if (driverLicenseImageUrl) await deleteCloudinaryImage(driverLicenseImageUrl);
    if (proofOfResidenceUrl) await deleteCloudinaryImage(proofOfResidenceUrl);
    console.error("Booking creation error:", err.message);
    res.status(500).json({ error: "Something went wrong creating the booking." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/bookings/:id/confirm — admin accepts a pending request
// --------------------------------------------------------------------
router.patch("/:id/confirm", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.requestStatus !== "pending") {
      return res.status(400).json({ error: "Only a pending request can be confirmed." });
    }
    booking.requestStatus = "confirmed";
    await booking.save();
    res.json(withComputedStatus(booking));
  } catch (err) {
    console.error("Booking confirm error:", err.message);
    res.status(500).json({ error: "Could not confirm booking." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/bookings/:id/decline — admin declines a pending request
// --------------------------------------------------------------------
router.patch("/:id/decline", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.requestStatus !== "pending") {
      return res.status(400).json({ error: "Only a pending request can be declined." });
    }
    booking.requestStatus = "declined";
    await booking.save();
    res.json(withComputedStatus(booking));
  } catch (err) {
    console.error("Booking decline error:", err.message);
    res.status(500).json({ error: "Could not decline booking." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/bookings/:id/return — mark a confirmed booking returned
// --------------------------------------------------------------------
router.patch("/:id/return", requireAuth, async (req, res) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Booking not found." });
    if (existing.requestStatus !== "confirmed") {
      return res.status(400).json({ error: "Only a confirmed booking can be marked returned." });
    }
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "returned", actualReturnDate: new Date() },
      { new: true }
    );
    res.json(withComputedStatus(booking));
  } catch (err) {
    console.error("Booking return error:", err.message);
    res.status(500).json({ error: "Could not mark booking returned." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/bookings/:id/contract — admin ticks this off once the renter
// has signed the physical contract at pickup.
// --------------------------------------------------------------------
router.patch("/:id/contract", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { contractSigned: !!req.body.contractSigned },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json(withComputedStatus(booking));
  } catch (err) {
    console.error("Contract-signed update error:", err.message);
    res.status(500).json({ error: "Could not update contract status." });
  }
});

// --------------------------------------------------------------------
// DELETE /api/bookings/:id — admin-only
// --------------------------------------------------------------------
router.delete("/:id", requireAuth, async (req, res) => {
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