import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User } from 'lucide-react';
import api from '../api/axios';
import useSocket, { getSocket } from '../hooks/useSocket';

export default function LiveChatWidget({ ticketId, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket instance
  const socket = getSocket();

  // Fetch initial chat logs on mount / when widget is opened
  useEffect(() => {
    if (!isOpen) return;

    const fetchChats = async () => {
      try {
        const res = await api.get(`/api/tickets/${ticketId}/chats`);
        if (res.data && res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch chat logs:', err);
      }
    };

    fetchChats();
  }, [ticketId, isOpen]);

  // Scroll message thread to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // Bind Socket Room entry
  useEffect(() => {
    socket.emit('join_ticket', ticketId);

    return () => {
      socket.emit('leave_ticket', ticketId);
    };
  }, [ticketId]);

  // Listen to new chat messages
  useSocket('new_chat_message', (msg) => {
    // Append message if not duplicate
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  });

  // Listen to typing alerts
  useSocket('user_typing', ({ userName }) => {
    setTypingUser(userName);
  });

  useSocket('user_stop_typing', () => {
    setTypingUser('');
  });

  // Handle typing triggers
  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Emit typing trigger
    socket.emit('typing', { ticketId, userName: user?.name });

    // Clear previous debounced stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { ticketId });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Stop typing immediately
    socket.emit('stop_typing', { ticketId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const payload = { message: inputValue };
      await api.post(`/api/tickets/${ticketId}/chats`, payload);
      setInputValue('');
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    }
  };

  const styles = {
    triggerButton: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: 'var(--primary-color)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 8px 30px rgba(14, 165, 233, 0.4)',
      zIndex: 1000,
      transition: 'transform 0.2s ease, background-color 0.2s ease',
    },
    panel: {
      position: 'fixed',
      bottom: '96px',
      right: '24px',
      width: '370px',
      height: '500px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1000,
      animation: 'slide-up 0.3s ease-out'
    },
    header: {
      padding: '1rem 1.25rem',
      backgroundColor: 'var(--primary-color)',
      color: '#ffffff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    messagesList: {
      flex: 1,
      padding: '1rem',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      backgroundColor: '#f8fafc',
    },
    messageBubble: (isMe) => ({
      alignSelf: isMe ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      backgroundColor: isMe ? 'var(--primary-color)' : '#e2e8f0',
      color: isMe ? '#ffffff' : 'var(--text-primary)',
      padding: '0.6rem 0.9rem',
      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      fontSize: '0.875rem',
      lineHeight: 1.4,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      animation: 'fade-in 0.2s ease-in-out'
    }),
    inputArea: {
      padding: '0.75rem 1rem',
      borderTop: '1px solid var(--border-color)',
      backgroundColor: '#ffffff',
    },
    typingIndicator: {
      fontSize: '0.75rem',
      color: 'var(--text-muted)',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.25rem 0.5rem'
    }
  };

  return (
    <>
      {/* Floating Trigger Bubble Button */}
      <button 
        style={styles.triggerButton} 
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Floating Chat Thread Panel */}
      {isOpen && (
        <div style={styles.panel}>
          
          {/* Header */}
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
              <strong style={{ fontSize: '0.95rem' }}>Support Live Stream</strong>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body List */}
          <div style={styles.messagesList}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '0 1rem' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Need immediate answers? Start chatting live with your support agent.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender?._id === user?._id;
                return (
                  <div key={msg._id} style={styles.messageBubble(isMe)}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '0.15rem', fontWeight: 600 }}>
                      {isMe ? 'You' : msg.sender?.name}
                    </div>
                    {msg.message}
                  </div>
                );
              })
            )}

            {/* Typing status alerts */}
            {typingUser && (
              <div style={styles.typingIndicator}>
                <span className="spinner" style={{ width: '8px', height: '8px', border: '1px solid var(--text-muted)' }}></span>
                {typingUser} is typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input text sending area */}
          <div style={styles.inputArea}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
                value={inputValue}
                onChange={handleInputChange}
                required
              />
              <button 
                type="submit" 
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
