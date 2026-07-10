import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Shield,
  Users,
  BarChart3,
  Headphones,
  Globe,
  FlaskConical,
  X,
  Loader2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

const PLAN_FEATURES = {
  starter: [
    { icon: Users, text: '5 Agent Seats' },
    { icon: Headphones, text: 'Email Support' },
    { icon: Shield, text: 'Basic SLA (24h Response)' },
    { icon: BarChart3, text: 'Standard Analytics' }
  ],
  professional: [
    { icon: Users, text: '25 Agent Seats' },
    { icon: Headphones, text: 'Priority Support' },
    { icon: Shield, text: 'Advanced SLA (4h Response)' },
    { icon: BarChart3, text: 'Advanced Analytics & Reports' },
    { icon: Globe, text: 'Multi-channel Support' }
  ],
  enterprise: [
    { icon: Users, text: 'Unlimited Agent Seats' },
    { icon: Headphones, text: 'Dedicated CSM' },
    { icon: Shield, text: 'Custom SLA (1h Critical)' },
    { icon: BarChart3, text: 'Enterprise Analytics & API' },
    { icon: Globe, text: 'SSO & Custom Integrations' },
    { icon: Zap, text: 'Usage-based Pricing' }
  ]
};

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 29,
    period: '/mo',
    description: 'Perfect for small teams getting started with structured support.',
    featured: false
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 99,
    period: '/mo',
    description: 'For growing teams that need priority support and deeper insights.',
    featured: true
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: '/mo base',
    description: 'Unlimited scale with usage-based billing and dedicated success management.',
    featured: false
  }
];

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null); // planKey being loaded
  const [modal, setModal] = useState(null);      // sandbox simulator state
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [cycleLoading, setCycleLoading] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChoosePlan = async (planKey) => {
    setLoading(planKey);
    try {
      const res = await api.post('/api/billing/create-checkout-session', { planKey });
      const data = res.data;

      if (data.isMock) {
        // Open sandbox simulator modal
        setModal({
          planKey: data.planKey,
          planName: data.planName,
          amount: data.amount,
          mockSessionId: data.mockSessionId,
          description: data.description
        });
      } else if (data.url) {
        // Redirect to real Stripe checkout
        window.location.href = data.url;
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to start checkout' });
    } finally {
      setLoading(null);
    }
  };

  const handleSimulatePayment = async () => {
    if (!modal) return;
    setVerifying(true);
    try {
      const res = await api.post('/api/billing/verify-mock', {
        mockSessionId: modal.mockSessionId,
        planKey: modal.planKey
      });
      setSuccess(true);
      setToast({ type: 'success', message: res.data.message });
      setTimeout(() => {
        setModal(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const handleRunCycle = async () => {
    setCycleLoading(true);
    try {
      const res = await api.post('/api/billing/run-cycle');
      setToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Billing cycle failed' });
    } finally {
      setCycleLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={28} style={{ color: 'var(--primary-color)' }} />
          Billing & Plan Management
        </h1>
        <p style={{ fontSize: '1rem', maxWidth: '600px' }}>
          Choose a support plan for your organisation or manage enterprise usage-based invoicing.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="billing-section">
        <h2 className="billing-section__title">
          <Zap size={20} style={{ color: 'var(--secondary-color)' }} />
          Support Plans
        </h2>

        <div className="billing-plans">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`plan-card ${plan.featured ? 'plan-card--featured' : ''}`}
            >
              {plan.featured && <span className="plan-card__badge">Most Popular</span>}
              <div className="plan-card__name">{plan.name}</div>
              <div className="plan-card__price">
                ${plan.price}<span>{plan.period}</span>
              </div>
              <p className="plan-card__desc">{plan.description}</p>

              <ul className="plan-card__features">
                {PLAN_FEATURES[plan.key].map((feat, idx) => (
                  <li key={idx}>
                    <feat.icon size={16} />
                    {feat.text}
                  </li>
                ))}
              </ul>

              <button
                className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%' }}
                onClick={() => handleChoosePlan(plan.key)}
                disabled={loading === plan.key}
              >
                {loading === plan.key ? (
                  <>
                    <Loader2 size={16} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto' }} />
                    Processing…
                  </>
                ) : (
                  <>
                    Choose {plan.name}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Admin: Run Billing Cycle */}
      {user?.role === 'admin' && (
        <div className="billing-section">
          <div className="card" style={{ borderLeft: '4px solid var(--secondary-color)', maxWidth: '600px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <RefreshCw size={18} style={{ color: 'var(--secondary-color)' }} />
              Enterprise Billing Cycle
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Manually trigger the monthly billing cycle to generate invoices for all enterprise clients based on their ticket volume and agent seat usage.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleRunCycle}
              disabled={cycleLoading}
            >
              {cycleLoading ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto' }} />
                  Running Cycle…
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Run Billing Cycle Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sandbox Simulator Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => !verifying && setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!success ? (
              <>
                <div className="modal-card__header">
                  <div className="modal-card__icon modal-card__icon--sandbox">
                    <FlaskConical size={28} />
                  </div>
                  <div className="modal-card__title">Sandbox Payment Simulator</div>
                  <div className="modal-card__subtitle">
                    Stripe is in mock mode — simulate a payment below
                  </div>
                </div>

                <div className="modal-card__body">
                  <div className="modal-card__row">
                    <span className="modal-card__label">Plan</span>
                    <span className="modal-card__value">{modal.planName}</span>
                  </div>
                  <div className="modal-card__row">
                    <span className="modal-card__label">Amount</span>
                    <span className="modal-card__value modal-card__value--large">
                      ${modal.amount}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
                    </span>
                  </div>
                  <div className="modal-card__row">
                    <span className="modal-card__label">Session ID</span>
                    <span className="modal-card__value" style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {modal.mockSessionId}
                    </span>
                  </div>
                </div>

                <div className="modal-card__actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setModal(null)}
                    disabled={verifying}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSimulatePayment}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <Loader2 size={16} className="spinner" style={{ border: 'none', width: 'auto', height: 'auto' }} />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Simulate Successful Payment
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-card__header" style={{ marginBottom: 0 }}>
                <div className="modal-card__icon modal-card__icon--success">
                  <CheckCircle2 size={28} />
                </div>
                <div className="modal-card__title">Payment Simulated!</div>
                <div className="modal-card__subtitle">
                  Your <strong>{modal.planName}</strong> plan is now active.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
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
