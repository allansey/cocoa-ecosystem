const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware, farmerRoleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET all listings (Public or logged in users)
router.get('/', async (req, res) => {
  try {
    const { region, status, search, minPrice, maxPrice } = req.query;
    
    const filter = {};
    if (region) filter.region = region;
    if (status) filter.status = status;
    
    if (minPrice || maxPrice) {
      filter.priceGhsPerTonne = {};
      if (minPrice) filter.priceGhsPerTonne.gte = parseFloat(minPrice);
      if (maxPrice) filter.priceGhsPerTonne.lte = parseFloat(maxPrice);
    }
    
    // Search on grade and region
    if (search) {
      filter.OR = [
        { grade: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } }
      ];
    }

    const listings = await prisma.listing.findMany({
      where: filter,
      include: {
        farmer: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(listings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching listings.' });
  }
});

// GET listing by ID
router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        farmer: {
          select: { id: true, name: true, phone: true }
        }
      }
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    res.json(listing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching listing.' });
  }
});

// POST new listing (Farmers only)
router.post('/', [authMiddleware, farmerRoleMiddleware], async (req, res) => {
  try {
    const { grade, quantityKg, priceGhsPerTonne, region, photos } = req.body;

    const newListing = await prisma.listing.create({
      data: {
        grade,
        quantityKg: parseFloat(quantityKg),
        priceGhsPerTonne: parseFloat(priceGhsPerTonne),
        region,
        photos: photos || [],
        farmerId: req.user.userId,
      }
    });

    res.status(201).json(newListing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating listing.' });
  }
});

// PUT update listing status or details (Farmers only, must own the listing)
router.put('/:id', [authMiddleware, farmerRoleMiddleware], async (req, res) => {
  try {
    const listingId = req.params.id;
    const updateData = req.body;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.farmerId !== req.user.userId) return res.status(403).json({ error: 'Not authorized to edit this listing.' });

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: updateData
    });

    res.json(updatedListing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating listing.' });
  }
});

module.exports = router;
