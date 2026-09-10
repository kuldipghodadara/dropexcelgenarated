const express = require('express');
const { auth, db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// All routes in this file require both authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Helper function for Audit Logging
 */
async function logAdminAction(adminUid, action, targetUserUid, metadata = {}) {
  try {
    await db.collection('admin_logs').add({
      adminUid,
      action,
      targetUserUid,
      timestamp: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
}

/**
 * GET /api/admin/users
 * Fetches all users with simple pagination
 */
router.get('/users', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .get(); // In production with thousands of users, use startAfter and limit
      
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push(doc.data());
    });

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/:uid/status
 * Updates user status (active, blocked, suspended)
 */
router.put('/users/:uid/status', async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'blocked', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    if (uid === req.user.uid) {
      return res.status(400).json({ success: false, message: 'You cannot change your own status' });
    }

    await db.collection('users').doc(uid).update({ 
      status,
      updatedAt: new Date().toISOString()
    });
    
    await logAdminAction(req.user.uid, `USER_${status.toUpperCase()}`, uid);

    return res.status(200).json({ success: true, message: `User status changed to ${status}` });
  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

/**
 * PUT /api/admin/users/:uid/role
 * Updates user role (user, admin)
 */
router.put('/users/:uid/role', async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role value' });
    }

    if (uid === req.user.uid) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    // Set custom claim in Firebase Auth for secure backend validation
    await auth.setCustomUserClaims(uid, { admin: role === 'admin' });

    // Update Firestore document for UI rendering
    await db.collection('users').doc(uid).update({ 
      role,
      updatedAt: new Date().toISOString()
    });

    await logAdminAction(req.user.uid, 'USER_ROLE_CHANGED', uid, { newRole: role });

    return res.status(200).json({ success: true, message: `User role changed to ${role}` });
  } catch (error) {
    console.error('Update Role Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

/**
 * PUT /api/admin/users/:uid/plan
 * Assign a plan to a user
 */
router.put('/users/:uid/plan', async (req, res) => {
  try {
    const { uid } = req.params;
    const { planId, planName, type, expiryDate } = req.body;

    if (!planId || !planName || !type) {
      return res.status(400).json({ success: false, message: 'planId, planName, and type are required' });
    }

    let calculatedExpiry = null;
    const now = new Date();

    if (expiryDate) {
      // Allow overriding the expiry date for any plan
      // Set to 23:59:59.999 to ensure they get the full final day of access
      const d = new Date(expiryDate);
      d.setUTCHours(23, 59, 59, 999);
      calculatedExpiry = d.toISOString();
    } else {
      if (req.body.durationMonths) {
        now.setMonth(now.getMonth() + parseInt(req.body.durationMonths, 10));
        calculatedExpiry = now.toISOString();
      } else if (type === 'monthly') {
        now.setMonth(now.getMonth() + 1);
        calculatedExpiry = now.toISOString();
      } else if (type === 'yearly') {
        now.setFullYear(now.getFullYear() + 1);
        calculatedExpiry = now.toISOString();
      } else if (type === 'custom') {
        return res.status(400).json({ success: false, message: 'expiryDate is required for custom plans' });
      }
      // lifetime remains null
    }

    const updateData = {
      planId,
      planName,
      planType: type,
      planExpiryDate: calculatedExpiry,
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).update(updateData);
    await logAdminAction(req.user.uid, 'USER_PLAN_ASSIGNED', uid, { planId, planName, expiryDate: calculatedExpiry });

    return res.status(200).json({ success: true, message: 'Plan assigned successfully', data: updateData });
  } catch (error) {
    console.error('Assign Plan Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign plan' });
  }
});

module.exports = router;
