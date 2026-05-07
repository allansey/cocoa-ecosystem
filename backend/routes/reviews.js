const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST a review for an order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const userId = req.user.userId;

    // Verify order exists and belongs to the buyer
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.buyerId !== userId) return res.status(403).json({ error: 'Only the buyer can review this order.' });
    if (order.status !== 'COMPLETED' && order.status !== 'PAID') return res.status(400).json({ error: 'Order must be paid or completed to leave a review.' });

    const review = await prisma.review.create({
      data: {
        orderId,
        userId,
        rating: parseInt(rating),
        comment
      }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Review already exists for this order.' });
    res.status(500).json({ error: 'Server error creating review.' });
  }
});

// GET reviews for a farmer
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        order: { farmerId: req.params.farmerId }
      },
      include: {
        user: { select: { name: true } }
      }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching reviews.' });
  }
});

module.exports = router;
