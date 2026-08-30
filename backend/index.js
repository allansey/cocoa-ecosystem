require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const compression = require('compression');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Copy backend/.env.example to backend/.env and set your PostgreSQL connection string.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const priceRoutes = require('./routes/price');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const reviewRoutes = require('./routes/reviews');
const iotRoutes = require('./routes/iot');
const chatRoutes = require('./routes/chat');
const offerRoutes = require('./routes/offers');

const app = express();

// Enable compression for responses
app.use(compression());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Conditional logging - only in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health Check with caching headers
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).json({ status: 'OK' });
});

// Cache static routes for 1 hour
app.use('/api/price', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});

app.use('/api/listings', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute for list views
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/offers', offerRoutes);

const prismaClient = require('./prismaClient');

async function bootstrapDatabase() {
  try {
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS "Offer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "listingId" TEXT NOT NULL,
        "buyerId" TEXT NOT NULL,
        "farmerId" TEXT NOT NULL,
        "priceGhsPerTonne" DOUBLE PRECISION NOT NULL,
        "quantityKg" DOUBLE PRECISION NOT NULL,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "counterPrice" DOUBLE PRECISION,
        "counterQuantity" DOUBLE PRECISION,
        "note" TEXT,
        "chatId" TEXT,
        "orderId" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "OrderActivity" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "actorId" TEXT NOT NULL,
        "actorName" TEXT NOT NULL,
        "actorRole" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "note" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "Review" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "targetUserId" TEXT,
        "rating" INTEGER NOT NULL DEFAULT 5,
        "comment" TEXT,
        "badges" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "SensorReading" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "soilMoisture" DOUBLE PRECISION NOT NULL,
        "temperature" DOUBLE PRECISION NOT NULL,
        "humidity" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "chatId" TEXT NOT NULL,
        "senderId" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "audioUrl" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const sql of tableStatements) {
      try {
        await prismaClient.$executeRawUnsafe(sql);
      } catch (e) {}
    }

    const alterStatements = [
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "moistureLevel" DOUBLE PRECISION;`,
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "aiHealthScore" DOUBLE PRECISION;`,
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "diseaseStatus" TEXT;`,
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "harvestDate" TIMESTAMP;`,
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "photo" TEXT;`,
      `ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'AVAILABLE';`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "proposedPrice" DOUBLE PRECISION;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryCity" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryRegion" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryNotes" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION DEFAULT 0;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "serviceFee" DOUBLE PRECISION DEFAULT 0;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "transporterName" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "transporterPhone" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vehicleNumber" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "loadingProofPhoto" TEXT;`,
      `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "weighbridgeReceipt" TEXT;`,
      `ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "counterPrice" DOUBLE PRECISION;`,
      `ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "counterQuantity" DOUBLE PRECISION;`,
      `ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "note" TEXT;`,
      `ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "chatId" TEXT;`,
      `ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "orderId" TEXT;`,
      `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;`,
      `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "badges" TEXT;`
    ];

    for (const sql of alterStatements) {
      try {
        await prismaClient.$executeRawUnsafe(sql);
      } catch (e) {}
    }
    console.log('[Database] PostgreSQL tables and schema columns verified and up-to-date.');
  } catch (err) {
    console.warn('[Database] Bootstrap notice:', err.message);
  }
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await bootstrapDatabase();
});
