import express from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicketById, 
  createResponse, 
  getResponses, 
  submitCSAT,
  updateTicket
} from '../controllers/ticketController.js';
import { getChatMessages, sendChatMessage } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.route('/')
  .post(protect, createTicket)
  .get(protect, getTickets);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, updateTicket);

router.route('/:id/responses')
  .post(protect, createResponse)
  .get(protect, getResponses);

router.route('/:id/csat')
  .post(protect, submitCSAT);

router.route('/:id/chats')
  .get(protect, getChatMessages)
  .post(protect, sendChatMessage);

export default router;
