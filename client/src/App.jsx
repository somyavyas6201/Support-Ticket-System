import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { 
  LifeBuoy, 
  Ticket, 
  User as UserIcon, 
  Shield, 
  PlusCircle, 
  LogOut, 
  LayoutDashboard, 
  FolderKey, 
  BarChart3, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send
} from 'lucide-react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// --- PLACEHOLDER COMPONENTS ---

// Home/Landing page (simple redirection to appropriate dashboard or login)
const Home = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to={user.role === 'customer' ? '/portal' : '/agent'} replace />;
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem' }}>
        <LifeBuoy size={64} style={{ color: 'var(--primary-color)', marginBottom: '1.5rem' }} />
        <h1>Welcome to HelpDesk Pro</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
          Your modern, real-time customer support ticket system. Access fast resolutions, view SLA tracking, and live chat with agents.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-primary">Sign In to Portal</Link>
          <Link to="/register" className="btn btn-secondary">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

import Login from './pages/Login';
import Register from './pages/Register';

import CustomerDashboard from './pages/CustomerDashboard';
import SubmitTicket from './pages/SubmitTicket';
import CustomerTicketDetail from './pages/CustomerTicketDetail';

import AgentLayout from './pages/agent/AgentLayout';
import Queue from './pages/agent/Queue';
import AgentTicketDetail from './pages/agent/AgentTicketDetail';
import KBManage from './pages/agent/KBManage';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/agent/Analytics';
import InvoiceList from './pages/agent/InvoiceList';
import Billing from './pages/Billing';
import CustomerBilling from './pages/CustomerBilling';

// --- APP LAYOUT WRAPPER ---
const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="navbar">
        <Link to="/" className="navbar-brand">
          <LifeBuoy size={28} style={{ color: 'var(--primary-color)' }} />
          <span>HelpDesk Pro</span>
        </Link>
        <nav className="navbar-links">
          {user ? (
            <>
              {user.role === 'customer' ? (
                <>
                  <NavLink to="/portal" className="navbar-link" end>My Portal</NavLink>
                  <NavLink to="/portal/tickets/new" className="navbar-link">New Ticket</NavLink>
                  <NavLink to="/portal/billing" className="navbar-link">Billing</NavLink>
                  <NavLink to="/kb" className="navbar-link">Knowledge Base</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/agent" className="navbar-link" end>Queue</NavLink>
                  <NavLink to="/agent/kb" className="navbar-link">KB Articles</NavLink>
                  <NavLink to="/agent/analytics" className="navbar-link">Analytics</NavLink>
                  <NavLink to="/agent/billing" className="navbar-link">Billing</NavLink>
                </>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-closed" style={{ textTransform: 'none' }}>
                  {user.role}
                </span>
                <strong>{user.name}</strong>
              </span>
              <button 
                onClick={handleLogoutClick} 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginLeft: '0.5rem' }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Get Started</Link>
            </>
          )}
        </nav>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <div className="container">
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} HelpDesk Pro MERN Support System. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <AppLayout>
              <Home />
            </AppLayout>
          } />
          
          <Route path="/login" element={
            <AppLayout>
              <Login />
            </AppLayout>
          } />
          
          <Route path="/register" element={
            <AppLayout>
              <Register />
            </AppLayout>
          } />

          {/* Customer Portal Secured Routes */}
          <Route path="/portal" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AppLayout>
                <CustomerDashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/portal/tickets/new" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AppLayout>
                <SubmitTicket />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/portal/tickets/:id" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AppLayout>
                <CustomerTicketDetail />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Public Knowledge Base (accessible to all authenticated users) */}
          <Route path="/kb" element={
            <ProtectedRoute>
              <AppLayout>
                <KnowledgeBase />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Agent Workspace Secured Routes */}
          <Route path="/agent" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentLayout>
                <Queue />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/agent/tickets/:id" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentLayout>
                <AgentTicketDetail />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/agent/kb" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentLayout>
                <KBManage />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/agent/analytics" element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <AgentLayout>
                <Analytics />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/agent/billing" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AgentLayout>
                <Billing />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/agent/invoices" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AgentLayout>
                <InvoiceList />
              </AgentLayout>
            </ProtectedRoute>
          } />
          <Route path="/portal/billing" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <AppLayout>
                <CustomerBilling />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
