import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import { getInfrastructures } from '../services/api';
import NotificationBanner from '../components/NotificationBanner';

const TYPE_ICONS = { bridge: '🌉', road: '🛣️', overpass: '🏗️', tunnel: '🚇', flyover: '🛤️' };

function RiskBadge({ level }) {
    return <span className={`risk-badge ${level}`}>{level}</span>;
}

function HealthBar({ score }) {
    const color = score >= 65 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="progress-bar" style={{ width: 80 }}>
                <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{parseFloat(score).toFixed(0)}%</span>
        </div>
    );
}

export default function InfrastructurePage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', area: '', risk_level: '', urgency: '', search: '', page: 1 });
    const navigate = useNavigate();

    const fetchData = () => {
        setLoading(true);
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        getInfrastructures(params)
            .then(res => { setData(res.data); setTotal(res.total); })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [filters]);

    const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 1 }));

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Infrastructure Registry</div>
                    <div className="page-subtitle">{total} structures monitored · Bangalore City</div>
                </div>
            </div>

            {/* Public maintenance alerts */}
            <NotificationBanner />

            {/* Filter Bar */}
            <div className="filter-bar">
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 34 }} placeholder="Search by name..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 140 }} value={filters.type} onChange={e => setFilter('type', e.target.value)}>
                    <option value="">All Types</option>
                    <option value="bridge">Bridge</option>
                    <option value="road">Road</option>
                    <option value="overpass">Overpass</option>
                    <option value="flyover">Flyover</option>
                    <option value="tunnel">Tunnel</option>
                </select>
                <select className="form-control" style={{ width: 150 }} value={filters.risk_level} onChange={e => setFilter('risk_level', e.target.value)}>
                    <option value="">All Risk Levels</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="moderate">Moderate</option>
                    <option value="low">Low</option>
                </select>
                <select className="form-control" style={{ width: 140 }} value={filters.urgency} onChange={e => setFilter('urgency', e.target.value)}>
                    <option value="">All Urgency</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={fetchData}>
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Area</th>
                            <th>Age (yrs)</th>
                            <th>Material</th>
                            <th>Risk Score</th>
                            <th>Health</th>
                            <th>Risk Level</th>
                            <th>Maint. Year</th>
                            <th>Budget Est.</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="12"><div className="loading-spinner" style={{ padding: 30 }}><div className="spinner" /><span>Loading...</span></div></td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan="12" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No structures found</td></tr>
                        ) : data.map((infra, i) => (
                            <tr key={infra.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/infrastructures/${infra.id}`)}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>#{infra.id}</td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{TYPE_ICONS[infra.type]} {infra.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Built {infra.construction_year}</div>
                                </td>
                                <td><span className="tag" style={{ textTransform: 'capitalize' }}>{infra.type}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{infra.area}</td>
                                <td style={{ color: infra.age_years > 40 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{infra.age_years}</td>
                                <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{infra.material}</td>
                                <td style={{ fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                                    <span style={{ color: parseFloat(infra.risk_score) >= 75 ? '#ef4444' : parseFloat(infra.risk_score) >= 55 ? '#f97316' : parseFloat(infra.risk_score) >= 35 ? '#f59e0b' : '#10b981' }}>
                                        {parseFloat(infra.risk_score || 0).toFixed(1)}
                                    </span>
                                </td>
                                <td><HealthBar score={parseFloat(infra.health_score || 0)} /></td>
                                <td><RiskBadge level={infra.risk_level || 'low'} /></td>
                                <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{infra.predicted_maintenance_year || '—'}</td>
                                <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                                    {infra.estimated_cost_usd ? `$${(parseFloat(infra.estimated_cost_usd) / 1000).toFixed(0)}K` : '—'}
                                </td>
                                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
