const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuid } = require("uuid");
const router = express.Router();

const Vehicle = require("../models/Vehicle");
const { requireAdmin } = require("../middleware/auth");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "fleet");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB each, 10 max
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, or WEBP images are allowed."), ok);
  },
});

// ------------------------------------------------------------------
// PUBLIC — used by index.html and fleet.html to render live fleet cards
// GET /api/fleet            -> all vehicles
// GET /api/fleet?category=4x4  -> filtered
// ------------------------------------------------------------------
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.category && req.query.category !== "all") {
    filter.category = req.query.category;
  }
  const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
  res.json(vehicles);
});

router.get("/:id", async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });
  res.json(vehicle);
});

// ------------------------------------------------------------------
// ADMIN — everything below requires a logged-in session
// ------------------------------------------------------------------
router.post("/", requireAdmin, upload.array("images", 10), async (req, res) => {
  try {
    const images = (req.files || []).map((f) => `/uploads/fleet/${f.filename}`);
    if (images.length < 1) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    const vehicle = await Vehicle.create({
      name: req.body.name,
      category: req.body.category,
      images,
      seatingCapacity: req.body.seatingCapacity,
      loadLimitKg: req.body.loadLimitKg || undefined,
      bookingFee: req.body.bookingFee,
      location: req.body.location,
      status: req.body.status || "available",
      description: req.body.description || "",
    });

    res.status(201).json(vehicle);
  } catch (err) {
    // Clean up any uploaded files if the DB save failed (e.g. bad category enum)
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireAdmin, upload.array("newImages", 10), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });

    // Images the admin chose to keep (sent back as JSON array of existing paths)
    let keptImages = vehicle.images;
    if (req.body.keepImages) {
      keptImages = JSON.parse(req.body.keepImages);
    }
    const newImages = (req.files || []).map((f) => `/uploads/fleet/${f.filename}`);
    const finalImages = [...keptImages, ...newImages];

    if (finalImages.length < 1 || finalImages.length > 10) {
      (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ error: "A vehicle needs between 1 and 10 images." });
    }

    // Delete any images that were removed from disk
    const removed = vehicle.images.filter((img) => !keptImages.includes(img));
    removed.forEach((img) => {
      const filePath = path.join(__dirname, "..", "public", img);
      fs.unlink(filePath, () => {});
    });

    vehicle.name = req.body.name ?? vehicle.name;
    vehicle.category = req.body.category ?? vehicle.category;
    vehicle.seatingCapacity = req.body.seatingCapacity ?? vehicle.seatingCapacity;
    vehicle.loadLimitKg = req.body.loadLimitKg || undefined;
    vehicle.bookingFee = req.body.bookingFee ?? vehicle.bookingFee;
    vehicle.location = req.body.location ?? vehicle.location;
    vehicle.status = req.body.status ?? vehicle.status;
    vehicle.description = req.body.description ?? vehicle.description;
    vehicle.images = finalImages;

    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });

  vehicle.images.forEach((img) => {
    const filePath = path.join(__dirname, "..", "public", img);
    fs.unlink(filePath, () => {});
  });

  await vehicle.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
