import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Show a clean visual loading state while checking token authentication
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  // Redirect to login if user is unauthenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Restrict access by roles if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect non-agent/admins away from /agent routes back to the customer /portal
    if (user.role === 'customer') {
      return <Navigate to="/portal" replace />;
    }
    // Redirect agents/admins away from customer portal back to agent workspace /agent
    return <Navigate to="/agent" replace />;
  }

  return children;
}
