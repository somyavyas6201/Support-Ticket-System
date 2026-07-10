import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Filter,
  Loader2,
  X,
  LifeBuoy,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { className: 'badge-pending', icon: Clock, label: 'Pending' },
  paid: { className: 'badge-paid', icon: CheckCircle2, label: 'Paid' },
  overdue: { className: 'badge-overdue', icon: AlertTriangle, label: 'Overdue' }
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
 * Printable invoice detail panel shown inline when expanding a row.
 */
function InvoiceDetail({ invoice, onClose }) {
  const handlePrint = () => window.print();

  return (
    <tr>
      <td colSpan="7" style={{ padding: 0 }}>
        <div className="invoice-print" style={{ background: 'var(--bg-color)', borderTop: '2px solid var(--primary-color)' }}>
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className="action-btn" onClick={handlePrint}>
              <Printer size={14} /> Print Invoice
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
                Enterprise Support Solutions<br />
                billing@helpdesk-pro.com
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

          {/* Bill To */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Bill To
            </div>
            <div style={{ fontWeight: 600 }}>{invoice.client?.name || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{invoice.client?.email}</div>
            {invoice.client?.company && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{invoice.client.company}</div>
            )}
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

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/api/billing/invoices', { params });
      setInvoices(res.data.invoices || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to load invoices' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleMarkPaid = async (invoiceId) => {
    setActionLoading(invoiceId + '-paid');
    try {
      const res = await api.put(`/api/billing/invoices/${invoiceId}/mark-paid`);
      setToast({ type: 'success', message: res.data.message });
      fetchInvoices();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResend = async (invoiceId) => {
    setActionLoading(invoiceId + '-resend');
    try {
      const res = await api.put(`/api/billing/invoices/${invoiceId}/resend`);
      setToast({ type: 'success', message: res.data.message });
      fetchInvoices();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      <div className="billing-section__header">
        <h1 className="billing-section__title" style={{ fontSize: '1.5rem' }}>
          <FileText size={24} style={{ color: 'var(--primary-color)' }} />
          Invoice Management
        </h1>

        <div className="billing-filter-group">
          {['all', 'pending', 'paid', 'overdue'].map((f) => (
            <button
              key={f}
              className={`billing-filter-btn ${statusFilter === f ? 'billing-filter-btn--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="billing-empty">
            <FileText size={48} />
            <p style={{ margin: 0 }}>No invoices found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
          </div>
        ) : (
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
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
                      <td>
                        <div>{inv.client?.name || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.client?.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-open" style={{ textTransform: 'capitalize' }}>
                          {inv.type || 'usage'}
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-btn-group">
                          {inv.status !== 'paid' && (
                            <button
                              className="action-btn action-btn--success"
                              onClick={() => handleMarkPaid(inv._id)}
                              disabled={actionLoading === inv._id + '-paid'}
                            >
                              {actionLoading === inv._id + '-paid' ? (
                                <Loader2 size={12} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto' }} />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Mark Paid
                            </button>
                          )}
                          <button
                            className="action-btn"
                            onClick={() => handleResend(inv._id)}
                            disabled={actionLoading === inv._id + '-resend'}
                          >
                            {actionLoading === inv._id + '-resend' ? (
                              <Loader2 size={12} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto' }} />
                            ) : (
                              <Send size={12} />
                            )}
                            Resend
                          </button>
                        </div>
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

      {/* Toast */}
      {toast && (
        <div className={`billing-toast billing-toast--${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} style={{ color: 'var(--priority-low)', flexShrink: 0 }} />
          ) : (
            <X size={20} style={{ color: 'var(--priority-critical)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.875rem' }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)', marginLeft: 'auto' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
