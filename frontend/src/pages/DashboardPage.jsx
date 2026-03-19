import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, AlertTriangle, DollarSign, Activity,
    TrendingDown, CheckCircle, Clock, Zap
} from 'lucide-react';
import { getDashboardStats } from '../services/api';
import NotificationBanner from '../components/NotificationBanner';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const RISK_COLORS = {
    critical: '#ef4444',
    high: '#f97316',
    moderate: '#f59e0b',
    low: '#10b981',
};

const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];

function KpiCard({ icon: Icon, value, label, color, bg, change }) {
    return (
        <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-bg': bg }}>
            <div className="kpi-icon"><Icon size={20} /></div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
            {change && <div className="kpi-change" style={{ background: `${color}20`, color }}>{change}</div>}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getDashboardStats()
            .then(data => setStats(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner" /><span>Loading dashboard...</span></div>;
    if (!stats) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Failed to load stats. Is the backend running?</div>;

    const { summary, by_type = [], by_area = [] } = stats;

    const pieData = [
        { name: 'Critical', value: parseInt(summary.critical_count) },
        { name: 'High', value: parseInt(summary.high_count) },
        { name: 'Moderate', value: parseInt(summary.moderate_count) },
        { name: 'Low', value: parseInt(summary.low_count) },
    ].filter(d => d.value > 0);

    const formatBudget = (val) => {
        const n = parseFloat(val);
        if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
        if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
        return `$${n}`;
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">City Infrastructure Overview</div>
                    <div className="page-subtitle">Bangalore Smart City — Real-time health monitoring · {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/heatmap')}>
                    <Activity size={15} /> View Heatmap
                </button>
            </div>

            {/* Public notifications from admin */}
            <NotificationBanner />

            {/* KPI Row */}
            <div className="kpi-grid">
                <KpiCard icon={Building2} value={summary.total_structures} label="Total Structures" color="#3b82f6" bg="rgba(59,130,246,0.12)" />
                <KpiCard icon={AlertTriangle} value={summary.critical_count} label="Critical Risk" color="#ef4444" bg="rgba(239,68,68,0.12)" change="Urgent" />
                <KpiCard icon={TrendingDown} value={`${parseFloat(summary.avg_risk_score || 0).toFixed(1)}`} label="Avg Risk Score" color="#f59e0b" bg="rgba(245,158,11,0.12)" />
                <KpiCard icon={CheckCircle} value={`${parseFloat(summary.avg_health_score || 0).toFixed(1)}%`} label="Avg Health Score" color="#10b981" bg="rgba(16,185,129,0.12)" />
                <KpiCard icon={DollarSign} value={formatBudget(summary.total_budget_usd)} label="Total Budget Est." color="#8b5cf6" bg="rgba(139,92,246,0.12)" />
                <KpiCard icon={Clock} value={summary.urgent_2025} label="Urgent 2025" color="#f97316" bg="rgba(249,115,22,0.12)" change="This year" />
                <KpiCard icon={Building2} value={summary.total_bridges} label="Bridges" color="#06b6d4" bg="rgba(6,182,212,0.12)" />
                <KpiCard icon={Zap} value={summary.earliest_maintenance || '—'} label="Next Maintenance" color="#a855f7" bg="rgba(168,85,247,0.12)" />
            </div>

            {/* Charts Row */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                    <div className="section-title">Risk by Structure Type</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={by_type} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                            <XAxis dataKey="type" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="avg_risk" name="Avg Risk" radius={[4, 4, 0, 0]}>
                                {by_type.map((entry, index) => (
                                    <Cell key={index} fill={entry.avg_risk >= 75 ? '#ef4444' : entry.avg_risk >= 55 ? '#f97316' : entry.avg_risk >= 35 ? '#f59e0b' : '#10b981'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="section-title">Risk Level Distribution</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                            <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{v}</span>} />
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Risk Areas */}
            <div className="card">
                <div className="section-header">
                    <div className="section-title">Risk by Area — Top 10</div>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/infrastructures')}>View All</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {by_area.map((area, i) => {
                        const riskPct = parseFloat(area.avg_risk);
                        const color = riskPct >= 75 ? RISK_COLORS.critical : riskPct >= 55 ? RISK_COLORS.high : riskPct >= 35 ? RISK_COLORS.moderate : RISK_COLORS.low;
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 100, fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{area.area}</div>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div className="progress-fill" style={{ width: `${riskPct}%`, background: color }} />
                                </div>
                                <div style={{ width: 40, textAlign: 'right', fontSize: '0.82rem', fontWeight: 600, color }}>{riskPct.toFixed(0)}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 60 }}>{area.count} structures</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
