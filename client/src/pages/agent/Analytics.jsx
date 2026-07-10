import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Star,
  Clock,
  ShieldAlert,
  Ticket,
  Users,
  CheckCircle2,
  Trophy,
  MessageSquare
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// ─── Count-Up Animation Hook ─────────────────────────────────
function useCountUp(target, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined || isNaN(target)) {
      setValue(0);
      return;
    }

    const numTarget = Number(target);
    startRef.current = performance.now();

    const step = (timestamp) => {
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numTarget;
      setValue(Number(current.toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, decimals]);

  return value;
}

// ─── Stat Card Component ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix = '', color, subtext, decimals = 0 }) {
  const animatedValue = useCountUp(value, 1400, decimals);

  return (
    <div className="card animate-fade-in" style={{
      padding: '1.5rem',
      borderTop: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        <Icon size={20} style={{ color, opacity: 0.7 }} />
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: 700, color, lineHeight: 1.1 }}>
        {animatedValue}{suffix}
      </div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// ─── Chart Container with Fade-In ─────────────────────────────
function ChartCard({ title, icon: Icon, children, style = {} }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="card"
      style={{
        padding: '1.5rem',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {Icon && <Icon size={18} style={{ color: 'var(--primary-color)' }} />}
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Color Maps ───────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Billing': '#3b82f6',
  'Technical': '#8b5cf6',
  'Account': '#14b8a6',
  'Feature Request': '#f59e0b',
  'Bug Report': '#ef4444'
};

const PRIORITY_COLORS = {
  'low': '#10b981',
  'medium': '#f59e0b',
  'high': '#f97316',
  'critical': '#ef4444'
};

const STATUS_COLORS = {
  'open': '#3b82f6',
  'in progress': '#8b5cf6',
  'waiting on customer': '#eab308',
  'resolved': '#10b981',
  'closed': '#64748b'
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      padding: '0.6rem 0.85rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontSize: '0.8rem'
    }}>
      <div style={{ color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color || '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block' }}></span>
          {entry.name}: <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Main Analytics Component ─────────────────────────────────
export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [volume, setVolume] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byPriority, setByPriority] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [agentPerf, setAgentPerf] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, volRes, catRes, priRes, statRes, perfRes] = await Promise.all([
          api.get('/api/analytics/summary'),
          api.get('/api/analytics/volume'),
          api.get('/api/analytics/by-category'),
          api.get('/api/analytics/by-priority'),
          api.get('/api/analytics/by-status'),
          api.get('/api/analytics/agent-performance')
        ]);

        if (sumRes.data?.success) setSummary(sumRes.data.data);
        if (volRes.data?.success) setVolume(volRes.data.data);
        if (catRes.data?.success) setByCategory(catRes.data.data);
        if (priRes.data?.success) setByPriority(priRes.data.data);
        if (statRes.data?.success) setByStatus(statRes.data.data);
        if (perfRes.data?.success) setAgentPerf(perfRes.data.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={28} style={{ color: 'var(--primary-color)' }} />
          Analytics Dashboard
        </h1>
        <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Real-time metrics, ticket trends, and team performance insights.
        </p>
      </div>

      {/* ───── Summary Stat Cards ─────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          icon={Ticket}
          label="Open Tickets"
          value={summary?.openTickets || 0}
          color="var(--status-open)"
          subtext={`${summary?.totalTickets || 0} total tickets`}
        />
        <StatCard
          icon={ShieldAlert}
          label="SLA Breaches Today"
          value={summary?.breachedToday || 0}
          color="var(--priority-critical)"
          subtext={`${summary?.totalBreached || 0} total breaches`}
        />
        <StatCard
          icon={Star}
          label="Avg CSAT (Month)"
          value={summary?.avgCsat || 0}
          suffix="/5"
          color="var(--priority-medium)"
          decimals={2}
          subtext={`Based on ${summary?.csatCount || 0} ratings`}
        />
        <StatCard
          icon={Clock}
          label="Avg Resolution"
          value={summary?.avgResolutionHours || 0}
          suffix="h"
          color="var(--primary-color)"
          decimals={1}
          subtext={`${summary?.resolvedThisMonth || 0} resolved this month`}
        />
        <StatCard
          icon={CheckCircle2}
          label="SLA Compliance"
          value={summary?.slaCompliance || 0}
          suffix="%"
          color="var(--secondary-color)"
          decimals={1}
          subtext="On-time resolution rate"
        />
      </div>

      {/* ───── Ticket Volume Over Time ─────────── */}
      <ChartCard title="Ticket Volume — Last 30 Days" icon={TrendingUp} style={{ marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={volume} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="tickets"
              name="Tickets"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              fill="url(#volumeGradient)"
              dot={{ r: 3, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ───── Category + Priority Bar Charts ──── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <ChartCard title="Tickets by Category" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCategory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]} barSize={36}>
                {byCategory.map((entry, index) => (
                  <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by Priority" icon={AlertTriangle}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byPriority} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]} barSize={40}>
                {byPriority.map((entry, index) => (
                  <Cell key={index} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ───── Status Distribution Pie + Agent Leaderboard ──── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Donut Chart */}
        <ChartCard title="Status Distribution" icon={CheckCircle2}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byStatus}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                strokeWidth={2}
                stroke="#ffffff"
              >
                {byStatus.map((entry, index) => (
                  <Cell key={index} fill={entry.fill || STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Agent Leaderboard */}
        <ChartCard title="Agent Performance Leaderboard" icon={Trophy}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Resolved</th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>CSAT</th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Avg Res. Time</th>
                  <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Replies</th>
                </tr>
              </thead>
              <tbody>
                {agentPerf.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No agent data available.
                    </td>
                  </tr>
                ) : (
                  agentPerf.map((agent, i) => {
                    const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];
                    return (
                      <tr
                        key={agent.agentId}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>
                          {i < 3 ? (
                            <Trophy size={14} style={{ color: medalColors[i] }} />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{agent.role}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 700,
                            color: agent.resolved > 0 ? 'var(--status-resolved)' : 'var(--text-muted)'
                          }}>
                            {agent.resolved}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> / {agent.totalAssigned}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          {agent.avgCsat !== null ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontWeight: 600,
                              color: agent.avgCsat >= 4 ? 'var(--priority-low)' : agent.avgCsat >= 3 ? 'var(--priority-medium)' : 'var(--priority-critical)'
                            }}>
                              <Star size={11} fill="currentColor" /> {agent.avgCsat}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          {agent.avgResolutionHours !== null ? (
                            <span style={{ fontWeight: 500 }}>{agent.avgResolutionHours}h</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', color: 'var(--text-secondary)' }}>
                            <MessageSquare size={11} /> {agent.responseCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
