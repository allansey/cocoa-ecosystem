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
    const {
      listingId, quantityKg, totalAmount, paymentMethod, proposedPrice,
      deliveryAddress, deliveryCity, deliveryRegion, recipientName, recipientPhone, deliveryNotes,
      subtotal, deliveryFee, serviceFee, estimatedDeliveryDate
    } = req.body;
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

    // Calculate default estimated delivery date (3 days from now) if not provided
    const estDate = estimatedDeliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

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
        deliveryAddress: deliveryAddress || null,
        deliveryCity: deliveryCity || null,
        deliveryRegion: deliveryRegion || listing.region || null,
        recipientName: recipientName || buyer.name || 'Recipient',
        recipientPhone: recipientPhone || buyer.phone || null,
        deliveryNotes: deliveryNotes || null,
        subtotal: subtotal ? parseFloat(subtotal) : parseFloat(totalAmount),
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 0,
        serviceFee: serviceFee ? parseFloat(serviceFee) : 0,
        estimatedDeliveryDate: estDate,
      },
      include: {
        listing: true,
        farmer: { select: { id: true, name: true, phone: true } },
        buyer: { select: { id: true, name: true, phone: true } },
      }
    });

    await logActivity(order.id, buyerId, buyerName, 'BUYER', 'ORDER_PLACED',
      `Order placed for ${quantityKg}kg of ${listing.grade} cocoa. Deliver to ${deliveryCity || 'destination'} (${paymentMethod || 'COD'}).`);

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
    const { status, search } = req.query;

    let whereClause = role === 'FARMER' ? { farmerId: userId } : { buyerId: userId };

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        whereClause.status = { in: ['PENDING_APPROVAL', 'ACCEPTED', 'PAYMENT_PENDING', 'PAID', 'IN_TRANSIT', 'DELIVERED'] };
      } else if (status === 'COMPLETED') {
        whereClause.status = 'COMPLETED';
      } else if (status === 'CANCELLED') {
        whereClause.status = { in: ['CANCELLED', 'DISPUTED'] };
      } else {
        whereClause.status = status;
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        review: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Client-side text search if query provided
    let filtered = orders;
    if (search) {
      const q = search.toLowerCase();
      filtered = orders.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.listing.grade.toLowerCase().includes(q) ||
        (o.buyer && o.buyer.name.toLowerCase().includes(q)) ||
        (o.farmer && o.farmer.name.toLowerCase().includes(q)) ||
        (o.deliveryCity && o.deliveryCity.toLowerCase().includes(q))
      );
    }

    res.json(filtered);
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

// UPDATE order status & logistics details
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { 
      status, note, transporterName, transporterPhone, vehicleNumber, 
      trackingNumber, estimatedDeliveryDate, loadingProofPhoto, weighbridgeReceipt 
    } = req.body;
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
    const farmerOnly = ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'];
    const buyerOnly = ['PAYMENT_PENDING', 'PAID', 'COMPLETED'];
    const both = ['DISPUTED', 'CANCELLED'];

    if (farmerOnly.includes(status) && !isFarmer) {
      return res.status(403).json({ error: 'Only the farmer can perform this action.' });
    }
    if (buyerOnly.includes(status) && !isBuyer && status !== 'PAID') {
      return res.status(403).json({ error: 'Only the buyer can perform this action.' });
    }
    if (!farmerOnly.includes(status) && !buyerOnly.includes(status) && !both.includes(status) && status !== 'PAID') {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Build update object
    const updateData = { status };
    if (transporterName) updateData.transporterName = transporterName;
    if (transporterPhone) updateData.transporterPhone = transporterPhone;
    if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = estimatedDeliveryDate;
    if (loadingProofPhoto) updateData.loadingProofPhoto = loadingProofPhoto;
    if (weighbridgeReceipt) updateData.weighbridgeReceipt = weighbridgeReceipt;

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        review: true,
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
    let defaultNote = `Status updated to ${status}`;
    if (status === 'ACCEPTED') defaultNote = 'Order accepted by farmer';
    else if (status === 'PAYMENT_PENDING') defaultNote = 'Buyer confirmed payment arrangement';
    else if (status === 'PAID') defaultNote = 'Farmer confirmed payment received';
    else if (status === 'IN_TRANSIT') {
      defaultNote = `Dispatched with ${transporterName || 'Transporter'} (${vehicleNumber || 'Truck'}) - Track #${trackingNumber || orderId.slice(0,8)}`;
    }
    else if (status === 'DELIVERED') defaultNote = 'Cocoa batch delivered to buyer destination';
    else if (status === 'COMPLETED') defaultNote = 'Buyer inspected and confirmed receipt — Order Complete';
    else if (status === 'DISPUTED') defaultNote = 'A dispute was submitted for support review';
    else if (status === 'CANCELLED') defaultNote = 'Order was cancelled';

    await logActivity(
      orderId,
      userId,
      actorName,
      actorRole,
      status,
      note || defaultNote
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating order.' });
  }
});

// UPDATE logistics/driver info directly
router.put('/:id/logistics', authMiddleware, async (req, res) => {
  try {
    const { 
      transporterName, transporterPhone, vehicleNumber, trackingNumber, 
      estimatedDeliveryDate, loadingProofPhoto, weighbridgeReceipt 
    } = req.body;
    const orderId = req.params.id;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.farmerId !== userId) {
      return res.status(403).json({ error: 'Only the farmer/seller can update dispatch logistics.' });
    }

    const updateData = {
      transporterName,
      transporterPhone,
      vehicleNumber,
      trackingNumber,
      estimatedDeliveryDate
    };
    if (loadingProofPhoto) updateData.loadingProofPhoto = loadingProofPhoto;
    if (weighbridgeReceipt) updateData.weighbridgeReceipt = weighbridgeReceipt;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        listing: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        review: true,
        activities: { orderBy: { createdAt: 'asc' } }
      }
    });

    const userObj = await prisma.user.findUnique({ where: { id: userId } });
    await logActivity(
      orderId,
      userId,
      userObj.name || userObj.email,
      'FARMER',
      'LOGISTICS_UPDATED',
      `Transporter details updated: ${transporterName || 'Driver'} (${vehicleNumber || 'Vehicle'})`
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating logistics.' });
  }
});

module.exports = router;
