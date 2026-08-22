const express = require("express");
const router = express.Router();
const Receipt = require("../models/Receipt");

const SERVICE_TYPES = ["freight", "car-hire", "clearing", "removals", "warehousing"];

function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  next();
}

router.use(requireAuth);

/** BC-2026-0001 style — count-based, fine at this scale; not collision-proof under heavy concurrent writes. */
async function nextReceiptNumber() {
  const year = new Date().getFullYear();
  const count = await Receipt.countDocuments({
    receiptNumber: { $regex: `^BC-${year}-` },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `BC-${year}-${seq}`;
}

// --------------------------------------------------------------------
// GET /api/receipts — ?serviceType= filter optional
// --------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { serviceType } = req.query;
    const filter = serviceType ? { serviceType } : {};
    const receipts = await Receipt.find(filter).sort({ issuedDate: -1 });
    res.json(receipts);
  } catch (err) {
    console.error("Receipt list error:", err.message);
    res.status(500).json({ error: "Could not load receipts." });
  }
});

// --------------------------------------------------------------------
// POST /api/receipts — issue a new receipt
// --------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { serviceType, clientName, clientPhone, clientEmail, amount, currency, description, issuedDate } = req.body;

    if (!serviceType || !clientName || amount === undefined || amount === null || amount === "") {
      return res.status(400).json({ error: "Service type, client name, and amount are required." });
    }
    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ error: "Invalid service type." });
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: "Amount must be a positive number." });
    }

    const receipt = await Receipt.create({
      receiptNumber: await nextReceiptNumber(),
      serviceType,
      clientName,
      clientPhone,
      clientEmail,
      amount: numericAmount,
      currency: currency || "ZMW",
      description,
      issuedDate: issuedDate || Date.now(),
    });

    res.status(201).json(receipt);
  } catch (err) {
    console.error("Receipt creation error:", err.message);
    res.status(500).json({ error: "Something went wrong issuing the receipt." });
  }
});

// --------------------------------------------------------------------
// DELETE /api/receipts/:id
// --------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const receipt = await Receipt.findByIdAndDelete(req.params.id);
    if (!receipt) return res.status(404).json({ error: "Receipt not found." });
    res.json({ deleted: true });
  } catch (err) {
    console.error("Receipt delete error:", err.message);
    res.status(500).json({ error: "Could not delete receipt." });
  }
});

module.exports = router;
