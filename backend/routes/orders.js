const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// CREATE a new order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, quantityKg, totalAmount, paymentMethod } = req.body;
    const buyerId = req.user.userId;

    // Fetch listing to get farmerId and verify availability
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.status === 'SOLD') return res.status(400).json({ error: 'Listing is already sold.' });

    const order = await prisma.order.create({
      data: {
        listingId,
        buyerId,
        farmerId: listing.farmerId,
        quantityKg: parseFloat(quantityKg),
        totalAmount: parseFloat(totalAmount),
        paymentMethod: paymentMethod || 'MOMO',
        status: 'PENDING'
      },
      include: {
        listing: true,
        farmer: { select: { name: true, phone: true } }
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating order.' });
  }
});

// GET my orders (As Buyer or Farmer)
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const orders = await prisma.order.findMany({
      where: role === 'FARMER' ? { farmerId: userId } : { buyerId: userId },
      include: {
        listing: true,
        buyer: { select: { name: true, email: true, phone: true } },
        farmer: { select: { name: true, email: true, phone: true } },
        review: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching orders.' });
  }
});

// UPDATE order status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Authorization check
    // Only farmer can update to SHIPPED
    // Only buyer can update to COMPLETED (Confirm receipt)
    // Both can CANCEL if PENDING
    if (status === 'SHIPPED' && order.farmerId !== userId) return res.status(403).json({ error: 'Only farmer can mark as shipped.' });
    if (status === 'COMPLETED' && order.buyerId !== userId) return res.status(403).json({ error: 'Only buyer can confirm receipt.' });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // If completed, maybe mark listing as SOLD if quantity is fully consumed
    // For now, let's keep it simple.

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating order.' });
  }
});

module.exports = router;
