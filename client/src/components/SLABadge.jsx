import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * SLABadge - A reusable countdown badge component
 * 
 * Props:
 *   - deadline: Date string or Date object — the SLA deadline
 *   - createdAt: Date string or Date object — when the ticket/SLA was created (used to calculate % remaining)
 *   - breached: Boolean — whether the SLA is already marked breached
 *   - compact: Boolean — smaller variant for use in tables/lists
 */
export default function SLABadge({ deadline, createdAt, breached = false, compact = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!deadline) {
    return (
      <span className="sla-badge sla-badge--none" style={compact ? { fontSize: '0.7rem', padding: '0.2rem 0.4rem' } : {}}>
        <Clock size={compact ? 10 : 12} />
        No SLA
      </span>
    );
  }

  const deadlineDate = new Date(deadline);
  const createdDate = createdAt ? new Date(createdAt) : new Date(deadlineDate.getTime() - 24 * 60 * 60 * 1000);
  
  const totalDuration = deadlineDate.getTime() - createdDate.getTime();
  const remaining = deadlineDate.getTime() - now.getTime();
  const percentRemaining = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;

  const isBreached = breached || remaining <= 0;
  const isWarning = !isBreached && percentRemaining <= 25;
  const isOk = !isBreached && !isWarning;

  // Format the countdown display
  const formatCountdown = (ms) => {
    if (ms <= 0) return 'Breached';
    
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const statusClass = isBreached 
    ? 'sla-badge--breached' 
    : isWarning 
      ? 'sla-badge--warning' 
      : 'sla-badge--ok';

  const IconComponent = isBreached ? ShieldAlert : isWarning ? AlertTriangle : Clock;
  const iconSize = compact ? 10 : 13;

  return (
    <span 
      className={`sla-badge ${statusClass}`}
      style={compact ? { fontSize: '0.7rem', padding: '0.2rem 0.5rem', gap: '0.2rem' } : {}}
      title={`SLA Deadline: ${deadlineDate.toLocaleString()}`}
    >
      <IconComponent size={iconSize} />
      <span>{formatCountdown(remaining)}</span>
      {!compact && (
        <span className="sla-badge__label">
          {isBreached ? 'SLA' : 'left'}
        </span>
      )}
    </span>
  );
}
