import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getSummaryStats,
  getTicketVolume,
  getByCategory,
  getByPriority,
  getByStatus,
  getAgentPerformance
} from '../controllers/analyticsController.js';

const router = express.Router();

// All analytics endpoints require authentication + agent/admin role
router.use(protect, authorize('agent', 'admin'));

// @route   GET /api/analytics/summary
router.get('/summary', getSummaryStats);

// @route   GET /api/analytics/volume
router.get('/volume', getTicketVolume);

// @route   GET /api/analytics/by-category
router.get('/by-category', getByCategory);

// @route   GET /api/analytics/by-priority
router.get('/by-priority', getByPriority);

// @route   GET /api/analytics/by-status
router.get('/by-status', getByStatus);

// @route   GET /api/analytics/agent-performance
router.get('/agent-performance', getAgentPerformance);

export default router;
