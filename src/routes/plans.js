const express = require('express');
const { db } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Require admin privileges for all plan routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Helper to log admin actions
 */
async function logAdminAction(adminUid, action, metadata = {}) {
  try {
    await db.collection('admin_logs').add({
      adminUid,
      action,
      timestamp: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
}

/**
 * GET /api/admin/plans
 * List all available plans
 */
router.get('/', async (req, res) => {
  try {
    const plansSnapshot = await db.collection('plans').orderBy('createdAt', 'desc').get();
    const plans = [];
    plansSnapshot.forEach(doc => {
      plans.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: plans });
  } catch (error) {
    console.error('Fetch Plans Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/admin/plans
 * Create a new plan
 */
router.post('/', async (req, res) => {
  try {
    const { name, durationMonths } = req.body;

    if (!name || durationMonths === undefined) {
      return res.status(400).json({ success: false, message: 'Plan name and duration are required' });
    }

    const duration = parseInt(durationMonths, 10);
    if (isNaN(duration) || duration < 1) {
      return res.status(400).json({ success: false, message: 'Duration must be a valid number of months (1 or more)' });
    }

    const planData = {
      name,
      type: 'duration', // Set a default type for backward compatibility with frontend checks
      durationMonths: duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('plans').add(planData);
    await logAdminAction(req.user.uid, 'PLAN_CREATED', { planId: docRef.id, name, durationMonths: duration });

    return res.status(201).json({ success: true, data: { id: docRef.id, ...planData } });
  } catch (error) {
    console.error('Create Plan Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create plan' });
  }
});

/**
 * DELETE /api/admin/plans/:id
 * Delete a plan
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('plans').doc(id).delete();
    await logAdminAction(req.user.uid, 'PLAN_DELETED', { planId: id });
    return res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete Plan Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete plan' });
  }
});

module.exports = router;
