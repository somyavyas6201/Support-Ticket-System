import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Search, UserCheck, AlertTriangle, AlertCircle, ShieldAlert, X } from 'lucide-react';
import Toast from '../../components/Toast';
import SLABadge from '../../components/SLABadge';
import useSocket from '../../hooks/useSocket';

export default function Queue() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all'); // 'all', 'me', 'unassigned'

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // SLA Breach Alerts
  const [slaBreachAlerts, setSlaBreachAlerts] = useState([]);

  // Live real-time socket events for queue
  useSocket('new_ticket', (newTicket) => {
    setTickets(prev => {
      if (prev.some(t => t._id === newTicket._id)) return prev;
      return [newTicket, ...prev];
    });
  });

  useSocket('ticket_updated', (updatedTicket) => {
    setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
  });

  useSocket('sla_breach', (breachData) => {
    setSlaBreachAlerts(prev => [breachData, ...prev.slice(0, 4)]); // Keep max 5 alerts
    // Also update the ticket in the list
    if (breachData.ticket) {
      setTickets(prev => prev.map(t => t._id === breachData.ticket._id ? breachData.ticket : t));
    }
  });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/api/tickets');
      if (res.data && res.data.success) {
        setTickets(res.data.tickets);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage('Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleClaimTicket = async (ticketId) => {
    try {
      const res = await api.put(`/api/tickets/${ticketId}`, { assignedAgent: user._id });
      if (res.data && res.data.success) {
        setToastType('success');
        setToastMessage('Ticket claimed successfully!');
        
        // Refresh local ticket assignment
        setTickets(prev => prev.map(t => {
          if (t._id === ticketId) {
            return { ...t, assignedAgent: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl } };
          }
          return t;
        }));
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to claim ticket.');
    }
  };

  // Live countdown remaining calculator – now uses SLABadge
  const renderSLACell = (ticket) => {
    if (['resolved', 'closed'].includes(ticket.status)) {
      return <span style={{ color: 'var(--text-muted)' }}>--</span>;
    }

    return <SLABadge deadline={ticket.slaDeadline} createdAt={ticket.createdAt} compact />;  
  };

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    // 1. Status Filter
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    
    // 2. Priority Filter
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;

    // 3. Category Filter
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;

    // 4. Assignee Filter
    if (assigneeFilter === 'me') {
      if (!ticket.assignedAgent || ticket.assignedAgent._id !== user._id) return false;
    } else if (assigneeFilter === 'unassigned') {
      if (ticket.assignedAgent) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">

      {/* SLA Breach Alert Banners */}
      {slaBreachAlerts.map((alert, index) => (
        <div key={index} className="sla-breach-alert">
          <div className="sla-breach-alert__icon">
            <ShieldAlert size={20} />
          </div>
          <div className="sla-breach-alert__content">
            <div className="sla-breach-alert__title">⚠️ SLA Breach Escalation</div>
            <div className="sla-breach-alert__message">{alert.message}</div>
          </div>
          <button className="sla-breach-alert__dismiss" onClick={() => setSlaBreachAlerts(prev => prev.filter((_, i) => i !== index))}>
            <X size={14} />
          </button>
        </div>
      ))}
      
      {/* Title section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Global Ticket Queue</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>View, sort, filter, and assign tickets in the queue system.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setAssigneeFilter('all')} 
            className="btn" 
            style={{ 
              fontSize: '0.8rem', 
              padding: '0.4rem 0.8rem',
              backgroundColor: assigneeFilter === 'all' ? 'var(--primary-color)' : '#ffffff',
              color: assigneeFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${assigneeFilter === 'all' ? 'var(--primary-color)' : 'var(--border-color)'}`
            }}
          >
            All Tickets
          </button>
          <button 
            onClick={() => setAssigneeFilter('me')} 
            className="btn" 
            style={{ 
              fontSize: '0.8rem', 
              padding: '0.4rem 0.8rem',
              backgroundColor: assigneeFilter === 'me' ? 'var(--primary-color)' : '#ffffff',
              color: assigneeFilter === 'me' ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${assigneeFilter === 'me' ? 'var(--primary-color)' : 'var(--border-color)'}`
            }}
          >
            Assigned To Me
          </button>
          <button 
            onClick={() => setAssigneeFilter('unassigned')} 
            className="btn" 
            style={{ 
              fontSize: '0.8rem', 
              padding: '0.4rem 0.8rem',
              backgroundColor: assigneeFilter === 'unassigned' ? 'var(--primary-color)' : '#ffffff',
              color: assigneeFilter === 'unassigned' ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${assigneeFilter === 'unassigned' ? 'var(--primary-color)' : 'var(--border-color)'}`
            }}
          >
            Unassigned
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Status filter dropdown */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter by Status</label>
          <select className="form-input" style={{ padding: '0.4rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_customer">Waiting on Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Priority filter dropdown */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter by Priority</label>
          <select className="form-input" style={{ padding: '0.4rem' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Category filter dropdown */}
        <div>
          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter by Category</label>
          <select className="form-input" style={{ padding: '0.4rem' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="Billing">Billing</option>
            <option value="Technical">Technical Support</option>
            <option value="Account">Account Setup</option>
            <option value="Bug Report">Bug Report</option>
            <option value="Feature Request">Feature Request</option>
          </select>
        </div>

      </div>

      {/* Tickets List Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
        {filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <h3>No tickets found matching filters</h3>
            <p style={{ margin: '0.5rem 0 0 0' }}>Adjust selection options to view other requests.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 1.25rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Customer / Company</th>
                <th style={{ padding: '1rem' }}>Subject Summary</th>
                <th style={{ padding: '1rem' }}>Priority</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>SLA Timer</th>
                <th style={{ padding: '1rem' }}>Assignee</th>
                <th style={{ padding: '1rem 1.25rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr 
                  key={ticket._id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* ID */}
                  <td style={{ padding: '1.25rem 1.25rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    #{ticket._id.substring(ticket._id.length - 6).toUpperCase()}
                  </td>
                  
                  {/* Customer / Company */}
                  <td style={{ padding: '1rem' }}>
                    <strong>{ticket.customer?.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ticket.customer?.company || 'Personal'}</div>
                  </td>
                  
                  {/* Subject Summary */}
                  <td style={{ padding: '1rem', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.subject}>
                      {ticket.subject}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-hover)', fontWeight: 500 }}>{ticket.category}</span>
                  </td>
                  
                  {/* Priority */}
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                  </td>
                  
                  {/* Status */}
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge badge-${ticket.status.replace(/_/g, '-')}`}>{ticket.status.replace(/_/g, ' ')}</span>
                  </td>
                  
                  {/* SLA Countdown Cell */}
                  <td style={{ padding: '1rem', fontWeight: 600 }}>
                    {renderSLACell(ticket)}
                  </td>
                  
                  {/* Assignee */}
                  <td style={{ padding: '1rem' }}>
                    {ticket.assignedAgent ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {ticket.assignedAgent.avatarUrl && (
                          <img 
                            src={ticket.assignedAgent.avatarUrl} 
                            alt="avatar" 
                            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        )}
                        <span>{ticket.assignedAgent.name}</span>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                    )}
                  </td>
                  
                  {/* Action Buttons */}
                  <td style={{ padding: '1.25rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link to={`/agent/tickets/${ticket._id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                      Details
                    </Link>
                    {!ticket.assignedAgent && (
                      <button 
                        onClick={() => handleClaimTicket(ticket._id)}
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        Claim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
