import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LifeBuoy, User as UserIcon, Mail, Lock, Building } from 'lucide-react';
import Toast from '../components/Toast';

export default function Register() {
  const { register, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');

  // Inline Validation Errors
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const navigate = useNavigate();

  // If already authenticated, redirect
  if (user) {
    return <Navigate to={user.role === 'customer' ? '/portal' : '/agent'} replace />;
  }

  // Client-side validations
  const validateForm = () => {
    const tempErrors = {};
    let isValid = true;

    if (!name.trim()) {
      tempErrors.name = 'Full name is required';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      tempErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      tempErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      tempErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await register(name, email, password, company);
      setToastType('success');
      setToastMessage('Account created successfully!');
      
      // Let the toast show brief success before redirecting
      setTimeout(() => {
        navigate('/portal');
      }, 800);
    } catch (err) {
      setToastType('error');
      setToastMessage(err.message || 'Registration failed. Try a different email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem 1rem' }}>
      
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-color)', marginBottom: '1rem' }}>
            <LifeBuoy size={32} />
          </div>
          <h1>Create Account</h1>
          <p style={{ margin: 0 }}>Register to submit and track support tickets</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="name"
                type="text" 
                className="form-input" 
                style={{ 
                  paddingLeft: '2.5rem',
                  borderColor: errors.name ? 'var(--priority-critical)' : ''
                }}
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                required 
              />
              <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            {errors.name && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                {errors.name}
              </span>
            )}
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="email"
                type="email" 
                className="form-input" 
                style={{ 
                  paddingLeft: '2.5rem',
                  borderColor: errors.email ? 'var(--priority-critical)' : ''
                }}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                required 
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            {errors.email && (
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                {errors.email}
              </span>
            )}
          </div>

          {/* Company Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="company">Company Name (Optional)</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="company"
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="grid grid-2">
            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="password"
                  type="password" 
                  className="form-input" 
                  style={{ 
                    paddingLeft: '2.5rem',
                    borderColor: errors.password ? 'var(--priority-critical)' : ''
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  required 
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {errors.password && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="confirmPassword"
                  type="password" 
                  className="form-input" 
                  style={{ 
                    paddingLeft: '2.5rem',
                    borderColor: errors.confirmPassword ? 'var(--priority-critical)' : ''
                  }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  required 
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              {errors.confirmPassword && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--priority-critical)', marginTop: '0.25rem' }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}
          >
            {submitting ? (
              <>
                <div className="spinner" style={{ width: '1rem', height: '1rem', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#ffffff' }}></div>
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '1.5rem', marginBottom: 0, color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
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
