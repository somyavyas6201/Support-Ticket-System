import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { Star, Send, ArrowLeft, Clock, Shield, CheckCircle, HelpCircle } from 'lucide-react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import LiveChatWidget from '../components/LiveChatWidget';

export default function CustomerTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  
  // CSAT rating form states
  const [rating, setRating] = useState(5);
  const [csatComment, setCsatComment] = useState('');
  const [csatSubmitted, setCsatSubmitted] = useState(false);
  const [csatLoading, setCsatLoading] = useState(false);

  // SLA countdown timer states
  const [slaText, setSlaText] = useState('');
  const [slaStatus, setSlaStatus] = useState('normal'); // 'normal', 'warning', 'breached'

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Real-time Socket Event Handlers
  useSocket('new_message', (newMsg) => {
    if (newMsg.ticket === id) {
      setResponses(prev => {
        if (prev.some(r => r._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
    }
  });

  useSocket('ticket_updated', (updatedTicket) => {
    if (updatedTicket._id === id) {
      setTicket(updatedTicket);
    }
  });

  const fetchData = async () => {
    try {
      const [ticketRes, responsesRes] = await Promise.all([
        api.get(`/api/tickets/${id}`),
        api.get(`/api/tickets/${id}/responses`)
      ]);
      
      if (ticketRes.data && ticketRes.data.success) {
        setTicket(ticketRes.data.ticket);
        if (ticketRes.data.ticket.csatRating) {
          setCsatSubmitted(true);
          setRating(ticketRes.data.ticket.csatRating);
          setCsatComment(ticketRes.data.ticket.csatComment || '');
        }
      }
      if (responsesRes.data && responsesRes.data.success) {
        setResponses(responsesRes.data.responses);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to fetch ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // SLA timer logic
  useEffect(() => {
    if (!ticket || !ticket.slaDeadline || ['resolved', 'closed'].includes(ticket.status)) {
      setSlaText('');
      return;
    }

    const updateCountdown = () => {
      const deadline = new Date(ticket.slaDeadline);
      const now = new Date();
      const diffMs = deadline - now;

      if (diffMs <= 0) {
        setSlaText('BREACHED');
        setSlaStatus('breached');
        return;
      }

      const diffMins = Math.floor(diffMs / (60 * 1000));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;

      if (hours > 0) {
        setSlaText(`${hours}h ${mins}m remaining`);
      } else {
        setSlaText(`${mins}m remaining`);
      }

      // Warn if under 1 hour
      if (hours === 0) {
        setSlaStatus('warning');
      } else {
        setSlaStatus('normal');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [ticket]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const res = await api.post(`/api/tickets/${id}/responses`, { message: newReply });
      if (res.data && res.data.success) {
        setResponses(prev => [...prev, res.data.response]);
        setNewReply('');
        setToastType('success');
        setToastMessage('Reply sent successfully!');
        
        // If the ticket was previously resolved/closed, reopen it
        if (ticket && ['resolved', 'closed'].includes(ticket.status)) {
          setTicket(prev => ({ ...prev, status: 'open' }));
        }
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to send reply.');
    }
  };

  const handleCSATSubmit = async (e) => {
    e.preventDefault();
    setCsatLoading(true);
    try {
      const res = await api.post(`/api/tickets/${id}/csat`, { csatRating: rating, csatComment });
      if (res.data && res.data.success) {
        setCsatSubmitted(true);
        setToastType('success');
        setToastMessage('Thank you for rating our support assistance!');
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to submit rating.');
    } finally {
      setCsatLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Ticket not found</h2>
        <Link to="/portal" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
          <ArrowLeft size={16} /> Return to Portal
        </Link>
      </div>
    );
  }

  // Calculate timeline steps
  const statusSteps = ['open', 'in_progress', 'resolved'];
  const currentStepIndex = statusSteps.indexOf(ticket.status) !== -1 ? statusSteps.indexOf(ticket.status) : 1;

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
      
      {/* Back button & Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <Link to="/portal" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-closed">TICKET #{ticket._id.substring(ticket._id.length - 6).toUpperCase()}</span>
            <span className={`badge badge-${ticket.priority}`}>{ticket.priority} Priority</span>
            <span className={`badge badge-${ticket.status.replace(/_/g, '-')}`}>{ticket.status.replace(/_/g, ' ')}</span>
          </div>
          <h1 style={{ margin: 0 }}>{ticket.subject}</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            Category: <strong>{ticket.category}</strong> • Opened by: {ticket.customer?.name}
          </p>
        </div>

        {/* SLA Warning Card */}
        {slaText && (
          <div 
            className="card" 
            style={{ 
              padding: '0.75rem 1.25rem', 
              borderLeft: `4px solid ${slaStatus === 'breached' ? 'var(--priority-critical)' : (slaStatus === 'warning' ? 'var(--priority-medium)' : 'var(--primary-color)')}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSE SLA DEADLINE</span>
            <span 
              className={slaStatus === 'breached' ? 'animate-pulse-urgent' : ''}
              style={{ 
                fontSize: '1rem', 
                fontWeight: 'bold', 
                color: slaStatus === 'breached' ? 'var(--priority-critical)' : (slaStatus === 'warning' ? 'var(--priority-medium)' : 'var(--primary-color)') 
              }}
            >
              {slaText}
            </span>
          </div>
        )}
      </div>

      {/* Progress Timeline Tracker */}
      <div className="card" style={{ marginBottom: '2.5rem', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '0 auto', maxWidth: '600px' }}>
          
          {/* Connector Line */}
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            left: '5%', 
            right: '5%', 
            height: '2px', 
            backgroundColor: 'var(--border-color)', 
            zIndex: 1 
          }}>
            <div style={{ 
              width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`, 
              height: '100%', 
              backgroundColor: 'var(--primary-color)',
              transition: 'width 0.4s ease'
            }}></div>
          </div>

          {/* Timeline Nodes */}
          {statusSteps.map((step, idx) => {
            const isActive = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, width: '80px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: isCurrent ? 'var(--primary-color)' : (isActive ? 'var(--primary-light)' : '#ffffff'),
                  border: `2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  color: isCurrent ? '#ffffff' : (isActive ? 'var(--primary-color)' : 'var(--text-muted)'),
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 'bold',
                  fontSize: '0.85rem' 
                }}>
                  {idx + 1}
                </div>
                <span style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: isCurrent ? 'bold' : 500, 
                  color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: thread messages + ticket metadata */}
      <div className="grid grid-4" style={{ alignItems: 'start' }}>
        
        {/* Discussion Thread column */}
        <div style={{ gridColumn: 'span 3' }}>
          
          {/* Thread messages container */}
          <div className="card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>Thread History</h3>
            
            {responses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                No replies recorded. Feel free to send a message below to start communicating.
              </p>
            ) : (
              responses.map((resp) => {
                const isCustomerMessage = resp.author.role === 'customer';
                return (
                  <div 
                    key={resp._id}
                    style={{ 
                      alignSelf: isCustomerMessage ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      backgroundColor: isCustomerMessage ? 'var(--primary-light)' : 'var(--bg-color)',
                      border: `1px solid ${isCustomerMessage ? 'rgba(14, 165, 233, 0.15)' : 'var(--border-color)'}`,
                      padding: '1rem 1.25rem',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <span style={{ color: isCustomerMessage ? 'var(--primary-hover)' : 'var(--text-primary)' }}>
                        {resp.author.name} {isCustomerMessage ? '(You)' : `(${resp.author.role.toUpperCase()})`}
                      </span>
                      <span>{new Date(resp.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                      {resp.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Area (hidden if closed, or allowed to reopen) */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <form onSubmit={handleSendReply}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reply" style={{ fontWeight: 600 }}>Post Reply</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input 
                    id="reply"
                    type="text" 
                    className="form-input" 
                    placeholder="Type your message here to update the support staff..." 
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    <Send size={16} /> Send
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* CSAT Survey Prompt Column */}
          {ticket.status === 'resolved' && (
            <div className="card" style={{ borderLeft: '4px solid var(--status-resolved)', backgroundColor: 'var(--priority-low-light)' }}>
              <h3>HelpDesk CSAT Rating Survey</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                This support ticket is marked as **resolved**. Please help us evaluate our agent assistance.
              </p>
              
              {csatSubmitted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--priority-low)', fontWeight: 'bold' }}>
                  <CheckCircle size={20} />
                  <span>CSAT feedback saved! Rating: {rating} / 5 stars. Comment: "{csatComment || 'No text left'}"</span>
                </div>
              ) : (
                <form onSubmit={handleCSATSubmit}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[1, 2, 3, 4, 5].map((starNum) => (
                      <button 
                        key={starNum}
                        type="button"
                        onClick={() => setRating(starNum)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star 
                          size={28} 
                          fill={starNum <= rating ? 'var(--priority-medium)' : 'none'} 
                          color="var(--priority-medium)" 
                        />
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Optional Comments</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Agent was extremely patient and helpful!" 
                      value={csatComment}
                      onChange={(e) => setCsatComment(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={csatLoading} className="btn btn-primary" style={{ backgroundColor: 'var(--status-resolved)', borderColor: 'var(--status-resolved)' }}>
                    {csatLoading ? 'Saving feedback...' : 'Submit Rating'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Sidebar Metadata column */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="card">
            <h3>Support Context</h3>
            <hr style={{ margin: '0.75rem 0', borderColor: 'var(--border-color)' }} />
            
            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Assigned Agent:</strong>
                {ticket.assignedAgent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {ticket.assignedAgent.avatarUrl && (
                      <img 
                        src={ticket.assignedAgent.avatarUrl} 
                        alt="Agent avatar" 
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    )}
                    <span>{ticket.assignedAgent.name}</span>
                  </div>
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Unassigned (Awaiting queue)</span>
                )}
              </div>
              
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Customer Company:</strong>
                <span>{ticket.customer?.company || 'None'}</span>
              </div>
              
              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Support Channel:</strong>
                <span style={{ textTransform: 'capitalize' }}>{ticket.channel}</span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>SLA Target Response:</strong>
                <span>{new Date(ticket.slaDeadline).toLocaleString()}</span>
              </div>

              {ticket.resolvedAt && (
                <div>
                  <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Resolved Time:</strong>
                  <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage('')} 
        />
      )}

      {/* Floating Live Chat Widget */}
      <LiveChatWidget ticketId={id} user={user} />
    </div>
  );
}
