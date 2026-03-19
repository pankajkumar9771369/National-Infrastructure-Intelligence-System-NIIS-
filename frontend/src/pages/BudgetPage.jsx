import { useEffect, useState } from 'react';
import { getBudgets, getBudgetSummary } from '../services/api';
import { DollarSign, AlertTriangle, Calendar, Wrench } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' };
const TYPE_COLORS = { replacement: '#ef4444', major_repair: '#f97316', preventive: '#f59e0b', routine: '#10b981' };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: '#3b82f6', fontWeight: 600 }}>
                    Budget: ${(p.value / 1000000).toFixed(2)}M
                </div>
            ))}
        </div>
    );
};

export default function BudgetPage() {
    const [budgets, setBudgets] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ priority: '', maintenance_type: '' });

    useEffect(() => {
        Promise.all([getBudgets(filter), getBudgetSummary()])
            .then(([b, s]) => { setBudgets(b.data); setSummary(s); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filter]);

    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.estimated_cost_usd || 0), 0);
    const byYearData = summary?.by_year?.map(r => ({ year: r.planned_year, budget: parseFloat(r.total_cost), count: parseInt(r.structure_count) })) || [];

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Budget Planning Module</div>
                    <div className="page-subtitle">Maintenance cost estimation across all risk tiers</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                        ${(totalBudget / 1000000).toFixed(2)}M
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Estimated Budget</div>
                </div>
            </div>

            {/* Budget KPIs */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Replacement Projects', key: 'replacement', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                    { label: 'Major Repairs', key: 'major_repair', icon: Wrench, color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                    { label: 'Preventive Maint.', key: 'preventive', icon: Calendar, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                    { label: 'Routine Maint.', key: 'routine', icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                ].map(({ label, key, icon: Icon, color, bg }) => {
                    const tier = summary?.by_tier?.find(t => t.maintenance_type === key);
                    const cost = parseFloat(tier?.total_cost || 0);
                    return (
                        <div key={key} className="kpi-card" style={{ '--kpi-color': color, '--kpi-bg': bg }}>
                            <div className="kpi-icon"><Icon size={20} /></div>
                            <div className="kpi-value">${(cost / 1000).toFixed(0)}K</div>
                            <div className="kpi-label">{label}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{tier?.count || 0} structures</div>
                        </div>
                    );
                })}
            </div>

            {/* By Year Chart */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title">Planned Budget by Year</div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byYearData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="budget" name="Budget" radius={[6, 6, 0, 0]}>
                            {byYearData.map((entry, i) => {
                                const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981'];
                                return <Cell key={i} fill={colors[i % colors.length]} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Filters */}
            <div className="filter-bar" style={{ marginBottom: 16 }}>
                <select className="form-control" style={{ width: 160 }} value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <select className="form-control" style={{ width: 180 }} value={filter.maintenance_type} onChange={e => setFilter(f => ({ ...f, maintenance_type: e.target.value }))}>
                    <option value="">All Maintenance Types</option>
                    <option value="replacement">Replacement</option>
                    <option value="major_repair">Major Repair</option>
                    <option value="preventive">Preventive</option>
                    <option value="routine">Routine</option>
                </select>
            </div>

            {/* Budget Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Structure</th>
                            <th>Type</th>
                            <th>Area</th>
                            <th>Risk</th>
                            <th>Maintenance Type</th>
                            <th>Priority</th>
                            <th>Planned Year</th>
                            <th>Estimated Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8"><div className="loading-spinner" style={{ padding: 30 }}><div className="spinner" /></div></td></tr>
                        ) : budgets.map((b, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 600 }}>{b.name}</td>
                                <td><span className="tag" style={{ textTransform: 'capitalize' }}>{b.type}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{b.area}</td>
                                <td><span className={`risk-badge ${b.risk_level}`}>{b.risk_level}</span></td>
                                <td>
                                    <span style={{ color: TYPE_COLORS[b.maintenance_type], textTransform: 'capitalize', fontWeight: 500, fontSize: '0.85rem' }}>
                                        {b.maintenance_type?.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ color: PRIORITY_COLORS[b.priority], fontWeight: 600, textTransform: 'capitalize' }}>
                                        {b.priority}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{b.planned_year}</td>
                                <td style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--accent-purple)' }}>
                                    ${parseFloat(b.estimated_cost_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
