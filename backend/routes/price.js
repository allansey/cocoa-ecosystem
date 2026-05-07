const express = require('express');

const router = express.Router();

// Mock price database for MVP. In reality, this would be in DB or from an external API.
let currentPriceGhsPerTonne = 35000;

router.get('/', (req, res) => {
  res.json({
    priceGhsPerTonne: currentPriceGhsPerTonne,
    currency: 'GHS',
    unit: 'Tonne',
    updatedAt: new Date().toISOString()
  });
});

// Admin endpoint to manually update price (Mocked for MVP)
router.post('/', (req, res) => {
  const { price } = req.body;
  if (!price) return res.status(400).json({ error: 'Price is required' });
  
  // Note: Add admin middleware auth in future
  currentPriceGhsPerTonne = parseFloat(price);
  
  res.json({ message: 'Price updated successfully', price: currentPriceGhsPerTonne });
});

module.exports = router;
