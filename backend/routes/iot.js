const express = require('express');
const prisma = require('../prismaClient');
const { authMiddleware } = require('../middleware/auth');
const admin = require('../firebaseAdmin');

const router = express.Router();

const db = admin.apps.length ? admin.database() : null;

// Helper: Generate baseline sample telemetry points
function generateBaselineTelemetry(userId) {
  const points = [];
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now - i * 15 * 60 * 1000);
    points.push({
      id: `sample_${i}`,
      userId: userId || 'demo_farmer',
      soilMoisture: Math.round(58 + Math.sin(i / 2) * 12 + (Math.random() * 4 - 2)),
      temperature: Math.round((27.5 + Math.cos(i / 3) * 3 + (Math.random() * 1.5 - 0.75)) * 10) / 10,
      humidity: Math.round(75 + Math.sin(i / 4) * 8 + (Math.random() * 3 - 1.5)),
      createdAt: time.toISOString()
    });
  }
  return points;
}

/**
 * GET /api/iot/realtime
 * Fetch the latest real-time sensor reading (for live dashboard telemetry)
 */
router.get('/realtime', async (req, res) => {
  try {
    const userId = (req.user && req.user.userId) || req.query.userId;
    let reading = null;

    if (userId) {
      reading = await prisma.sensorReading.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!reading) {
      reading = await prisma.sensorReading.findFirst({
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!reading) {
      return res.json({
        soilMoisture: 62.5,
        temperature: 28.4,
        humidity: 76.0,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });
    }

    res.json(reading);
  } catch (error) {
    console.error('Fetch IoT Realtime Error:', error);
    res.json({
      soilMoisture: 60.0,
      temperature: 28.0,
      humidity: 75.0,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    });
  }
});

/**
 * POST /api/iot/telemetry
 * Receive data from ESP32/Arduino or IoT Gateway
 */
router.post('/telemetry', async (req, res) => {
  try {
    const { soilMoisture, temperature, humidity, userId } = req.body;
    const effectiveUserId = userId || (req.user ? req.user.userId : null);

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // 1. Save to Database for historical analysis
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
 * POST /api/iot/simulate
 * Trigger a simulated sensor pulse (for testing & demonstration)
 */
router.post('/simulate', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Generate realistic fluctuating values for Ghanaian cocoa plantation
    const soilMoisture = Math.round(55 + (Math.random() * 25 - 10)); // 45% - 70%
    const temperature = Math.round((28 + (Math.random() * 6 - 3)) * 10) / 10; // 25°C - 31°C
    const humidity = Math.round(72 + (Math.random() * 16 - 8)); // 64% - 80%

    const reading = await prisma.sensorReading.create({
      data: {
        userId,
        soilMoisture,
        temperature,
        humidity
      }
    });

    if (db) {
      const liveRef = db.ref(`telemetry/${userId}/current`);
      await liveRef.set({
        soilMoisture,
        temperature,
        humidity,
        timestamp: Date.now()
      });
    }

    res.status(201).json({
      message: 'Simulated telemetry broadcast successfully',
      reading
    });
  } catch (error) {
    console.error('Simulate IoT Error:', error);
    res.status(500).json({ error: 'Failed to simulate telemetry' });
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
      take: 50
    });

    if (history.length === 0) {
      // Provide initial baseline points so charts render richly
      const baseline = generateBaselineTelemetry(userId);
      return res.json(baseline);
    }

    res.json(history.reverse());
  } catch (error) {
    console.error('Fetch IoT History Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
