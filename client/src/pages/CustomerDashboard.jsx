import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { PlusCircle, Clock, CheckCircle2, Ticket, AlertCircle } from 'lucide-react';
import Toast from '../components/Toast';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const fetchTickets = async () => {
    try {
      const res = await api.get('/api/tickets');
      if (res.data && res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Calculate dynamic stats
  const totalOpen = tickets.filter(t => t.status === 'open').length;
  const totalInProgress = tickets.filter(t => t.status === 'in_progress').length;
  const totalResolved = tickets.filter(t => t.status === 'resolved').length;

  // Filter list
  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter === 'all') return true;
    return ticket.status === statusFilter;
  });

  const getFormatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1>Welcome, {user?.name}</h1>
          <p style={{ margin: 0 }}>View and manage your support tickets or check resolution statuses.</p>
        </div>
        <Link to="/portal/tickets/new" className="btn btn-primary">
          <PlusCircle size={18} /> Submit New Ticket
        </Link>
      </div>

      {/* Stat Summaries */}
      <div className="grid grid-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-open)' }}>
          <div style={{ backgroundColor: 'var(--status-open-light)', color: 'var(--status-open)', padding: '0.75rem', borderRadius: '50%' }}>
            <Ticket size={24} />
          </div>
          <div>
            <h3 style={{ marginBottom: '0.15rem' }}>{totalOpen} Open</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Awaiting agent response</p>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-progress)' }}>
          <div style={{ backgroundColor: 'var(--status-progress-light)', color: 'var(--status-progress)', padding: '0.75rem', borderRadius: '50%' }}>
            <Clock size={24} />
          </div>
          <div>
            <h3 style={{ marginBottom: '0.15rem' }}>{totalInProgress} In Progress</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Actively being resolved</p>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--status-resolved)' }}>
          <div style={{ backgroundColor: 'var(--status-resolved-light)', color: 'var(--status-resolved)', padding: '0.75rem', borderRadius: '50%' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 style={{ marginBottom: '0.15rem' }}>{totalResolved} Resolved</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Recently completed</p>
          </div>
        </div>
      </div>

      {/* Filter and Content Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 0 }}>Support Request Logs</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'].map(filterName => (
            <button 
              key={filterName}
              onClick={() => setStatusFilter(filterName)}
              className="btn"
              style={{ 
                padding: '0.4rem 0.8rem', 
                fontSize: '0.8rem',
                backgroundColor: statusFilter === filterName ? 'var(--primary-color)' : 'var(--surface-color)',
                color: statusFilter === filterName ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${statusFilter === filterName ? 'var(--primary-color)' : 'var(--border-color)'}`
              }}
            >
              {filterName.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No tickets found</h3>
          <p style={{ color: 'var(--text-muted)' }}>You don't have any support logs under the "{statusFilter}" filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-1">
          {filteredTickets.map(ticket => (
            <Link key={ticket._id} to={`/portal/tickets/${ticket._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-closed" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                      #{ticket._id.substring(ticket._id.length - 6).toUpperCase()}
                    </span>
                    <span className={`badge badge-${ticket.priority}`}>
                      {ticket.priority} priority
                    </span>
                    <span className={`badge badge-${ticket.status.replace(/_/g, '-')}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{ticket.subject}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Category: {ticket.category} • Last updated: {getFormatDate(ticket.updatedAt)}
                  </p>
                </div>
                
                <span className="btn btn-secondary">Open Thread</span>
              </div>
            </Link>
          ))}
        </div>
      )}

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
