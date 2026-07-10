import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  CreditCard,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  Shield,
  LifeBuoy,
  Printer,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { className: 'badge-pending', icon: Clock, label: 'Pending' },
  paid: { className: 'badge-paid', icon: CheckCircle2, label: 'Paid' },
  overdue: { className: 'badge-overdue', icon: AlertTriangle, label: 'Overdue' }
};

const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise'
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatCurrency(amount) {
  return `$${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Inline printable invoice detail
 */
function InvoiceDetail({ invoice, onClose }) {
  const handlePrint = () => window.print();

  return (
    <tr>
      <td colSpan="5" style={{ padding: 0 }}>
        <div className="invoice-print" style={{ background: 'var(--bg-color)', borderTop: '2px solid var(--primary-color)' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className="action-btn" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
            <button className="action-btn" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>

          <div className="invoice-print__header">
            <div>
              <div className="invoice-print__logo">
                <LifeBuoy size={24} /> HelpDesk Pro
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Enterprise Support Solutions
              </p>
            </div>
            <div className="invoice-print__meta">
              <div className="invoice-print__number">{invoice.invoiceNumber}</div>
              <div>Issued: {formatDate(invoice.createdAt)}</div>
              <div>Due: {formatDate(invoice.dueDate)}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <span className={`badge ${STATUS_CONFIG[invoice.status]?.className}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Period */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Billing Period: {formatDate(invoice.billingPeriodStart)} — {formatDate(invoice.billingPeriodEnd)}
          </div>

          {/* Line Items */}
          <table className="invoice-table" style={{ marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lineItems || []).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity || 1}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice || item.amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '1rem 0',
            borderTop: '2px solid var(--border-color)'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Due</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatCurrency(invoice.amountDue)}
              </div>
            </div>
          </div>

          {invoice.paidAt && (
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--priority-low)', marginTop: '0.5rem' }}>
              ✓ Paid on {formatDate(invoice.paidAt)}
              {invoice.mockPayment && ' (Sandbox)'}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CustomerBilling() {
  const { user } = useAuth();
  const [planData, setPlanData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [planRes, invRes] = await Promise.all([
          api.get('/api/billing/my-plan'),
          api.get('/api/billing/my-invoices')
        ]);
        setPlanData(planRes.data);
        setInvoices(invRes.data.invoices || []);
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  const plan = planData?.plan || 'free';

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CreditCard size={28} style={{ color: 'var(--primary-color)' }} />
        My Billing
      </h1>
      <p style={{ fontSize: '1rem', marginBottom: '2rem', maxWidth: '600px' }}>
        View your current support plan and invoice history.
      </p>

      {/* Current Plan Card */}
      <div className="current-plan-card">
        <div className="current-plan-card__label">Current Plan</div>
        <div className="current-plan-card__name">
          {PLAN_LABELS[plan] || plan} {plan !== 'free' ? '✦' : ''}
        </div>
        <div className="current-plan-card__meta">
          {planData?.planActivatedAt && (
            <span>
              <Calendar size={14} />
              Active since {formatDate(planData.planActivatedAt)}
            </span>
          )}
          {planData?.company && (
            <span>
              <Building2 size={14} />
              {planData.company}
            </span>
          )}
          <span>
            <Shield size={14} />
            {plan === 'free' ? 'Community support' : plan === 'starter' ? '24h SLA' : plan === 'professional' ? '4h SLA' : '1h Critical SLA'}
          </span>
        </div>
      </div>

      {/* Invoice History */}
      <div className="billing-section">
        <h2 className="billing-section__title">
          <FileText size={20} style={{ color: 'var(--primary-color)' }} />
          Invoice History
        </h2>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {invoices.length === 0 ? (
            <div className="billing-empty">
              <FileText size={48} />
              <p style={{ margin: 0 }}>No invoices yet. Your billing history will appear here.</p>
            </div>
          ) : (
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Period</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const isExpanded = expandedId === inv._id;

                  return (
                    <React.Fragment key={inv._id}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedId(isExpanded ? null : inv._id)}
                      >
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {inv.invoiceNumber || '—'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.amountDue)}</td>
                        <td>{formatDate(inv.dueDate)}</td>
                        <td>
                          <span className={`badge ${statusCfg.className}`}>
                            <StatusIcon size={12} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {formatDate(inv.billingPeriodStart)} — {formatDate(inv.billingPeriodEnd)}
                        </td>
                      </tr>
                      {isExpanded && <InvoiceDetail invoice={inv} onClose={() => setExpandedId(null)} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
