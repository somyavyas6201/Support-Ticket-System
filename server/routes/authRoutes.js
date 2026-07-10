import express from 'express';
import { register, login, logout, getMe, getAgents } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/agents', protect, getAgents);

export default router;
