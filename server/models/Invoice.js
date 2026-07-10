import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: true
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ref is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['usage', 'checkout'],
    default: 'usage'
  },
  planName: {
    type: String,
    trim: true
  },
  billingPeriodStart: {
    type: Date,
    required: [true, 'Billing period start date is required']
  },
  billingPeriodEnd: {
    type: Date,
    required: [true, 'Billing period end date is required']
  },
  dueDate: {
    type: Date
  },
  ticketCount: {
    type: Number,
    default: 0
  },
  agentSeats: {
    type: Number,
    default: 0
  },
  amountDue: {
    type: Number,
    required: [true, 'Amount due is required']
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
    index: true
  },
  paidAt: {
    type: Date
  },
  mockPayment: {
    type: Boolean,
    default: false
  },
  stripeInvoiceId: {
    type: String
  },
  stripeSessionId: {
    type: String
  },
  resentAt: {
    type: Date
  },
  lineItems: [lineItemSchema]
}, {
  timestamps: true
});

// Auto-generate invoiceNumber before save
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await mongoose.model('Invoice').countDocuments({
      createdAt: { $gte: todayStart }
    });
    this.invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  // Auto-set dueDate to 30 days from creation if not set
  if (!this.dueDate) {
    this.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
