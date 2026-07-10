import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import { stripe, isMockMode } from '../lib/stripe.js';
import { runMonthlyBillingCycle } from '../jobs/monthlyBilling.js';

/**
 * Plan definitions used by the checkout flow.
 */
const PLANS = {
  starter: {
    name: 'Starter',
    price: 2900,       // cents
    displayPrice: 29,  // dollars
    description: 'Perfect for small teams — 5 agent seats, email support, basic SLA'
  },
  professional: {
    name: 'Professional',
    price: 9900,
    displayPrice: 99,
    description: 'Growing teams — 25 agent seats, priority support, advanced SLA, analytics'
  },
  enterprise: {
    name: 'Enterprise',
    price: 19900,
    displayPrice: 199,
    description: 'Unlimited scale — usage-based billing, dedicated CSM, custom SLA, API access'
  }
};

// ─── Helper: generate a simple mock session ID ───
function mockSessionId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'mock_cs_';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * POST /api/billing/create-checkout-session
 * Body: { planKey: 'starter' | 'professional' | 'enterprise' }
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { planKey } = req.body;

    if (!planKey || !PLANS[planKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Choose one of: ${Object.keys(PLANS).join(', ')}`
      });
    }

    const plan = PLANS[planKey];

    // ─── MOCK MODE ───
    if (isMockMode || !stripe) {
      return res.json({
        success: true,
        isMock: true,
        mockSessionId: mockSessionId(),
        planKey,
        planName: plan.name,
        amount: plan.displayPrice,
        description: plan.description
      });
    }

    // ─── REAL STRIPE ───
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `HelpDesk Pro — ${plan.name} Plan`,
            description: plan.description
          },
          unit_amount: plan.price,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/agent/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/agent/billing?cancelled=true`,
      metadata: {
        userId: req.user._id.toString(),
        planKey
      }
    });

    return res.json({
      success: true,
      isMock: false,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
};

/**
 * POST /api/billing/verify-mock
 * Body: { mockSessionId, planKey }
 *
 * Simulates a successful payment in sandbox mode.
 */
export const verifyMockPayment = async (req, res) => {
  try {
    const { mockSessionId: sessionId, planKey } = req.body;

    if (!sessionId || !planKey || !PLANS[planKey]) {
      return res.status(400).json({ success: false, message: 'Missing mockSessionId or invalid planKey' });
    }

    const plan = PLANS[planKey];

    // Activate the plan on the user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        plan: planKey,
        planActivatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    // Create a checkout invoice record
    const now = new Date();
    const invoice = await Invoice.create({
      client: req.user._id,
      type: 'checkout',
      planName: plan.name,
      billingPeriodStart: now,
      billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      amountDue: plan.displayPrice,
      status: 'paid',
      paidAt: now,
      mockPayment: true,
      stripeSessionId: sessionId,
      lineItems: [{
        description: `${plan.name} Plan — Monthly Subscription`,
        quantity: 1,
        unitPrice: plan.displayPrice,
        amount: plan.displayPrice
      }]
    });

    return res.json({
      success: true,
      message: `✅ ${plan.name} plan activated (sandbox mode)`,
      user,
      invoice
    });
  } catch (error) {
    console.error('Mock verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify mock payment' });
  }
};

/**
 * POST /api/billing/run-cycle
 * Admin-only: triggers the monthly billing cycle for demo purposes.
 * Body (optional): { periodStart, periodEnd }
 */
export const runBillingCycle = async (req, res) => {
  try {
    const options = {};
    if (req.body.periodStart) options.periodStart = new Date(req.body.periodStart);
    if (req.body.periodEnd) options.periodEnd = new Date(req.body.periodEnd);

    const result = await runMonthlyBillingCycle(options);

    return res.json({
      success: true,
      message: `Billing cycle complete — ${result.generated} invoice(s) generated`,
      ...result
    });
  } catch (error) {
    console.error('Billing cycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run billing cycle' });
  }
};

/**
 * GET /api/billing/invoices
 * Admin: list all invoices with optional status filter.
 * Query: ?status=pending|paid|overdue  &page=1  &limit=20
 */
export const listInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      filter.status = status;
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('client', 'name email company plan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.json({
      success: true,
      invoices,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List invoices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list invoices' });
  }
};

/**
 * GET /api/billing/invoices/:id
 * Admin or invoice owner: get a single invoice with full detail.
 */
export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email company plan')
      .lean();

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Allow admin or the invoice owner
    const isOwner = invoice.client._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this invoice' });
    }

    return res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get invoice' });
  }
};

/**
 * PUT /api/billing/invoices/:id/mark-paid
 * Admin: marks an invoice as paid.
 */
export const markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Invoice is already marked as paid' });
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save();

    return res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} marked as paid`,
      invoice
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark invoice as paid' });
  }
};

/**
 * PUT /api/billing/invoices/:id/resend
 * Admin: flags the invoice as re-sent.
 */
export const resendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.resentAt = new Date();
    await invoice.save();

    return res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} marked for re-send`,
      invoice
    });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend invoice' });
  }
};

/**
 * GET /api/billing/my-invoices
 * Customer: lists the authenticated user's own invoices.
 */
export const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ client: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, invoices });
  } catch (error) {
    console.error('My invoices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your invoices' });
  }
};

/**
 * GET /api/billing/my-plan
 * Customer: returns the authenticated user's current plan info.
 */
export const getMyPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email plan planActivatedAt company').lean();
    return res.json({
      success: true,
      plan: user.plan || 'free',
      planActivatedAt: user.planActivatedAt,
      company: user.company,
      availablePlans: PLANS
    });
  } catch (error) {
    console.error('My plan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch plan info' });
  }
};
