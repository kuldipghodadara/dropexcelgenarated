const express = require('express');
const { auth, db } = require('../config/firebase');
const router = express.Router();

/**
 * Register a new user
 * Note: Password is required for Firebase Auth but not stored in Firestore.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, mobile, password, name } = req.body;

    if (!email || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Email, mobile, and password are required' });
    }

    const lowerEmail = email.toLowerCase();

    // Check if mobile exists in Firestore (Firebase Auth doesn't natively prevent duplicate phone numbers easily without SMS verification)
    const mobileQuery = await db.collection('users').where('mobile', '==', mobile).get();
    if (!mobileQuery.empty) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: lowerEmail,
      password: password, // Firebase handles case-sensitive hashing automatically
      displayName: name || '',
    });

    // Fetch global settings for trial
    let defaultTrialDays = 7;
    let defaultDeviceLimit = 2;
    try {
      const settingsDoc = await db.collection('settings').doc('global').get();
      if (settingsDoc.exists) {
        const s = settingsDoc.data();
        if (s.defaultTrialDays) defaultTrialDays = s.defaultTrialDays;
        if (s.defaultDeviceLimit) defaultDeviceLimit = s.defaultDeviceLimit;
      }
    } catch (e) {
      console.error('Failed to load global settings', e);
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + defaultTrialDays);
    expiry.setUTCHours(23, 59, 59, 999);

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email: lowerEmail,
      mobile: mobile,
      displayName: name || '',
      role: 'user', // Default role securely set on backend
      status: 'active',
      planType: 'trial',
      planName: 'Free Trial',
      planId: 'trial',
      planExpiryDate: expiry.toISOString(),
      deviceLimit: defaultDeviceLimit,
      activeDevices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    return res.status(201).json({ success: true, data: { uid: userRecord.uid, email: lowerEmail, role: 'user' } });

  } catch (error) {
    console.error('Registration Error:', error);
    // Handle Firebase specific errors gracefully
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ success: false, message: 'Email address is already registered' });
    }
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

/**
 * Note: Login is typically handled on the client via Firebase Client SDK to get the ID token, 
 * but since we are required to have a POST /api/auth/login, we'll verify it using the Firebase REST API
 * or we can instruct the frontend to send the ID token instead.
 * 
 * For this implementation, if the client sends email/password, we would need to call Google Identity Toolkit API.
 * For better security and simplicity, we expect the frontend to authenticate with Firebase Client SDK
 * and send the ID token to a /login or /session endpoint to create a session cookie.
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, deviceId, deviceName } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    let userEmail = identifier.toLowerCase();

    // Check if identifier is a mobile number
    if (/^\d{10}$/.test(identifier)) {
      // First check admin collection
      let userSnapshot = await db.collection('admin').where('mobile', '==', identifier).limit(1).get();
      
      // If not in admin, check users collection
      if (userSnapshot.empty) {
        userSnapshot = await db.collection('users').where('mobile', '==', identifier).limit(1).get();
      }

      if (userSnapshot.empty) {
        return res.status(401).json({ success: false, message: 'Invalid mobile or password' });
      }
      userEmail = userSnapshot.docs[0].data().email;
    }

    // Since Firebase Admin SDK cannot verify passwords, we call Identity Toolkit REST API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password, returnSecureToken: true })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(401).json({ success: false, message: 'Invalid email/mobile or password' });
    }

    const uid = data.localId;
    const idToken = data.idToken;

    // Fetch user doc to check status. Try 'admin' collection first, then 'users'
    let userDoc = await db.collection('admin').doc(uid).get();
    
    if (!userDoc.exists) {
      userDoc = await db.collection('users').doc(uid).get();
    }

    const userData = userDoc.data();

    if (userData && (userData.status === 'blocked' || userData.status === 'suspended')) {
      return res.status(403).json({ success: false, message: `Account is ${userData.status}` });
    }

    // Update lastLoginAt and active devices
    if (userDoc.exists) {
      let activeDevices = userData.activeDevices || [];
      const limit = userData.deviceLimit || 2;
      
      // Remove this device if it already exists to move it to the end (most recent)
      activeDevices = activeDevices.filter(d => d.deviceId !== deviceId);
      
      // Add the current device
      activeDevices.push({
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        lastLoginAt: new Date().toISOString()
      });
      
      // Evict oldest if exceeding limit
      if (activeDevices.length > limit) {
        const overBy = activeDevices.length - limit;
        activeDevices = activeDevices.slice(overBy);
      }

      await userDoc.ref.update({
        lastLoginAt: new Date().toISOString(),
        activeDevices
      });
      
      userData.activeDevices = activeDevices;
    }

    console.log('Token from Google (first 50 chars):', idToken.substring(0, 50));
    console.log('Token length from Google:', idToken.length);

    // Return the UID as the simplified token
    return res.status(200).json({ success: true, data: userData, token: uid });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile and live status
 */
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, async (req, res) => {
  // requireAuth already checks the 'admin' or 'users' collection and populates req.user
  return res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
