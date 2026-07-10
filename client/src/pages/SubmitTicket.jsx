import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HelpCircle, PlusCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';
import Toast from '../components/Toast';

export default function SubmitTicket() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  
  // Submit control states
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const navigate = useNavigate();

  // Debounced search trigger for KB suggestions
  useEffect(() => {
    const searchQuery = `${subject} ${description}`.trim();
    if (searchQuery.length < 5) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.get(`/api/kb/suggest?q=${encodeURIComponent(searchQuery)}`);
        if (res.data && res.data.success) {
          setSuggestions(res.data.suggestions);
        }
      } catch (err) {
        console.error('Failed to get KB suggestions:', err);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [subject, description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setToastType('error');
      setToastMessage('Please fill out the Subject and Description fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject,
        category,
        priority,
        description,
        customFields: { browser: navigator.userAgent }
      };

      await api.post('/api/tickets', payload);
      setToastType('success');
      setToastMessage('Ticket submitted successfully!');
      
      setTimeout(() => {
        navigate('/portal');
      }, 1000);
    } catch (err) {
      setToastType('error');
      setToastMessage(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
      setSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    if (expandedSuggestion === id) {
      setExpandedSuggestion(null);
    } else {
      setExpandedSuggestion(id);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <h1>Submit a Support Request</h1>
      <p style={{ marginBottom: '2rem' }}>Provide details about your issue and we'll start resolving it under SLA guidelines.</p>

      <div className="grid grid-3" style={{ alignItems: 'start' }}>
        
        {/* Ticket Submission Form Column */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label" htmlFor="subject">Subject / Summary</label>
                <input 
                  id="subject"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Unable to authenticate with WebSockets on production" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required 
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="category">Category</label>
                  <select 
                    id="category"
                    className="form-input" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Technical">Technical Support</option>
                    <option value="Billing">Billing</option>
                    <option value="Account">Account Setup</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="priority">Urgency / Priority</label>
                  <select 
                    id="priority"
                    className="form-input" 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Low (General Query)</option>
                    <option value="medium">Medium (Impeding workflow)</option>
                    <option value="high">High (Major blocks)</option>
                    <option value="critical">Critical (Production System Down)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">Detailed Description</label>
                <textarea 
                  id="description"
                  className="form-input" 
                  rows="8" 
                  placeholder="Explain what happened. Include errors, environment setups, and steps to reproduce..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <Link to="/portal" className="btn btn-secondary">Cancel</Link>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Submitting request...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* KB Suggestions Sidebar Column */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--primary-color)', minHeight: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <HelpCircle size={20} style={{ color: 'var(--primary-color)' }} />
              <h3>Help Suggestions</h3>
            </div>
            
            {suggestions.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Suggestions will display dynamically as you type your subject or description query.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  You might find these articles helpful:
                </p>
                {suggestions.map((article) => {
                  const isExpanded = expandedSuggestion === article._id;
                  return (
                    <div 
                      key={article._id} 
                      style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-color)' 
                      }}
                    >
                      <button 
                        type="button"
                        onClick={() => toggleExpand(article._id)}
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <BookOpen size={14} style={{ color: 'var(--text-muted)' }} />
                          {article.title}
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      
                      {isExpanded && (
                        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                          <strong>Category: {article.category}</strong>
                          <div style={{ marginTop: '0.5rem' }}>
                            {article.content}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
    </div>
  );
}
