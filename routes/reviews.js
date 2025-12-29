const express = require('express');
const router = express.Router();

// Placeholder review routes
router.post('/', async (req, res) => {
  // Create review
  res.json({ success: true, message: 'Review created' });
});

router.get('/barber/:barberId', async (req, res) => {
  // Get barber reviews
  res.json({ success: true, reviews: [] });
});

module.exports = router;

