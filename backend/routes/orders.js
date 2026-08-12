const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper: log an activity entry for an order
async function logActivity(orderId, actorId, actorName, actorRole, action, note = null) {
  await prisma.orderActivity.create({
    data: { orderId, actorId, actorName, actorRole, action, note }
  });
}

// CREATE a new order
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, quantityKg, totalAmount, paymentMethod, proposedPrice } = req.body;
    const buyerId = req.user.userId;
    
    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) return res.status(404).json({ error: 'Buyer user not found.' });
    const buyerName = buyer.name || buyer.email;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { farmer: { select: { name: true } } }
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.status === 'SOLD') return res.status(400).json({ error: 'Listing is already sold.' });

    const order = await prisma.order.create({
      data: {
        listingId,
        buyerId,
        farmerId: listing.farmerId,
        quantityKg: parseFloat(quantityKg),
        totalAmount: parseFloat(totalAmount),
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
        paymentMethod: paymentMethod || 'COD',
        status: 'PENDING_APPROVAL',
      },
      include: {
        listing: true,
        farmer: { select: { id: true, name: true, phone: true } },
        buyer: { select: { id: true, name: true, phone: true } },
      }
    });

    await logActivity(order.id, buyerId, buyerName, 'BUYER', 'ORDER_PLACED',
      `Order placed for ${quantityKg}kg of ${listing.grade} cocoa at GHS ${totalAmount}`);

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
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
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

// GET single order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        review: true,
        activities: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.buyerId !== userId && order.farmerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this order.' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching order details.' });
  }
});

// UPDATE order status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, note } = req.body;
    const orderId = req.params.id;
    const userId = req.user.userId;
    const actorRole = req.user.role;

    const actor = await prisma.user.findUnique({ where: { id: userId } });
    if (!actor) return res.status(404).json({ error: 'User not found.' });
    const actorName = actor.name || actor.email;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const isFarmer = order.farmerId === userId;
    const isBuyer = order.buyerId === userId;

    if (!isFarmer && !isBuyer) return res.status(403).json({ error: 'Unauthorized.' });

    // Role-based status permission enforcement
    const farmerOnly = ['ACCEPTED', 'PAID', 'IN_TRANSIT', 'DELIVERED'];
    const buyerOnly = ['PAYMENT_PENDING', 'COMPLETED'];
    const both = ['DISPUTED', 'CANCELLED'];

    if (farmerOnly.includes(status) && !isFarmer) {
      return res.status(403).json({ error: 'Only the farmer can perform this action.' });
    }
    if (buyerOnly.includes(status) && !isBuyer) {
      return res.status(403).json({ error: 'Only the buyer can perform this action.' });
    }
    if (!farmerOnly.includes(status) && !buyerOnly.includes(status) && !both.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        activities: { orderBy: { createdAt: 'asc' } }
      }
    });

    // Auto-mark listing as SOLD when order is COMPLETED
    if (status === 'COMPLETED') {
      await prisma.listing.update({
        where: { id: order.listingId },
        data: { status: 'SOLD' }
      });
    }

    // Build human-readable activity note
    const actionLabels = {
      ACCEPTED: 'Order accepted by farmer',
      PAYMENT_PENDING: 'Buyer confirmed payment is being arranged (Cash on Delivery)',
      PAID: 'Farmer confirmed payment received',
      IN_TRANSIT: 'Cocoa dispatched and is now in transit',
      DELIVERED: 'Cocoa delivered to buyer',
      COMPLETED: 'Buyer confirmed receipt — transaction complete',
      DISPUTED: 'A dispute has been raised — admin has been notified',
      CANCELLED: 'Order has been cancelled',
    };

    await logActivity(
      orderId,
      userId,
      actorName,
      actorRole,
      status,
      note || actionLabels[status] || `Status updated to ${status}`
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating order.' });
  }
});

module.exports = router;
