import mongoose from 'mongoose';

const slaRecordSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket ref is required'],
    unique: true,
    index: true
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['low', 'medium', 'high', 'critical']
  },
  responseDeadline: {
    type: Date,
    required: [true, 'Response deadline is required']
  },
  resolutionDeadline: {
    type: Date,
    required: [true, 'Resolution deadline is required']
  },
  breached: {
    type: Boolean,
    default: false,
    index: true
  },
  escalatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const SLARecord = mongoose.model('SLARecord', slaRecordSchema);
export default SLARecord;
