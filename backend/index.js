require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const priceRoutes = require('./routes/price');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const reviewRoutes = require('./routes/reviews');
const iotRoutes = require('./routes/iot');

const app = express();

app.use(cors());
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health Check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK' }));


app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/price', priceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/iot', iotRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
