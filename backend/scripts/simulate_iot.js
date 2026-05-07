const axios = require('axios');

const simulateData = async () => {
  const userId = "26d02fdb-cf70-4f6b-a8a5-a5aa43b1c9ed"; // Real userId from DB
  
  for (let i = 0; i < 10; i++) {
    const telemetry = {
      userId,
      soilMoisture: 40 + Math.random() * 20,
      temperature: 25 + Math.random() * 10,
      humidity: 60 + Math.random() * 30
    };

    try {
      await axios.post('http://localhost:5000/api/iot/telemetry', telemetry);
      console.log(`Pushed data point ${i + 1}:`, telemetry);
    } catch (err) {
      console.error('Failed to push data:', err.message);
    }
    
    // Wait 2 seconds between points
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

simulateData();
