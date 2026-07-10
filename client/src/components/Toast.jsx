import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  const isSuccess = type === 'success';

  const styles = {
    container: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#10b981' : '#ef4444'}`,
      color: isSuccess ? '#065f46' : '#991b1b',
      padding: '0.875rem 1.25rem',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    },
    icon: {
      flexShrink: 0,
      color: isSuccess ? 'var(--priority-low)' : 'var(--priority-critical)',
    },
    text: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      opacity: 0.6,
      padding: 0,
      marginLeft: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      transition: 'opacity 0.2s ease',
    }
  };

  return (
    <div style={styles.container} className="toast-notification">
      {isSuccess ? (
        <CheckCircle2 size={18} style={styles.icon} />
      ) : (
        <AlertTriangle size={18} style={styles.icon} />
      )}
      <span style={styles.text}>{message}</span>
      <button 
        onClick={onClose} 
        style={styles.closeButton} 
        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
        title="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
