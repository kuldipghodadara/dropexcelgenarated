const admin = require('firebase-admin');

// Ensure dotenv is loaded before this file is required
if (!admin.apps.length) {
  try {
    console.log('--- FIREBASE ENV CHECK ---');
    console.log('PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID.length : 'MISSING');
    console.log('CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? process.env.FIREBASE_CLIENT_EMAIL.length : 'MISSING');
    console.log('PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 'MISSING');
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      // Handle Vercel environment variable formatting issues
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
