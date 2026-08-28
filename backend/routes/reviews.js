const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews
// Submit a 5-star review and trust badges for a completed order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderId, rating, comment, badges } = req.body;
    const userId = req.user.userId;

    if (!orderId || !rating) {
      return res.status(400).json({ error: 'orderId and rating (1-5) are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { buyer: true, farmer: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only buyer or farmer of this order can leave a review
    if (order.buyerId !== userId && order.farmerId !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this order.' });
    }

    // Target user is the other party
    const targetUserId = order.buyerId === userId ? order.farmerId : order.buyerId;

    // Check if review already exists
    const existing = await prisma.review.findUnique({ where: { orderId } });
    if (existing) {
      return res.status(400).json({ error: 'A review has already been submitted for this order.' });
    }

    const review = await prisma.review.create({
      data: {
        orderId,
        userId,
        targetUserId,
        rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
        comment: comment || '',
        badges: Array.isArray(badges) ? badges.join(',') : (badges || '')
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    // Add order activity
    await prisma.orderActivity.create({
      data: {
        orderId,
        actorId: userId,
        actorName: req.user.name || 'User',
        actorRole: req.user.role || 'BUYER',
        action: 'REVIEWED',
        note: `Rated ${rating} ★: ${comment || 'No comment'}`
      }
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('[Review Error]:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/user/:userId
// Fetch aggregate rating and review history for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { targetUserId: userId },
      include: {
        user: { select: { id: true, name: true, role: true } },
        order: { select: { id: true, quantityKg: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = reviews.length;
    const averageRating = total > 0 
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1))
      : 5.0;

    res.json({
      averageRating,
      totalReviews: total,
      reviews
    });
  } catch (err) {
    console.error('[Get Reviews Error]:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

module.exports = router;
