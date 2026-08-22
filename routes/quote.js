const express = require("express");
const router = express.Router();
const QuoteRequest = require("../models/QuoteRequest");

const SERVICE_TYPES = ["freight", "car-hire", "clearing", "removals", "warehousing"];
const STATUSES = ["new", "contacted", "closed"];

function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  next();
}

router.use(requireAuth);

// --------------------------------------------------------------------
// GET /api/quote-requests — ?status=new|contacted|closed filter optional
// --------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && STATUSES.includes(status) ? { status } : {};
    const quotes = await QuoteRequest.find(filter).sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    console.error("Quote request list error:", err.message);
    res.status(500).json({ error: "Could not load quote requests." });
  }
});

// --------------------------------------------------------------------
// PATCH /api/quote-requests/:id — update status
// --------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !STATUSES.includes(status)) {
      return res.status(400).json({ error: "A valid status is required." });
    }

    const quote = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!quote) return res.status(404).json({ error: "Quote request not found." });

    res.json(quote);
  } catch (err) {
    console.error("Quote request update error:", err.message);
    res.status(500).json({ error: "Could not update quote request." });
  }
});

// --------------------------------------------------------------------
// DELETE /api/quote-requests/:id
// --------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const quote = await QuoteRequest.findByIdAndDelete(req.params.id);
    if (!quote) return res.status(404).json({ error: "Quote request not found." });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Quote request delete error:", err.message);
    res.status(500).json({ error: "Could not delete quote request." });
  }
});

module.exports = router;
