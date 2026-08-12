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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
