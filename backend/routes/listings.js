const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware, farmerRoleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET all listings (Public or logged in users)
router.get('/', async (req, res) => {
  try {
    const { region, status, search, minPrice, maxPrice, sort, farmerId, page = 1, limit = 20 } = req.query;
    
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Cap at 100
    const skip = (pageNum - 1) * limitNum;
    
    const filter = {};
    if (region) filter.region = region;
    if (status) filter.status = status;
    if (farmerId) filter.farmerId = farmerId;
    
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

    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') {
      orderBy = { priceGhsPerTonne: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { priceGhsPerTonne: 'desc' };
    }

    // Get total count for pagination metadata
    const total = await prisma.listing.count({ where: filter });

    const listings = await prisma.listing.findMany({
      where: filter,
      select: {
        id: true,
        grade: true,
        quantityKg: true,
        priceGhsPerTonne: true,
        region: true,
        photo: true,
        status: true,
        createdAt: true,
        farmer: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    res.json({ 
      data: listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
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
    const { grade, quantityKg, priceGhsPerTonne, region, photo } = req.body;

    const newListing = await prisma.listing.create({
      data: {
        grade,
        quantityKg: parseFloat(quantityKg),
        priceGhsPerTonne: parseFloat(priceGhsPerTonne),
        region,
        photo: photo || null,
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
    const { grade, quantityKg, priceGhsPerTonne, region, photo, status } = req.body;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.farmerId !== req.user.userId) return res.status(403).json({ error: 'Not authorized to edit this listing.' });

    // Only allow whitelisted fields to prevent mass-assignment
    const updateData = {};
    if (grade !== undefined) updateData.grade = grade;
    if (quantityKg !== undefined) updateData.quantityKg = parseFloat(quantityKg);
    if (priceGhsPerTonne !== undefined) updateData.priceGhsPerTonne = parseFloat(priceGhsPerTonne);
    if (region !== undefined) updateData.region = region;
    if (photo !== undefined) updateData.photo = photo;
    if (status !== undefined) updateData.status = status;

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
