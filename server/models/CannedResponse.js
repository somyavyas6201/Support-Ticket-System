import mongoose from 'mongoose';

const cannedResponseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Canned response title is required'],
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Canned response body is required']
  },
  category: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ref is required']
  }
}, {
  timestamps: true
});

const CannedResponse = mongoose.model('CannedResponse', cannedResponseSchema);
export default CannedResponse;
