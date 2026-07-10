import Ticket from '../models/Ticket.js';
import SLARecord from '../models/SLARecord.js';
import TicketResponse from '../models/TicketResponse.js';

// SLA priority limits map in hours
const SLA_LIMITS = {
  critical: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 12 },
  medium: { response: 8, resolution: 24 },
  low: { response: 24, resolution: 72 }
};

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private (Customer only)
export const createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority, customFields, channel } = req.body;

    if (!subject || !description || !category) {
      return res.status(400).json({ success: false, message: 'Please provide subject, description and category' });
    }

    const ticketPriority = priority || 'medium';
    const slaLimits = SLA_LIMITS[ticketPriority] || SLA_LIMITS.medium;

    const now = new Date();
    const responseDeadline = new Date(now.getTime() + slaLimits.response * 60 * 60 * 1000);
    const resolutionDeadline = new Date(now.getTime() + slaLimits.resolution * 60 * 60 * 1000);

    // Create the Ticket
    const ticket = await Ticket.create({
      subject,
      description,
      category,
      priority: ticketPriority,
      customer: req.user._id,
      customFields: customFields || {},
      slaDeadline: responseDeadline, // target initial response SLA
      channel: channel || 'web',
      status: 'open'
    });

    // Create the corresponding SLARecord
    await SLARecord.create({
      ticket: ticket._id,
      priority: ticketPriority,
      responseDeadline,
      resolutionDeadline,
      breached: false
    });

    if (global.io) {
      global.io.to('agents').emit('new_ticket', ticket);
    }

    res.status(201).json({
      success: true,
      ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tickets list (filtered by status / roles)
// @route   GET /api/tickets
// @access  Private
export const getTickets = async (req, res) => {
  try {
    const filter = {};

    // Enforce role-based isolation: customers only see their own tickets
    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    }

    // Apply status filter if present
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Sort by SLA deadline (critical deadlines first)
    const tickets = await Ticket.find(filter)
      .populate('customer', 'name email company')
      .populate('assignedAgent', 'name email avatarUrl')
      .sort({ slaDeadline: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'name email company')
      .populate('assignedAgent', 'name email avatarUrl');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check ownership if user is customer
    if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ticket' });
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a message reply in ticket thread
// @route   POST /api/tickets/:id/responses
// @access  Private
export const createResponse = async (req, res) => {
  try {
    const { message, isInternalNote, attachments } = req.body;
    const ticketId = req.params.id;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Please provide a message reply' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check ownership if user is customer
    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to comment on this ticket' });
    }

    // Customers cannot post internal notes
    const isInternal = req.user.role === 'customer' ? false : (isInternalNote || false);

    const response = await TicketResponse.create({
      ticket: ticketId,
      author: req.user._id,
      message,
      isInternalNote: isInternal,
      attachments: attachments || []
    });

    // If client is customer, reset status to in_progress or waiting on agent (if previously resolved/closed, reopen it)
    if (req.user.role === 'customer') {
      if (['resolved', 'closed'].includes(ticket.status)) {
        ticket.status = 'open'; // Reopen ticket
      }
    } else {
      // If agent is replying, set status to waiting_on_customer if it was open or in_progress
      if (['open', 'in_progress'].includes(ticket.status) && !isInternal) {
        ticket.status = 'waiting_on_customer';
      }
    }

    await ticket.save();

    // Populate response author details for immediate front consumption
    const populatedResponse = await response.populate('author', 'name role avatarUrl');

    if (global.io) {
      global.io.to(`ticket_${ticketId}`).emit('new_message', populatedResponse);
      
      const populatedTicket = await Ticket.findById(ticketId)
        .populate('customer', 'name email company')
        .populate('assignedAgent', 'name email avatarUrl');
      
      global.io.to('agents').emit('ticket_updated', populatedTicket);
      global.io.to(`ticket_${ticketId}`).emit('ticket_updated', populatedTicket);
    }

    res.status(201).json({
      success: true,
      response: populatedResponse
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get responses/messages list for a ticket
// @route   GET /api/tickets/:id/responses
// @access  Private
export const getResponses = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check authorization for customer
    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this thread' });
    }

    const filter = { ticket: ticketId };

    // Hide internal staff notes from customers
    if (req.user.role === 'customer') {
      filter.isInternalNote = false;
    }

    const responses = await TicketResponse.find(filter)
      .populate('author', 'name role avatarUrl')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: responses.length,
      responses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit CSAT rating for a resolved ticket
// @route   POST /api/tickets/:id/csat
// @access  Private (Customer only)
export const submitCSAT = async (req, res) => {
  try {
    const { csatRating, csatComment } = req.body;
    const ticketId = req.params.id;

    if (!csatRating) {
      return res.status(400).json({ success: false, message: 'Please provide a star rating (1-5)' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Verify ownership
    if (ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to rate this ticket' });
    }

    ticket.csatRating = Number(csatRating);
    ticket.csatComment = csatComment || '';
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your rating!',
      ticket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update ticket details
// @route   PUT /api/tickets/:id
// @access  Private (Agents/Admins only)
export const updateTicket = async (req, res) => {
  try {
    const { status, priority, assignedAgent, customFields } = req.body;
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role-based validation: closed tickets cannot be reopened by standard agents
    if (ticket.status === 'closed' && status && status !== 'closed' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can reopen closed tickets' });
    }

    // Update Status
    if (status) {
      ticket.status = status;
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
      } else if (status !== 'resolved') {
        ticket.resolvedAt = null;
      }
    }

    // Update Priority and SLA deadlines
    if (priority) {
      ticket.priority = priority;
      
      if (!['resolved', 'closed'].includes(ticket.status)) {
        const sla = await SLARecord.findOne({ ticket: ticket._id });
        if (sla) {
          const limits = SLA_LIMITS[priority] || SLA_LIMITS.medium;
          const now = ticket.createdAt || new Date();
          const responseDeadline = new Date(now.getTime() + limits.response * 60 * 60 * 1000);
          const resolutionDeadline = new Date(now.getTime() + limits.resolution * 60 * 60 * 1000);
          
          sla.priority = priority;
          sla.responseDeadline = responseDeadline;
          sla.resolutionDeadline = resolutionDeadline;
          await sla.save();

          ticket.slaDeadline = responseDeadline;
        }
      }
    }

    // Update Assignment
    if (assignedAgent !== undefined) {
      ticket.assignedAgent = assignedAgent === '' || assignedAgent === null ? null : assignedAgent;
    }

    // Update Custom Fields
    if (customFields) {
      ticket.customFields = { ...ticket.customFields, ...customFields };
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('customer', 'name email company')
      .populate('assignedAgent', 'name email avatarUrl');

    if (global.io) {
      global.io.to('agents').emit('ticket_updated', updatedTicket);
      global.io.to(`ticket_${ticketId}`).emit('ticket_updated', updatedTicket);
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

