const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');
const admin = require('../firebaseAdmin');

const router = express.Router();

const db = admin.apps.length ? admin.database() : null;

/**
 * POST /api/iot/telemetry
 * Receive data from ESP32/Arduino
 */
router.post('/telemetry', async (req, res) => {
  try {
    const { soilMoisture, temperature, humidity, userId } = req.body;
    // For simulation, we take userId from body if not provided by auth
    const effectiveUserId = userId || (req.user ? req.user.userId : null);

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 1. Save to SQLite for historical analysis
    const reading = await prisma.sensorReading.create({
      data: {
        userId: effectiveUserId,
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity)
      }
    });

    // 2. Push to Firebase Realtime Database for live dashboard
    if (db) {
      const liveRef = db.ref(`telemetry/${effectiveUserId}/current`);
      await liveRef.set({
        soilMoisture: parseFloat(soilMoisture),
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        timestamp: Date.now()
      });
    }

    res.status(201).json({ message: 'Telemetry received', reading });
  } catch (error) {
    console.error('IoT Error:', error);
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

/**
 * GET /api/iot/history
 * Fetch historical data for charts
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await prisma.sensorReading.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Last 50 readings
    });
    res.json(history.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
