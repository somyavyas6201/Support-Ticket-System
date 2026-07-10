import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Billing', 'Technical', 'Account', 'Feature Request', 'Bug Report']
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ref is required'],
    index: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  slaDeadline: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  csatRating: {
    type: Number,
    min: 1,
    max: 5
  },
  csatComment: {
    type: String,
    trim: true
  },
  channel: {
    type: String,
    enum: ['web', 'email', 'chat'],
    default: 'web'
  }
}, {
  timestamps: true
});

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
