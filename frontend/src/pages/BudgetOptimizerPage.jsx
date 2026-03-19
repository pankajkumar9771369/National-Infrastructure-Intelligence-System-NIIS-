import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { runBudgetOptimizer, getOptimizationHistory } from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Layers, TrendingDown, IndianRupee, CheckCircle, AlertTriangle, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const RISK_COLORS = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };

const formatCrore = (v) => {
    const n = parseFloat(v);
    if (!n) return '₹0';
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K Cr`;
    if (n >= 1) return `₹${n.toFixed(1)} Cr`;
    return `₹${n.toFixed(2)} Cr`;
};

function KpiBox({ icon: Icon, label, value, color }) {
    return (
        <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <Icon size={20} color={color} style={{ marginBottom: 6 }} />
            <div style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        </div>
    );
}

function StructureRow({ s, index }) {
    const [open, setOpen] = useState(false);
    const riskColor = RISK_COLORS[s.risk_level] || '#64748b';
    return (
        <>
            <tr style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{index + 1}</td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.city}, {s.state?.slice(0, 2)}</td>
                <td><span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: 6, background: `${riskColor}20`, color: riskColor, fontWeight: 700 }}>{s.risk_level?.toUpperCase()}</span></td>
                <td style={{ fontWeight: 700, color: '#f97316' }}>{s.risk_score?.toFixed(1)}</td>
                <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCrore(s.cost_crore)}</td>
                <td style={{ color: '#3b82f6', fontSize: '0.8rem' }}>{s.maintenance_type?.replace('_', ' ')}</td>
                <td>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
            </tr>
            {open && (
                <tr><td colSpan={8} style={{ background: 'rgba(59,130,246,0.05)', padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 24, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>🛣 Route: <strong>{s.route_type?.replace('_', ' ')}</strong></span>
                        <span>🏭 Economic: <strong>{s.economic_importance}</strong></span>
                        <span>📉 Risk reduction: <strong style={{ color: '#10b981' }}>-{s.risk_reduction} pts</strong></span>
                        <span>📅 Planned: <strong>{s.planned_year}</strong></span>
                        {s.mandatory && <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠ Mandatory</span>}
                    </div>
                </td></tr>
            )}
        </>
    );
}

export default function BudgetOptimizerPage() {
    const { user } = useAuth();

    // Constraints form
    const [budget, setBudget] = useState('500');
    const [minCritical, setMinCritical] = useState('0');
    const [prioritizeNH, setPrioritizeNH] = useState(true);
    const [prioritizeEconomic, setPrioritizeEconomic] = useState(true);
    const [cityCap, setCityCap] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async (e) => {
        e.preventDefault();
        if (!budget || parseFloat(budget) <= 0) { toast.error('Enter a valid budget'); return; }
        setLoading(true);
        try {
            const data = await runBudgetOptimizer({
                budget_inr_crore: parseFloat(budget),
                min_critical_structures: parseInt(minCritical) || 0,
                prioritize_national_highways: prioritizeNH,
                prioritize_high_economic_importance: prioritizeEconomic,
                max_single_city_allocation_pct: cityCap ? parseFloat(cityCap) : null,
                year_filter: yearFilter ? parseInt(yearFilter) : null
            });
            setResult(data.data);
            toast.success(`Optimization complete — ${data.data.structures_selected} structures selected`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Optimization failed — is the ML service running?');
        } finally {
            setLoading(false);
        }
    };

    // Chart data
    const riskBar = result ? [
        { name: 'Before', risk: result.total_risk_before, fill: '#ef4444' },
        { name: 'After', risk: result.total_risk_after, fill: '#10b981' },
    ] : [];

    const cityAlloc = result ? Object.entries(result.city_allocation || {}).map(([city, crore]) => ({ name: city, value: parseFloat(crore) })) : [];
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IndianRupee size={22} color="#10b981" /> Budget Optimization Engine
                    </div>
                    <div className="page-subtitle">LP-based allocation — maximize risk reduction within budget constraints</div>
                </div>
            </div>

            {/* Constraints Panel */}
            <div className="card animate-in" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={16} color="#3b82f6" /> Budget Constraints
                </div>
                <form onSubmit={handleRun}>
                    <div className="grid-3" style={{ gap: 16, marginBottom: 16 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Total Budget (₹ Crore) *</label>
                            <input className="form-control" type="number" min="1" step="any" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 500" required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Min Critical Structures (must-include)</label>
                            <input className="form-control" type="number" min="0" value={minCritical} onChange={e => setMinCritical(e.target.value)} placeholder="0" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Max per City (% of Budget)</label>
                            <input className="form-control" type="number" min="0" max="100" value={cityCap} onChange={e => setCityCap(e.target.value)} placeholder="No cap" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Year Filter (2025–2030)</label>
                            <input className="form-control" type="number" min="2025" max="2030" value={yearFilter} onChange={e => setYearFilter(e.target.value)} placeholder="All years" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 22 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={prioritizeNH} onChange={e => setPrioritizeNH(e.target.checked)} />
                                Prioritize National Highways
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={prioritizeEconomic} onChange={e => setPrioritizeEconomic(e.target.checked)} />
                                Weight by Economic Importance
                            </label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.95rem', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <Zap size={15} /> {loading ? 'Optimizing...' : '  Run Optimization'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Results */}
            {result && (
                <div className="animate-in">
                    {/* KPI Row */}
                    <div className="grid-4" style={{ marginBottom: 20 }}>
                        <KpiBox icon={CheckCircle} label="Structures Selected" value={result.structures_selected} color="#10b981" />
                        <KpiBox icon={TrendingDown} label="Risk Reduction" value={`${result.risk_reduction_pct?.toFixed(1)}%`} color="#3b82f6" />
                        <KpiBox icon={IndianRupee} label="Total Allocated" value={formatCrore(result.total_cost_inr_crore)} color="#f59e0b" />
                        <KpiBox icon={Layers} label="Budget Utilization" value={`${result.budget_utilization_pct}%`} color="#8b5cf6" />
                    </div>

                    <div className="grid-2" style={{ marginBottom: 24 }}>
                        {/* Risk Before vs After */}
                        <div className="card">
                            <div className="section-title">National Risk: Before vs After</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                Composite risk score drops from <strong style={{ color: '#ef4444' }}>{result.total_risk_before?.toFixed(0)}</strong> → <strong style={{ color: '#10b981' }}>{result.total_risk_after?.toFixed(0)}</strong>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={riskBar} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v) => v.toFixed(1)} contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                                        {riskBar.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* City Allocation Pie */}
                        <div className="card">
                            <div className="section-title">Budget Allocation by City</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={cityAlloc} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                                        {cityAlloc.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{v}</span>} />
                                    <Tooltip formatter={(v) => formatCrore(v)} contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Year-wise Schedule */}
                    {result.year_wise_schedule && Object.keys(result.year_wise_schedule).length > 0 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="section-title" style={{ marginBottom: 14 }}>📅 Year-Wise Repair Schedule</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {Object.entries(result.year_wise_schedule).sort().map(([yr, data]) => (
                                    <div key={yr} style={{ flex: '1 1 150px', background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(59,130,246,0.15)' }}>
                                        <div style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{yr}</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{data.count} structures</div>
                                        <div style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>{formatCrore(data.cost_crore)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected Structures Table */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="section-header">
                            <div className="section-title">
                                <CheckCircle size={15} color="#10b981" style={{ marginRight: 6 }} />
                                Selected for Repair ({result.structures_selected} structures)
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Total: {formatCrore(result.total_cost_inr_crore)}</span>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr>
                                    <th>#</th><th>Structure</th><th>City</th><th>Risk Level</th>
                                    <th>Risk Score</th><th>Cost</th><th>Work Type</th><th></th>
                                </tr></thead>
                                <tbody>
                                    {result.selected_structures.map((s, i) => <StructureRow key={s.id} s={s} index={i} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Deferred Structures */}
                    {result.deferred_structures?.length > 0 && (
                        <div className="card">
                            <div className="section-header">
                                <div className="section-title"><AlertTriangle size={15} color="#f59e0b" style={{ marginRight: 6 }} />
                                    Deferred ({result.structures_deferred} structures — budget exhausted)
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                                {result.deferred_structures.slice(0, 12).map(s => (
                                    <div key={s.id} style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.name}</div>
                                        <div style={{ color: 'var(--text-muted)' }}>{s.city} · Risk: {s.risk_score?.toFixed(0)} · {formatCrore(s.cost_crore)}</div>
                                    </div>
                                ))}
                                {result.deferred_structures.length > 12 && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>+{result.deferred_structures.length - 12} more</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Traceability Footer */}
                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        🔍 <strong>Traceability:</strong> Run ID: <code>{result.run_id}</code> · Method: {result.optimization_method} ·
                        Logged in optimization_runs table · Run by: {user?.full_name || user?.username}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && (
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <IndianRupee size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <div style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>National Budget Optimizer</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                        Enter a budget (₹ Crore) and constraints above, then click <strong>Run Optimization</strong>.<br />
                        The LP engine will select structures to maximize national risk reduction.
                    </div>
                </div>
            )}
        </div>
    );
}
