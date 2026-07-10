import mongoose from 'mongoose';

const ticketResponseSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket ref is required'],
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ref is required']
  },
  message: {
    type: String,
    required: [true, 'Message body is required']
  },
  isInternalNote: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: String
  }]
}, {
  timestamps: true
});

const TicketResponse = mongoose.model('TicketResponse', ticketResponseSchema);
export default TicketResponse;
