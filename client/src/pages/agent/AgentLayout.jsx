import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LifeBuoy, 
  Ticket, 
  BookOpen, 
  BarChart3, 
  CreditCard, 
  FileText,
  LogOut, 
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

export default function AgentLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
    },
    sidebar: {
      width: 'var(--sidebar-width)',
      backgroundColor: '#0f172a', // Premium deep dark slate
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #1e293b',
      flexShrink: 0,
    },
    logoSection: {
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0 1.5rem',
      borderBottom: '1px solid #1e293b',
    },
    logoText: {
      fontSize: '1.2rem',
      fontWeight: 700,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    navSection: {
      flex: 1,
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    navLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      color: '#94a3b8',
      borderRadius: 'var(--radius-sm)',
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: '0.9rem',
      transition: 'color 0.2s ease, background-color 0.2s ease',
    },
    profileSection: {
      padding: '1.25rem',
      borderTop: '1px solid #1e293b',
      backgroundColor: '#020617',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    },
    avatar: {
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      objectFit: 'cover',
      backgroundColor: '#334155',
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
    },
    header: {
      height: 'var(--header-height)',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      sticky: 'top',
    }
  };

  const activeStyle = {
    backgroundColor: '#1e293b',
    color: '#ffffff',
  };

  return (
    <div style={styles.container}>
      {/* Sidebar Navigation */}
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <Link to="/agent" style={{ textDecoration: 'none' }}>
            <span style={styles.logoText}>
              <LifeBuoy size={24} style={{ color: 'var(--primary-color)' }} />
              HelpDesk Pro
            </span>
          </Link>
        </div>

        <nav style={styles.navSection}>
          <NavLink 
            to="/agent" 
            end 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? activeStyle : {}) })}
          >
            <Ticket size={18} />
            <span>Ticket Queue</span>
          </NavLink>

          <NavLink 
            to="/agent/kb" 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? activeStyle : {}) })}
          >
            <BookOpen size={18} />
            <span>Knowledge Base</span>
          </NavLink>

          <NavLink 
            to="/agent/analytics" 
            style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? activeStyle : {}) })}
          >
            <BarChart3 size={18} />
            <span>Analytics Dashboard</span>
          </NavLink>

          {/* Admin Restricted Billing link */}
          {user?.role === 'admin' && (
            <>
              <NavLink 
                to="/agent/billing" 
                style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? activeStyle : {}) })}
              >
                <CreditCard size={18} />
                <span>Billing & Plans</span>
              </NavLink>
              <NavLink 
                to="/agent/invoices" 
                style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? activeStyle : {}) })}
              >
                <FileText size={18} />
                <span>Invoice List</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User profile footer section */}
        <div style={styles.profileSection}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" style={styles.avatar} />
          ) : (
            <div style={{ ...styles.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <UserIcon size={20} />
            </div>
          )}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', textTransform: 'capitalize' }}>
              <ShieldAlert size={12} />
              {user?.role}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-open">Staff workspace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Working in Sandbox Environment</span>
          </div>
        </header>
        
        <main style={{ flex: 1, padding: '2rem 0' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
