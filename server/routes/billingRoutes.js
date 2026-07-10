import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createCheckoutSession,
  verifyMockPayment,
  runBillingCycle,
  listInvoices,
  getInvoice,
  markInvoicePaid,
  resendInvoice,
  getMyInvoices,
  getMyPlan
} from '../controllers/billingController.js';

const router = express.Router();

// All billing routes require authentication
router.use(protect);

// ─── Checkout & Mock ───
router.post('/create-checkout-session', createCheckoutSession);
router.post('/verify-mock', verifyMockPayment);

// ─── Customer self-service ───
router.get('/my-invoices', getMyInvoices);
router.get('/my-plan', getMyPlan);

// ─── Admin-only ───
router.post('/run-cycle', authorize('admin'), runBillingCycle);
router.get('/invoices', authorize('admin'), listInvoices);
router.get('/invoices/:id', getInvoice);  // admin or owner checked in controller
router.put('/invoices/:id/mark-paid', authorize('admin'), markInvoicePaid);
router.put('/invoices/:id/resend', authorize('admin'), resendInvoice);

export default router;
