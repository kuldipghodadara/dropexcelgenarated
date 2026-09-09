require('dotenv').config({ path: '../../.env' });
const { auth, db } = require('../config/firebase');

const uid = process.argv[2];

if (!uid) {
  console.error('Please provide a Firebase UID: node make-admin.js <UID>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    // 1. Set Custom Claim in Firebase Auth
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Successfully granted admin privileges to UID: ${uid}`);

    // 2. Update Firestore Role
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      await userRef.update({ role: 'admin', updatedAt: new Date().toISOString() });
      console.log('Successfully updated Firestore user role to admin.');
    } else {
      console.warn('Warning: User document not found in Firestore. (Did they complete registration?)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  }
}

makeAdmin();
