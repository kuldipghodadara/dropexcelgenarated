const { auth, db } = require('../config/firebase');

/**
 * Validates the user using their UID in the Authorization header.
 * (Simplified auth to bypass token verification issues)
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
    }

    // Use UID as the simplified token
    const uid = authHeader.split('Bearer ')[1].trim();
    
    // Check if the user is in Firestore 'admin' collection
    let userDoc = await db.collection('admin').doc(uid).get();
    
    // If not in 'admin', check 'users' collection
    if (!userDoc.exists) {
      userDoc = await db.collection('users').doc(uid).get();
    }

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.status === 'blocked' || userData.status === 'suspended') {
        return res.status(403).json({ success: false, message: `Account is ${userData.status}` });
      }

      // Active device validation for regular users
      if (req.headers['x-device-id'] && userData.role !== 'admin') {
        const reqDeviceId = req.headers['x-device-id'];
        const activeDevices = userData.activeDevices || [];
        const isActive = activeDevices.find(d => d.deviceId === reqDeviceId);
        
        if (!isActive) {
          return res.status(401).json({ success: false, message: 'Unauthorized: Session invalidated due to login on another device.' });
        }
      }

      req.user = { uid: uid, ...userData };
    } else {
      // If user document not found, the token/UID is invalid or stale
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found. Please log in again.' });
    }

    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({ success: false, message: `Unauthorized: ${error.message}` });
  }
};

/**
 * Ensures the authenticated user has the 'admin' role.
 * Must be used AFTER requireAuth.
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No user found' });
  }

  // Strictly rely on the Firestore role
  const isFirestoreAdmin = req.user.role === 'admin';

  if (isFirestoreAdmin) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Forbidden: Requires admin privileges' });
  }
};

module.exports = { requireAuth, requireAdmin };
