import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { 
  ArrowLeft, 
  Send, 
  Eye, 
  Settings, 
  UserCheck, 
  Lock, 
  BookOpen, 
  MessageSquare,
  Unlock,
  CheckCircle2,
  FolderOpen,
  ShieldAlert,
  X,
  Lightbulb
} from 'lucide-react';
import Toast from '../../components/Toast';
import SLABadge from '../../components/SLABadge';
import useSocket, { getSocket } from '../../hooks/useSocket';

export default function AgentTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Data States
  const [ticket, setTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [canned, setCanned] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  
  // Loading and Input control states
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // Custom fields editor states
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // KB Suggestions State
  const [kbSuggestions, setKbSuggestions] = useState([]);

  // SLA Breach Alert State
  const [slaBreachAlerts, setSlaBreachAlerts] = useState([]);
  const [slaRecord, setSlaRecord] = useState(null);

  // Live Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [customerTyping, setCustomerTyping] = useState('');
  const chatTimeoutRef = React.useRef(null);
  const chatEndRef = React.useRef(null);

  const fetchChats = async () => {
    try {
      const res = await api.get(`/api/tickets/${id}/chats`);
      if (res.data && res.data.success) {
        setChatMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch chat log:', err);
    }
  };

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

  useSocket('new_chat_message', (chatMsg) => {
    if (chatMsg.ticket === id) {
      setChatMessages(prev => {
        if (prev.some(m => m._id === chatMsg._id)) return prev;
        return [...prev, chatMsg];
      });
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  });

  useSocket('user_typing', ({ userName }) => {
    setCustomerTyping(userName);
  });

  useSocket('user_stop_typing', () => {
    setCustomerTyping('');
  });

  // Listen for SLA breach events
  useSocket('sla_breach', (breachData) => {
    if (breachData.ticket?._id === id) {
      setSlaBreachAlerts(prev => [breachData, ...prev]);
      setTicket(breachData.ticket);
    }
  });

  const fetchData = async () => {
    try {
      const [ticketRes, responsesRes, cannedRes, agentsRes] = await Promise.all([
        api.get(`/api/tickets/${id}`),
        api.get(`/api/tickets/${id}/responses`),
        api.get('/api/canned'),
        api.get('/api/auth/agents')
      ]);

      if (ticketRes.data && ticketRes.data.success) {
        setTicket(ticketRes.data.ticket);
        // Fetch KB suggestions based on ticket subject/category
        fetchKBSuggestions(ticketRes.data.ticket);
      }
      if (responsesRes.data && responsesRes.data.success) {
        setResponses(responsesRes.data.responses);
      }
      if (cannedRes.data && cannedRes.data.success) {
        setCanned(cannedRes.data.canned);
      }
      if (agentsRes.data && agentsRes.data.success) {
        setAgentsList(agentsRes.data.agents);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch KB suggestions based on ticket subject
  const fetchKBSuggestions = async (ticketData) => {
    try {
      const query = ticketData.subject || ticketData.category || '';
      if (query.length < 3) return;
      
      const res = await api.get(`/api/kb/suggest?q=${encodeURIComponent(query)}`);
      if (res.data && res.data.success) {
        setKbSuggestions(res.data.suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch KB suggestions:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchChats();
    const socket = getSocket();
    socket.emit('join_ticket', id);
    return () => {
      socket.emit('leave_ticket', id);
      if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    };
  }, [id]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const socket = getSocket();
    socket.emit('stop_typing', { ticketId: id });
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);

    try {
      await api.post(`/api/tickets/${id}/chats`, { message: chatInput });
      setChatInput('');
    } catch (err) {
      console.error('Failed to send live chat message:', err);
    }
  };

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
    const socket = getSocket();
    socket.emit('typing', { ticketId: id, userName: user?.name });

    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    chatTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { ticketId: id });
    }, 2000);
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await api.post(`/api/tickets/${id}/responses`, { 
        message: replyText,
        isInternalNote: isInternal
      });
      
      if (res.data && res.data.success) {
        setResponses(prev => [...prev, res.data.response]);
        setReplyText('');
        setToastType('success');
        setToastMessage(isInternal ? 'Internal staff note added!' : 'Reply sent to customer!');
        
        // Auto update ticket status in UI depending on reply type
        if (!isInternal && ticket && ['open', 'in_progress'].includes(ticket.status)) {
          setTicket(prev => ({ ...prev, status: 'waiting_on_customer' }));
        }
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to save response.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Canned response selection insertion
  const handleSelectCanned = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const selected = canned.find(c => c._id === selectedId);
    if (selected) {
      // Replace or insert canned response
      setReplyText(prev => `${prev}${selected.body}`);
      setToastType('success');
      setToastMessage('Canned response template inserted!');
    }
    // Reset selection index
    e.target.value = '';
  };

  // Update Status Dropdown with admin validation checks
  const handleStatusChange = async (newStatus) => {
    if (!ticket) return;

    // Check closed status logic: can't reopen closed tickets without admin role
    if (ticket.status === 'closed' && newStatus !== 'closed' && user.role !== 'admin') {
      setToastType('error');
      setToastMessage('Permission Denied: Only administrators can reopen closed tickets.');
      // Reset dropdown visual in UI by forcing state refresh
      fetchData();
      return;
    }

    try {
      const res = await api.put(`/api/tickets/${id}`, { status: newStatus });
      if (res.data && res.data.success) {
        setTicket(res.data.ticket);
        setToastType('success');
        setToastMessage(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await api.put(`/api/tickets/${id}`, { priority: newPriority });
      if (res.data && res.data.success) {
        setTicket(res.data.ticket);
        setToastType('success');
        setToastMessage(`Priority bumped to ${newPriority}`);
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to update priority.');
    }
  };

  const handleAssigneeChange = async (newAgentId) => {
    try {
      const res = await api.put(`/api/tickets/${id}`, { assignedAgent: newAgentId || null });
      if (res.data && res.data.success) {
        setTicket(res.data.ticket);
        setToastType('success');
        setToastMessage(newAgentId ? 'Agent assigned successfully!' : 'Ticket unassigned.');
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to update assignee.');
    }
  };

  // Add custom key-value metadata field
  const handleAddCustomField = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      const currentFields = ticket.customFields || {};
      const payload = {
        customFields: {
          ...currentFields,
          [newKey.trim()]: newValue.trim()
        }
      };

      const res = await api.put(`/api/tickets/${id}`, payload);
      if (res.data && res.data.success) {
        setTicket(res.data.ticket);
        setNewKey('');
        setNewValue('');
        setToastType('success');
        setToastMessage('Custom field updated!');
      }
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to save custom field.');
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
        <h2>Ticket details could not be found.</h2>
        <Link to="/agent" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
          <ArrowLeft size={16} /> Return to Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '0 1.5rem' }}>
      
      {/* SLA Breach Alerts */}
      {slaBreachAlerts.map((alert, index) => (
        <div key={index} className="sla-breach-alert">
          <div className="sla-breach-alert__icon">
            <ShieldAlert size={20} />
          </div>
          <div className="sla-breach-alert__content">
            <div className="sla-breach-alert__title">⚠️ SLA Breach Detected</div>
            <div className="sla-breach-alert__message">{alert.message}</div>
          </div>
          <button className="sla-breach-alert__dismiss" onClick={() => setSlaBreachAlerts(prev => prev.filter((_, i) => i !== index))}>
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <Link to="/agent" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} /> Back to Queue
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span className="badge badge-closed">TICKET #{ticket._id.substring(ticket._id.length - 6).toUpperCase()}</span>
            <span className={`badge badge-${ticket.priority}`}>{ticket.priority} priority</span>
            <span className={`badge badge-${ticket.status.replace(/_/g, '-')}`}>{ticket.status.replace(/_/g, ' ')}</span>
            <SLABadge deadline={ticket.slaDeadline} createdAt={ticket.createdAt} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{ticket.subject}</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Customer: <strong>{ticket.customer?.name} ({ticket.customer?.company || 'Personal'})</strong> • Contact: {ticket.customer?.email}
          </p>
        </div>

        {/* Real-time Presence Indicators */}
        <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '3px solid var(--secondary-color)', backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)' }}>
          <Eye size={16} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Presence: Agent Alex is also viewing this ticket thread</span>
        </div>
      </div>

      {/* Grid: thread + sidebar details */}
      <div className="grid grid-4" style={{ alignItems: 'start' }}>
        
        {/* Main conversation history and replies column */}
        <div style={{ gridColumn: 'span 3' }}>
          
          {/* Conversation list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem 1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Initial description card */}
            <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                INITIAL CUSTOMER COMPLAINT
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{ticket.description}</p>
            </div>

            {/* Replies */}
            {responses.map((resp) => {
              const isCust = resp.author.role === 'customer';
              return (
                <div 
                  key={resp._id}
                  style={{ 
                    alignSelf: isCust ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    backgroundColor: resp.isInternalNote 
                      ? '#fffbeb' // Amber 50 for Internal private notes
                      : (isCust ? 'var(--bg-color)' : 'var(--primary-light)'),
                    border: resp.isInternalNote 
                      ? '1px dashed #d97706' 
                      : `1px solid ${isCust ? 'var(--border-color)' : 'rgba(14, 165, 233, 0.15)'}`,
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span style={{ color: resp.isInternalNote ? '#b45309' : (isCust ? 'var(--text-primary)' : 'var(--primary-hover)') }}>
                      {resp.author.name} ({resp.author.role.toUpperCase()})
                      {resp.isInternalNote && ' [INTERNAL NOTE]'}
                    </span>
                    <span>{new Date(resp.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                    {resp.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form Box */}
          <div className="card">
            
            {/* Internal vs Public toggles */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button 
                type="button"
                onClick={() => setIsInternal(false)}
                className="btn"
                style={{ 
                  flex: 1,
                  fontSize: '0.85rem',
                  backgroundColor: !isInternal ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: !isInternal ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${!isInternal ? 'var(--primary-color)' : 'var(--border-color)'}`
                }}
              >
                <MessageSquare size={16} /> Reply to Customer
              </button>
              
              <button 
                type="button"
                onClick={() => setIsInternal(true)}
                className="btn"
                style={{ 
                  flex: 1,
                  fontSize: '0.85rem',
                  backgroundColor: isInternal ? '#d97706' : 'var(--surface-color)',
                  color: isInternal ? '#ffffff' : 'var(--text-secondary)',
                  border: `1px solid ${isInternal ? '#d97706' : 'var(--border-color)'}`
                }}
              >
                <Lock size={16} /> Add Staff Internal Note
              </button>
            </div>

            {/* Canned responses insertion */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Insert Canned Template</label>
              <select className="form-input" style={{ padding: '0.4rem' }} onChange={handleSelectCanned} defaultValue="">
                <option value="">-- Choose canned response template --</option>
                {canned.map(c => (
                  <option key={c._id} value={c._id}>{c.title} ({c.category})</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSendResponse}>
              <div className="form-group">
                <textarea 
                  className="form-input"
                  rows="5"
                  placeholder={isInternal ? "Write a private note visible only to support agents..." : "Write a message reply that the customer will receive..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={submittingReply} 
                  className="btn btn-primary"
                  style={{ backgroundColor: isInternal ? '#d97706' : '', borderColor: isInternal ? '#d97706' : '' }}
                >
                  {submittingReply ? 'Saving response...' : (isInternal ? 'Save Private Note' : 'Send Reply')}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Sidebar settings column */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Metadata Controls */}
          <div className="card">
            <h3>Control Room</h3>
            <hr style={{ margin: '0.75rem 0', borderColor: 'var(--border-color)' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Status */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Ticket Status</label>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  {ticket.status === 'closed' ? <Lock size={14} style={{ color: 'var(--text-muted)' }} /> : <Unlock size={14} style={{ color: 'var(--primary-color)' }} />}
                  <select 
                    className="form-input" 
                    value={ticket.status} 
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ flex: 1, padding: '0.4rem' }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_customer">Waiting on Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Priority Urgency</label>
                <select 
                  className="form-input" 
                  value={ticket.priority} 
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  style={{ padding: '0.4rem' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Assigned Agent</label>
                <select 
                  className="form-input" 
                  value={ticket.assignedAgent?._id || ''} 
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  style={{ padding: '0.4rem' }}
                >
                  <option value="">-- Unassigned --</option>
                  {agentsList.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Real-time Live Chat Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '350px', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MessageSquare size={16} /> Live Instant Chat
            </h3>
            <hr style={{ margin: '0.25rem 0 0.75rem 0', borderColor: 'var(--border-color)' }} />
            
            {/* Messages body list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Awaiting messages. Start the live conversation.
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.sender?._id === user?._id;
                  return (
                    <div key={msg._id} style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      backgroundColor: isMe ? 'var(--primary-color)' : '#e2e8f0',
                      color: isMe ? '#ffffff' : 'var(--text-primary)',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      maxWidth: '85%'
                    }}>
                      <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 'bold', marginBottom: '0.1rem' }}>
                        {isMe ? 'You' : msg.sender?.name}
                      </div>
                      {msg.message}
                    </div>
                  );
                })
              )}
              {customerTyping && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {customerTyping} is typing...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input field form */}
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.35rem' }}>
              <input 
                type="text" 
                placeholder="Type instant reply..." 
                className="form-input"
                style={{ padding: '0.35rem', fontSize: '0.8rem', borderRadius: '15px' }}
                value={chatInput}
                onChange={handleChatInputChange}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={12} />
              </button>
            </form>
          </div>

          {/* Suggested KB Articles for this ticket */}
          {kbSuggestions.length > 0 && (
            <div className="card" style={{ borderLeft: '3px solid var(--secondary-color)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--secondary-hover)' }}>
                <Lightbulb size={16} /> Suggested Articles
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>Relevant KB articles for this ticket:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {kbSuggestions.map(article => (
                  <div 
                    key={article._id} 
                    style={{ 
                      padding: '0.6rem 0.75rem', 
                      backgroundColor: 'var(--bg-color)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--secondary-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <BookOpen size={12} style={{ color: 'var(--secondary-color)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{article.title}</span>
                    </div>
                    <span className="badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', backgroundColor: 'var(--secondary-light)', color: 'var(--secondary-hover)' }}>
                      {article.category}
                    </span>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0', lineHeight: '1.4' }}>
                      {article.content?.substring(0, 120)}{article.content?.length > 120 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields Editor */}
          <div className="card">
            <h3>Custom Meta Fields</h3>
            <hr style={{ margin: '0.75rem 0', borderColor: 'var(--border-color)' }} />
            
            {/* List custom fields */}
            <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {Object.keys(ticket.customFields || {}).length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom fields logged.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(ticket.customFields).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-color)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>{key}:</strong>
                      <span>{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add metadata field */}
            <form onSubmit={handleAddCustomField}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Key (e.g. browser)" 
                  className="form-input"
                  style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Value (e.g. Chrome 124)" 
                  className="form-input"
                  style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '0.35rem', fontSize: '0.8rem' }}>
                  Add / Save Field
                </button>
              </div>
            </form>

          </div>

          {/* CSAT Details (if customer already rated) */}
          {ticket.csatRating && (
            <div className="card" style={{ borderLeft: '4px solid var(--status-resolved)', backgroundColor: 'var(--priority-low-light)' }}>
              <h4 style={{ color: 'var(--status-resolved)', marginBottom: '0.5rem' }}>Customer CSAT Review</h4>
              <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem' }}>
                {[1,2,3,4,5].map(n => (
                  <Star 
                    key={n} 
                    size={16} 
                    fill={n <= ticket.csatRating ? 'var(--priority-medium)' : 'none'} 
                    color="var(--priority-medium)" 
                  />
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                "{ticket.csatComment || 'No comment left.'}"
              </p>
            </div>
          )}

        </div>

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
