const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');
const dotenv = require('dotenv');

// Load environment variables from the frontend dir
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function runTest() {
  console.log('Testing Firebase connection...');
  try {
    const testRef = ref(db, 'userChats/test_bot/test_chat_1');
    
    // Write test
    console.log('Attempting to write to Realtime Database...');
    await set(testRef, {
      title: 'Test Chat',
      lastMessage: 'Hello from Bot',
      timestamp: Date.now()
    });
    console.log('✅ Write successful.');

    // Read test
    console.log('Attempting to read from Realtime Database...');
    const snapshot = await get(ref(db, 'userChats/test_bot'));
    if (snapshot.exists()) {
      console.log('✅ Read successful:', Object.keys(snapshot.val()));
    } else {
      console.log('❌ No data found.');
    }

    // Cleanup
    await set(testRef, null);
    console.log('✅ Cleanup successful.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    process.exit(1);
  }
}

runTest();
