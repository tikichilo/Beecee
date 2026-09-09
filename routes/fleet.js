const express = require("express");
const router = express.Router();

const FleetCategory = require("../models/FleetCategory");
const { requireAdmin } = require("../middleware/auth");
const { CATEGORIES, CATEGORY_KEYS, CATEGORY_LABELS } = require("../config/fleetCategories");

// ------------------------------------------------------------------
// Makes sure a document exists for every category key, so the public
// site and admin dashboard always have all 5 rows to show/edit even
// before an admin has ever touched fleet.html. New categories default
// to acceptingBookings:false with a 0-0 range until an admin sets a
// real range — never shown as "available" with a made-up price.
// ------------------------------------------------------------------
async function ensureSeeded() {
  const existing = await FleetCategory.find({}, "category");
  const have = new Set(existing.map((c) => c.category));
  const missing = CATEGORY_KEYS.filter((key) => !have.has(key));
  if (!missing.length) return;

  await FleetCategory.insertMany(
    missing.map((category) => ({
      category,
      minRate: 0,
      maxRate: 0,
      acceptingBookings: false,
    })),
    { ordered: false }
  ).catch(() => {}); // ignore races between concurrent requests

}

function withLabel(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, label: CATEGORY_LABELS[obj.category] || obj.category };
}

// ------------------------------------------------------------------
// PUBLIC — used by index.html and fleet.html to render the 5 category
// rate cards.
// GET /api/fleet
// ------------------------------------------------------------------
router.get("/", async (req, res) => {
  await ensureSeeded();
  const categories = await FleetCategory.find().sort({ category: 1 });

  // Return in the fixed CATEGORIES display order, not alphabetical.
  const byKey = new Map(categories.map((c) => [c.category, c]));
  const ordered = CATEGORIES.map((c) => withLabel(byKey.get(c.key)));

  res.json(ordered);
});

router.get("/:category", async (req, res) => {
  if (!CATEGORY_KEYS.includes(req.params.category)) {
    return res.status(404).json({ error: "Unknown category." });
  }
  await ensureSeeded();
  const doc = await FleetCategory.findOne({ category: req.params.category });
  if (!doc) return res.status(404).json({ error: "Category not found." });
  res.json(withLabel(doc));
});

// ------------------------------------------------------------------
// ADMIN — set the rate range / availability for a category. Categories
// are a fixed set (see config/fleetCategories.js) so this is always an
// upsert against one of the 5 known keys, never a create/delete.
// PUT /api/fleet/:category
// ------------------------------------------------------------------
router.put("/:category", requireAdmin, async (req, res) => {
  const { category } = req.params;
  if (!CATEGORY_KEYS.includes(category)) {
    return res.status(404).json({ error: "Unknown category." });
  }

  try {
    const minRate = Number(req.body.minRate);
    const maxRate = Number(req.body.maxRate);

    if (!Number.isFinite(minRate) || !Number.isFinite(maxRate) || minRate < 0 || maxRate < 0) {
      return res.status(400).json({ error: "Enter a valid minimum and maximum daily rate." });
    }
    if (maxRate < minRate) {
      return res.status(400).json({ error: "Maximum rate can't be lower than the minimum rate." });
    }

    const doc = await FleetCategory.findOneAndUpdate(
      { category },
      {
        category,
        minRate,
        maxRate,
        acceptingBookings: req.body.acceptingBookings !== undefined ? !!req.body.acceptingBookings : true,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(withLabel(doc));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;