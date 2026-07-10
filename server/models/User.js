import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['customer', 'agent', 'admin'],
    default: 'customer',
    index: true
  },
  company: {
    type: String,
    trim: true
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free'
  },
  planActivatedAt: {
    type: Date
  },
  stripeCustomerId: {
    type: String
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
