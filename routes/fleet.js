const express = require("express");
const router = express.Router();

const Vehicle = require("../models/Vehicle");
const { requireAdmin } = require("../middleware/auth");
const {
  uploadFleetImages,
  uploadImageBuffers,
  deleteCloudinaryImage,
  deleteCloudinaryImages,
} = require("../utils/cloudinaryUpload");

const CLOUDINARY_FOLDER = "bee-cee-logistics/fleet";

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
router.post("/", requireAdmin, uploadFleetImages.array("images", 10), async (req, res) => {
  let images = [];
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "At least 1 image is required." });
    }

    console.log(`⬆️  Uploading ${req.files.length} fleet image(s) to Cloudinary...`);
    images = await uploadImageBuffers(req.files, CLOUDINARY_FOLDER);
    console.log(`✅ Uploaded ${images.length} image(s)`);

    if (!images.length) {
      return res.status(500).json({ error: "All image uploads failed — please try again" });
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
    // Clean up any images that already made it to Cloudinary if the
    // DB save failed (e.g. bad category enum)
    await deleteCloudinaryImages(images);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireAdmin, uploadFleetImages.array("newImages", 10), async (req, res) => {
  let newImages = [];
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });

    // Images the admin chose to keep (sent back as JSON array of existing URLs)
    let keptImages = vehicle.images;
    if (req.body.keepImages) {
      keptImages = JSON.parse(req.body.keepImages);
    }

    if (req.files && req.files.length) {
      console.log(`⬆️  Uploading ${req.files.length} new fleet image(s) to Cloudinary...`);
      newImages = await uploadImageBuffers(req.files, CLOUDINARY_FOLDER);
      console.log(`✅ Uploaded ${newImages.length} image(s)`);
    }

    const finalImages = [...keptImages, ...newImages];

    if (finalImages.length < 1 || finalImages.length > 10) {
      await deleteCloudinaryImages(newImages);
      return res.status(400).json({ error: "A vehicle needs between 1 and 10 images." });
    }

    // Remove from Cloudinary any images that were dropped by the admin
    const removed = vehicle.images.filter((img) => !keptImages.includes(img));
    for (const img of removed) {
      await deleteCloudinaryImage(img);
    }

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
    await deleteCloudinaryImages(newImages);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found." });

  await deleteCloudinaryImages(vehicle.images);

  await vehicle.deleteOne();
  res.json({ ok: true });
});

module.exports = router;