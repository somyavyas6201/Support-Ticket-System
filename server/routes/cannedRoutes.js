import express from 'express';
import CannedResponse from '../models/CannedResponse.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all canned responses
// @route   GET /api/canned
// @access  Private (Agents/Admins only)
router.get('/', protect, async (req, res) => {
  try {
    const canned = await CannedResponse.find({})
      .populate('createdBy', 'name');
    res.status(200).json({
      success: true,
      canned
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
