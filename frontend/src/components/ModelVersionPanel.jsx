import { useState, useEffect } from 'react';
import { getModelVersions, getLatestModelVersion, triggerRetrain, getDriftReport } from '../services/api';
import { RefreshCw, Shield, TrendingUp, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * NIIS Model Intelligence Panel
 * Shows model version history, live accuracy metrics, drift alerts,
 * and allows admin-triggered retraining.
 */
export default function ModelVersionPanel() {
    const [versions, setVersions] = useState([]);
    const [latest, setLatest] = useState(null);
    const [driftReport, setDriftReport] = useState(null);
    const [retraining, setRetraining] = useState(false);
    const [loading, setLoading] = useState(true);

    const isAdmin = localStorage.getItem('role') === 'admin';

    const load = async () => {
        setLoading(true);
        try {
            const [v, l] = await Promise.all([getModelVersions(), getLatestModelVersion()]);
            setVersions(v.data || []);
            setLatest(l.data || null);
        } catch (e) {
            toast.error('Failed to load model versions');
        } finally { setLoading(false); }
    };

    const runRetrain = async () => {
        setRetraining(true);
        toast.loading('Retraining models — this takes ~30 seconds…', { id: 'retrain' });
        try {
            const r = await triggerRetrain({ trigger: 'manual', notes: 'Admin-triggered from NIIS dashboard' });
            toast.dismiss('retrain');
            if (r.data?.auto_promoted) {
                toast.success(`New model promoted! R² improved by ${r.data.improvement?.toFixed(4)}`);
            } else {
                toast(`Retraining complete. Model NOT promoted (improvement: ${r.data?.improvement?.toFixed(4)})`, { icon: 'ℹ️' });
            }
            load();
        } catch (e) {
            toast.dismiss('retrain');
            toast.error('Retraining failed: ' + (e.response?.data?.error || e.message));
        } finally { setRetraining(false); }
    };

    const runDriftCheck = async () => {
        try {
            const r = await getDriftReport();
            setDriftReport(r.data);
        } catch (e) {
            toast.error('Drift check failed — need inspection data');
        }
    };

    useEffect(() => { load(); }, []);

    const liveM = latest?.live_metrics?.metrics;
    const dbV = latest?.db_version;

    if (loading) return (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div className="spinner" style={{ margin: 'auto' }} /> Loading model intelligence...
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="page-title" style={{ fontSize: '1.1rem' }}>🤖 Model Intelligence Registry</div>
                    <div className="page-subtitle">Real-Time Learning & Drift Detection</div>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline btn-sm" onClick={runDriftCheck}>
                            <AlertTriangle size={13} /> Drift Check
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={runRetrain} disabled={retraining}>
                            <RefreshCw size={13} className={retraining ? 'spin' : ''} />
                            {retraining ? 'Retraining…' : 'Retrain Now'}
                        </button>
                    </div>
                )}
            </div>

            {/* Active Model Metrics */}
            {dbV && (
                <div className="card">
                    <div className="section-title"><CheckCircle size={14} color="#10b981" style={{ marginRight: 6 }} />Active Model — {dbV.version}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12 }}>
                        {[
                            { label: 'Condition R²', value: dbV.condition_r2, color: '#3b82f6' },
                            { label: 'Maintenance R²', value: dbV.maintenance_r2, color: '#8b5cf6' },
                            { label: 'Deterioration R²', value: dbV.deterioration_r2, color: '#06b6d4' },
                        ].map(m => (
                            <div key={m.label} style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{m.label}</div>
                                <div style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 800, color: m.color }}>
                                    {m.value ? (m.value * 100).toFixed(1) : '—'}
                                    <span style={{ fontSize: '0.85rem' }}>%</span>
                                </div>
                                <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                                    <div style={{ width: `${(m.value || 0) * 100}%`, height: '100%', background: m.color, borderRadius: 4, transition: 'width 0.8s' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
                        <div className="stat-row"><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Training Records</span><span style={{ fontWeight: 700 }}>{dbV.training_records?.toLocaleString()}</span></div>
                        <div className="stat-row"><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Trained At</span><span style={{ fontWeight: 600 }}>{new Date(dbV.trained_at).toLocaleString('en-IN')}</span></div>
                        <div className="stat-row"><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Notes</span><span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{dbV.notes}</span></div>
                    </div>
                </div>
            )}

            {/* Drift Report */}
            {driftReport && (
                <div className="card" style={{ border: `1px solid ${driftReport.drift_detected ? '#ef4444' : '#10b981'}20` }}>
                    <div className="section-title">
                        {driftReport.drift_detected
                            ? <AlertTriangle size={14} color="#ef4444" style={{ marginRight: 6 }} />
                            : <Shield size={14} color="#10b981" style={{ marginRight: 6 }} />}
                        Drift Detection Report
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
                        {[
                            { label: 'MAE', value: driftReport.mae, unit: 'pts', color: driftReport.mae > 1.5 ? '#ef4444' : '#10b981' },
                            { label: 'Bias', value: driftReport.bias, unit: 'pts', color: Math.abs(driftReport.bias) > 1 ? '#f59e0b' : '#10b981' },
                            { label: 'Std Dev', value: driftReport.std, unit: '', color: '#8b5cf6' },
                            { label: 'Compared', value: driftReport.n_compared, unit: ' pairs', color: '#3b82f6' },
                        ].map(m => (
                            <div key={m.label} style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.label}</div>
                                <div style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800, color: m.color }}>
                                    {m.value ?? '—'}{m.unit}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: driftReport.drift_detected ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', fontSize: '0.88rem', fontWeight: 600 }}>
                        {driftReport.recommendation}
                    </div>
                </div>
            )}

            {/* Version History Table */}
            {versions.length > 0 && (
                <div className="card">
                    <div className="section-title"><Database size={14} style={{ marginRight: 6 }} />Version History</div>
                    <div className="table-wrapper" style={{ marginTop: 12 }}>
                        <table>
                            <thead><tr>
                                <th>Version</th><th>Status</th><th>Condition R²</th>
                                <th>Maintenance R²</th><th>Detr. R²</th>
                                <th>Records</th><th>Trained</th>
                            </tr></thead>
                            <tbody>
                                {versions.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6' }}>{v.version}</td>
                                        <td>
                                            {v.is_active
                                                ? <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Active</span>
                                                : <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Archived</span>}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{v.condition_r2 ? (v.condition_r2 * 100).toFixed(1) + '%' : '—'}</td>
                                        <td style={{ fontWeight: 700 }}>{v.maintenance_r2 ? (v.maintenance_r2 * 100).toFixed(1) + '%' : '—'}</td>
                                        <td style={{ fontWeight: 700 }}>{v.deterioration_r2 ? (v.deterioration_r2 * 100).toFixed(1) + '%' : '—'}</td>
                                        <td>{v.training_records?.toLocaleString() || '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(v.trained_at).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
