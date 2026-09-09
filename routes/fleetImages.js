const express = require("express");
const router = express.Router();
const multer = require("multer");

const FleetImage = require("../models/Fleetimage");
const { requireAdmin } = require("../middleware/auth");
const { uploadImageBuffer, deleteCloudinaryImage } = require("../utils/cloudinaryUpload");

const CLOUDINARY_FOLDER = "bee-cee-logistics/fleet-gallery";
const MAX_IMAGES_PER_UPLOAD = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES_PER_UPLOAD },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP images are allowed."));
    }
    cb(null, true);
  },
});

// --------------------------------------------------------------------
// GET /api/fleet-images — public. Used by index.html to render the
// homepage fleet gallery. Oldest first so new uploads land at the end.
// --------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const images = await FleetImage.find().sort({ createdAt: 1 });
    res.json(images);
  } catch (err) {
    console.error("Fleet image list error:", err.message);
    res.status(500).json({ error: "Could not load fleet photos." });
  }
});

// --------------------------------------------------------------------
// POST /api/fleet-images — admin only. Uploads one or more photos in
// a single request (field name "images").
// --------------------------------------------------------------------
router.post("/", requireAdmin, upload.array("images", MAX_IMAGES_PER_UPLOAD), async (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: "At least one image is required." });
  }

  const uploadedUrls = [];
  try {
    for (const file of req.files) {
      const imageUrl = await uploadImageBuffer(file.buffer, CLOUDINARY_FOLDER);
      uploadedUrls.push(imageUrl);
    }
    const docs = await FleetImage.insertMany(uploadedUrls.map((imageUrl) => ({ imageUrl })));
    res.status(201).json(docs);
  } catch (err) {
    // Clean up anything that already made it to Cloudinary if the DB save failed
    await Promise.all(uploadedUrls.map((url) => deleteCloudinaryImage(url).catch(() => {})));
    console.error("Fleet image upload error:", err.message);
    res.status(500).json({ error: "Something went wrong uploading photos." });
  }
});

// --------------------------------------------------------------------
// DELETE /api/fleet-images/:id — admin only.
// --------------------------------------------------------------------
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const image = await FleetImage.findByIdAndDelete(req.params.id);
    if (!image) return res.status(404).json({ error: "Photo not found." });
    await deleteCloudinaryImage(image.imageUrl).catch(() => {});
    res.json({ deleted: true });
  } catch (err) {
    console.error("Fleet image delete error:", err.message);
    res.status(500).json({ error: "Could not delete photo." });
  }
});

module.exports = router;