const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/offers/my-offers
// Fetch all offers for current user (as farmer or buyer)
router.get('/my-offers', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const where = role === 'FARMER' ? { farmerId: userId } : { buyerId: userId };

    const offers = await prisma.offer.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(offers);
  } catch (err) {
    console.error('[Offers API Error (my-offers)]:', err);
    res.status(500).json({ error: 'Failed to fetch offers', details: err.message || String(err) });
  }
});

// GET /api/offers/inquiry/:inquiryId
// Fetch all offers associated with a specific inquiry/chat
router.get('/inquiry/:inquiryId', authMiddleware, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const offers = await prisma.offer.findMany({
      where: { chatId: inquiryId },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(offers);
  } catch (err) {
    console.error('[Offers API Error]:', err);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST /api/offers
// Create a new offer on a listing
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { listingId, priceGhsPerTonne, quantityKg, note, chatId } = req.body;
    const buyerId = req.user.userId;

    if (!listingId || !priceGhsPerTonne || !quantityKg) {
      return res.status(400).json({ error: 'Missing required offer fields (listingId, priceGhsPerTonne, quantityKg)' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { farmer: true }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.farmerId === buyerId) {
      return res.status(400).json({ error: 'You cannot make an offer on your own listing.' });
    }

    const numPrice = parseFloat(priceGhsPerTonne);
    const numQty = parseFloat(quantityKg);
    const totalAmount = (numPrice * numQty) / 1000;

    const offer = await prisma.offer.create({
      data: {
        listingId,
        buyerId,
        farmerId: listing.farmerId,
        priceGhsPerTonne: numPrice,
        quantityKg: numQty,
        totalAmount,
        note: note || null,
        chatId: chatId || null,
        status: 'PENDING'
      },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        farmer: { select: { id: true, name: true, email: true, phone: true } },
        listing: true
      }
    });

    res.status(201).json(offer);
  } catch (err) {
    console.error('[Create Offer Error]:', err);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// PUT /api/offers/:id/respond
// Respond to offer (ACCEPT, DECLINE, COUNTER)
router.put('/:id/respond', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, counterPrice, counterQuantity, note } = req.body;
    const userId = req.user.userId;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: { listing: true, buyer: true, farmer: true }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Only parties involved can respond
    if (offer.farmerId !== userId && offer.buyerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this offer.' });
    }

    if (action === 'ACCEPT') {
      // 1. Mark offer accepted
      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: { status: 'ACCEPTED' }
      });

      // 2. Automatically generate confirmed Order
      const finalPrice = offer.counterPrice || offer.priceGhsPerTonne;
      const finalQty = offer.counterQuantity || offer.quantityKg;
      const totalAmount = (finalPrice * finalQty) / 1000;

      const order = await prisma.order.create({
        data: {
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          farmerId: offer.farmerId,
          quantityKg: finalQty,
          proposedPrice: finalPrice,
          totalAmount,
          subtotal: totalAmount,
          status: 'ACCEPTED',
          paymentMethod: 'MOMO',
          chatId: offer.chatId,
          activities: {
            create: {
              actorId: userId,
              actorName: req.user.name || 'User',
              actorRole: req.user.role || 'FARMER',
              action: 'OFFER_ACCEPTED',
              note: `Offer accepted at ${finalPrice.toLocaleString()} GHS/Tonne for ${finalQty} kg (Total: ${totalAmount.toLocaleString()} GHS)`
            }
          }
        }
      });

      // Link orderId to offer
      await prisma.offer.update({
        where: { id },
        data: { orderId: order.id }
      });

      return res.json({
        offer: updatedOffer,
        order,
        message: 'Offer accepted and Order generated successfully!'
      });
    }

    if (action === 'DECLINE') {
      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: { status: 'DECLINED' }
      });
      return res.json({ offer: updatedOffer, message: 'Offer declined.' });
    }

    if (action === 'COUNTER') {
      if (!counterPrice || !counterQuantity) {
        return res.status(400).json({ error: 'Missing counterPrice or counterQuantity' });
      }
      const cPrice = parseFloat(counterPrice);
      const cQty = parseFloat(counterQuantity);
      const cTotal = (cPrice * cQty) / 1000;

      const updatedOffer = await prisma.offer.update({
        where: { id },
        data: {
          status: 'COUNTERED',
          counterPrice: cPrice,
          counterQuantity: cQty,
          totalAmount: cTotal,
          note: note || offer.note
        }
      });
      return res.json({ offer: updatedOffer, message: 'Counter-offer proposed.' });
    }

    return res.status(400).json({ error: 'Invalid action (must be ACCEPT, DECLINE, or COUNTER)' });
  } catch (err) {
    console.error('[Respond Offer Error]:', err);
    res.status(500).json({ error: 'Failed to process offer response' });
  }
});

module.exports = router;
