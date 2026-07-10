import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

/**
 * Monthly billing job for enterprise clients.
 *
 * Pricing (configurable):
 *   - $5 per ticket created in the billing period
 *   - $49 per unique agent seat used
 *   - $199 base platform fee
 */

const PRICING = {
  ticketRate: 5,         // dollars per ticket
  agentSeatRate: 49,     // dollars per agent seat
  basePlatformFee: 199,  // monthly base fee
};

/**
 * Run the monthly billing cycle.
 *
 * @param {Object} options
 * @param {Date}   options.periodStart - Start of the billing period
 * @param {Date}   options.periodEnd   - End of the billing period
 * @returns {Object} summary of generated invoices
 */
export async function runMonthlyBillingCycle(options = {}) {
  const now = new Date();

  // Default: previous calendar month
  const periodEnd = options.periodEnd || new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = options.periodStart || new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);

  console.log(`📊 Running billing cycle: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);

  // 1. Find all enterprise users
  const enterpriseUsers = await User.find({ plan: 'enterprise' }).lean();

  if (enterpriseUsers.length === 0) {
    console.log('ℹ️  No enterprise users found — skipping billing cycle');
    return { generated: 0, invoices: [] };
  }

  const generatedInvoices = [];

  for (const client of enterpriseUsers) {
    // 2. Count tickets created by this client in the billing period
    const ticketCount = await Ticket.countDocuments({
      customer: client._id,
      createdAt: { $gte: periodStart, $lt: periodEnd }
    });

    // 3. Count unique agent seats (distinct assigned agents for this client's tickets)
    const agentSeats = await Ticket.distinct('assignedAgent', {
      customer: client._id,
      assignedAgent: { $ne: null },
      createdAt: { $gte: periodStart, $lt: periodEnd }
    });

    const seatCount = agentSeats.length;

    // 4. Build line items
    const lineItems = [
      {
        description: 'Enterprise Platform Base Fee',
        quantity: 1,
        unitPrice: PRICING.basePlatformFee,
        amount: PRICING.basePlatformFee
      }
    ];

    if (ticketCount > 0) {
      lineItems.push({
        description: `Support Tickets (${ticketCount} × $${PRICING.ticketRate})`,
        quantity: ticketCount,
        unitPrice: PRICING.ticketRate,
        amount: ticketCount * PRICING.ticketRate
      });
    }

    if (seatCount > 0) {
      lineItems.push({
        description: `Agent Seats (${seatCount} × $${PRICING.agentSeatRate})`,
        quantity: seatCount,
        unitPrice: PRICING.agentSeatRate,
        amount: seatCount * PRICING.agentSeatRate
      });
    }

    const amountDue = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // 5. Create Invoice
    const invoice = await Invoice.create({
      client: client._id,
      type: 'usage',
      planName: 'Enterprise',
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      ticketCount,
      agentSeats: seatCount,
      amountDue,
      lineItems,
      status: 'pending'
    });

    generatedInvoices.push(invoice);
    console.log(`  ✅ Invoice ${invoice.invoiceNumber} → ${client.name} (${client.email}): $${amountDue}`);
  }

  console.log(`📊 Billing cycle complete — ${generatedInvoices.length} invoice(s) generated`);

  return {
    generated: generatedInvoices.length,
    periodStart,
    periodEnd,
    invoices: generatedInvoices
  };
}
