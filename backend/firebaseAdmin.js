const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only once across the entire app
if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.FIREBASE_DATABASE_URL) {
    console.warn('[Firebase Admin] Missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_DATABASE_URL. Firebase features disabled.');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('[Firebase Admin] Initialized successfully.');
    } catch (e) {
      console.error('[Firebase Admin] Initialization failed:', e.message);
    }
  }
}

module.exports = admin;
