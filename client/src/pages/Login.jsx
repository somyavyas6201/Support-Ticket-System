import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy, Mail, Lock } from 'lucide-react';
import Toast from '../components/Toast';

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('john@acme.com');
  const [password, setPassword] = useState('customer123');
  
  // Validation States
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  
  const navigate = useNavigate();

  // If already authenticated, redirect away from login
  if (user) {
    return <Navigate to={user.role === 'customer' ? '/portal' : '/agent'} replace />;
  }

  // Pre-fill helper for developer sandbox
  const handleQuickFill = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setEmailError('');
    setPasswordError('');
  };

  // Client-side validations
  const validateForm = () => {
    let isValid = true;
    
    // Email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password length check
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      setToastType('success');
      setToastMessage('Signed in successfully!');
      
      // Let the toast show brief success before redirecting
      setTimeout(() => {
        if (loggedUser.role === 'customer') {
          navigate('/portal');
        } else {
          navigate('/agent');
        }
      }, 800);
    } catch (err) {
      setToastType('error');
      setToastMessage(err.message || 'Invalid email or password credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', padding: '2rem 1rem' }}>
      
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', marginBottom: '1rem' }}>
            <LifeBuoy size={32} />
          </div>
          <h1>Sign In to HelpDesk</h1>
          <p style={{ margin: 0 }}>Access your customer tickets or agent queue</p>
        </div>

        {/* Sandbox Quick-Login Helpers */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            ⚡ Developer Sandbox Quick Login
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => handleQuickFill('john@acme.com', 'customer123')} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              🧑 John (Customer)
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('sarah@helpdesk.com', 'agent123')} 
              className="btn btn-primary" 
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              👩 Sarah (Agent)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email input */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="email"
                type="email" 
                className="form-input" 
                style={{ 
                  paddingLeft: '2.5rem',
                  borderColor: emailError ? 'var(--priority-critical)' : ''
                }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                required 
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            {emailError && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                {emailError}
              </span>
            )}
          </div>

          {/* Password input */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="password"
                type="password" 
                className="form-input" 
                style={{ 
                  paddingLeft: '2.5rem',
                  borderColor: passwordError ? 'var(--priority-critical)' : ''
                }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                required 
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            {passwordError && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                {passwordError}
              </span>
            )}
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}
          >
            {submitting ? (
              <>
                <div className="spinner" style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#ffffff' }}></div>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: 0, color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>

      {/* Global Alert Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage('')} 
        />
      )}
    </div>
  );
}
