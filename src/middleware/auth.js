const { auth, db } = require('../config/firebase');

/**
 * Validates the Firebase ID token in the Authorization header.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    console.log('Received Token Header (first 50 chars):', idToken.substring(0, 50));
    console.log('Received Token Length:', idToken.length);

    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Check if the user is in Firestore 'users' collection
    let userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    // If not in 'users', check 'admin' collection
    if (!userDoc.exists) {
      userDoc = await db.collection('admin').doc(decodedToken.uid).get();
    }

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.status === 'blocked' || userData.status === 'suspended') {
        return res.status(403).json({ success: false, message: `Account is ${userData.status}` });
      }
      req.user = { uid: decodedToken.uid, ...userData };
    } else {
      req.user = { uid: decodedToken.uid, role: 'user' };
    }

    next();
  } catch (error) {
    console.error('Auth Error:', error);
    // Send the actual error message to the frontend for easier debugging
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

  // Check custom claim first, then fallback to Firestore role
  // Best practice: Trust the custom claim for secure admin routing
  const authRecord = await auth.getUser(req.user.uid);
  const isCustomClaimAdmin = authRecord.customClaims && authRecord.customClaims.admin === true;
  const isFirestoreAdmin = req.user.role === 'admin';

  if (isCustomClaimAdmin || isFirestoreAdmin) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Forbidden: Requires admin privileges' });
  }
};

module.exports = { requireAuth, requireAdmin };
