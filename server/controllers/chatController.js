import ChatMessage from '../models/ChatMessage.js';
import Ticket from '../models/Ticket.js';

// @desc    Get live chat messages for a ticket
// @route   GET /api/tickets/:id/chats
// @access  Private
export const getChatMessages = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const messages = await ChatMessage.find({ ticket: ticketId })
      .populate('sender', 'name role avatarUrl')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a live chat message
// @route   POST /api/tickets/:id/chats
// @access  Private
export const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const chatMsg = await ChatMessage.create({
      ticket: ticketId,
      sender: req.user._id,
      message
    });

    const populatedMsg = await chatMsg.populate('sender', 'name role avatarUrl');

    // Broadcast message via Socket.IO global reference
    if (global.io) {
      global.io.to(`ticket_${ticketId}`).emit('new_chat_message', populatedMsg);
    }

    res.status(201).json({
      success: true,
      message: populatedMsg
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
