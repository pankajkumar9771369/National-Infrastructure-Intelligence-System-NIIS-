import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getInfrastructures, triggerPrediction, deleteInfrastructure,
    getAllNotifications, createNotification, dismissNotification, deleteNotification
} from '../services/api';
import { Zap, Trash2, Bell, X, Plus, Eye, AlertTriangle, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import ModelVersionPanel from '../components/ModelVersionPanel';
import DynamicInfrastructureForm from '../components/DynamicInfrastructureForm';

const RISK_COLOR = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };
const SEV_COLOR = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
const TYPE_ICON = { maintenance: '🔧', closure: '⚠️', inspection: '🔍', alert: '🚨' };

const NOTIF_INIT = {
    title: '', message: '', infra_name: '', notify_year: new Date().getFullYear() + 1,
    type: 'maintenance', severity: 'info',
};

export default function AdminPage() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [infrastructures, setInfrastructures] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [bulkPredicting, setBulkPredicting] = useState(false);
    const [predictingId, setPredictingId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
    const [deleting, setDeleting] = useState(false);

    // Notification state
    const [notifications, setNotifications] = useState([]);
    const [notifForm, setNotifForm] = useState(NOTIF_INIT);
    const [showNotifForm, setShowNotifForm] = useState(false);
    const [submittingNotif, setSubmittingNotif] = useState(false);

    const reload = () =>
        getInfrastructures({ limit: 100 }).then(r => setInfrastructures(r.data || [])).catch(console.error);

    const reloadNotifs = () =>
        getAllNotifications().then(r => setNotifications(r.data || [])).catch(console.error);

    useEffect(() => {
        if (!isAdmin) { navigate('/dashboard'); return; }
        Promise.all([reload(), reloadNotifs()]).finally(() => setLoading(false));
    }, [isAdmin]);

    // ── Bulk predict ────────────────────────────────────────────────────────
    const runBulkPredictions = async () => {
        setBulkPredicting(true);
        let success = 0, failed = 0;
        for (const infra of infrastructures) {
            try { await triggerPrediction(infra.id); success++; } catch { failed++; }
        }
        toast.success(`Bulk ML: ${success} done, ${failed} failed`);
        setBulkPredicting(false);
        reload();
    };

    // ── Single predict ───────────────────────────────────────────────────────
    const runSinglePrediction = async (id) => {
        setPredictingId(id);
        try {
            await triggerPrediction(id);
            toast.success('Prediction updated!');
            reload();
        } catch { toast.error('Prediction failed'); }
        finally { setPredictingId(null); }
    };

    // ── Delete with confirmation ─────────────────────────────────────────────
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteInfrastructure(deleteTarget.id);
            toast.success(`Deleted: ${deleteTarget.name}`);
            setDeleteTarget(null);
            reload();
        } catch (err) {
            console.error('Delete error:', err);
            const msg = err.response?.data?.error || err.message || 'Delete failed';
            toast.error(`Delete failed: ${msg}`);
        } finally { setDeleting(false); }
    };

    // ── Create notification ──────────────────────────────────────────────────
    const submitNotif = async (e) => {
        e.preventDefault();
        if (!notifForm.title || !notifForm.message) {
            toast.error('Title and message are required');
            return;
        }
        setSubmittingNotif(true);
        try {
            await createNotification(notifForm);
            toast.success('📢 Notification published!');
            setNotifForm(NOTIF_INIT);
            setShowNotifForm(false);
            reloadNotifs();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to publish');
        } finally { setSubmittingNotif(false); }
    };

    const nf = (k) => (e) => setNotifForm(p => ({ ...p, [k]: e.target.value }));

    return (
        <div>
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="page-header">
                <div>
                    <div className="page-title">Admin Panel</div>
                    <div className="page-subtitle">Manage infrastructure records, predictions, and public notifications</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" onClick={runBulkPredictions} disabled={bulkPredicting}>
                        <Zap size={15} /> {bulkPredicting ? 'Running...' : `Bulk ML Predict (${infrastructures.length})`}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                        {showForm ? '✕ Cancel' : '＋ Add Structure'}
                    </button>
                </div>
            </div>

            {/* ── Add Form ─────────────────────────────────────────────────── */}
            {showForm && (
                <DynamicInfrastructureForm
                    onSuccess={() => { setShowForm(false); reload(); }}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {/* ── Stats Row ────────────────────────────────────────────────── */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Structures', value: infrastructures.length, color: '#3b82f6' },
                    { label: 'With ML Predictions', value: infrastructures.filter(i => i.predicted_maintenance_year).length, color: '#10b981' },
                    { label: 'Pending Prediction', value: infrastructures.filter(i => !i.predicted_maintenance_year).length, color: '#f59e0b' },
                    { label: 'Critical Risk', value: infrastructures.filter(i => i.risk_level === 'critical').length, color: '#ef4444' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
                        <div style={{ fontFamily: 'Outfit', fontSize: '2rem', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* ── Structure Table ──────────────────────────────────────────── */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Area</th>
                            <th>Age</th>
                            <th>Risk Level</th>
                            <th>Risk Score</th>
                            <th>Budget (USD)</th>
                            <th>ML Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="10"><div className="loading-spinner" style={{ padding: 24 }}><div className="spinner" /></div></td></tr>
                        ) : infrastructures.map(infra => (
                            <tr key={infra.id}>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>#{infra.id}</td>
                                <td style={{ fontWeight: 600 }}>{infra.name}</td>
                                <td><span className="tag" style={{ textTransform: 'capitalize' }}>{infra.type}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{infra.area}</td>
                                <td>{infra.age_years}yr</td>
                                <td><span className={`risk-badge ${infra.risk_level || 'low'}`}>{infra.risk_level || '—'}</span></td>
                                <td style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem', color: RISK_COLOR[infra.risk_level] || 'var(--text-muted)' }}>
                                    {infra.risk_score != null ? parseFloat(infra.risk_score).toFixed(1) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td style={{ fontFamily: 'Outfit', fontWeight: 600, color: '#a855f7' }}>
                                    {infra.estimated_cost_usd
                                        ? `$${parseFloat(infra.estimated_cost_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td>
                                    {infra.predicted_maintenance_year
                                        ? <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>✓ {infra.predicted_maintenance_year}</span>
                                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Not predicted</span>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {/* View */}
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/infrastructures/${infra.id}`); }}
                                        >
                                            View
                                        </button>
                                        {/* Re-predict */}
                                        <button
                                            className="btn btn-outline btn-sm"
                                            title="Run ML Prediction"
                                            disabled={predictingId === infra.id || bulkPredicting}
                                            onClick={(e) => { e.stopPropagation(); runSinglePrediction(infra.id); }}
                                            style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', minWidth: 34 }}
                                        >
                                            {predictingId === infra.id ? '…' : <Zap size={13} />}
                                        </button>
                                        {/* Delete */}
                                        <button
                                            className="btn btn-outline btn-sm"
                                            title="Delete Structure"
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget({ id: infra.id, name: infra.name }); }}
                                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', minWidth: 34 }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Notifications Section ────────────────────────────────────── */}
            <div style={{ marginTop: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Bell size={18} color="#f59e0b" />
                        <div className="section-title" style={{ fontSize: '1rem', margin: 0 }}>Public Notifications</div>
                        <span style={{
                            background: '#f59e0b', color: '#000', borderRadius: 999,
                            fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px',
                        }}>{notifications.filter(n => n.is_active).length} active</span>
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowNotifForm(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Plus size={14} /> {showNotifForm ? 'Cancel' : 'New Announcement'}
                    </button>
                </div>

                {/* Create notification form */}
                {showNotifForm && (
                    <div className="card animate-in" style={{ marginBottom: 20, border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, color: '#f59e0b', fontSize: '0.9rem' }}>
                            📢 Create Public Announcement
                        </div>
                        <form onSubmit={submitNotif}>
                            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input className="form-control" value={notifForm.title}
                                        onChange={nf('title')} placeholder="e.g. Howrah Bridge Maintenance — 2026" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Structure Name (optional)</label>
                                    <input className="form-control" value={notifForm.infra_name}
                                        onChange={nf('infra_name')} placeholder="e.g. Howrah Bridge" />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Message *</label>
                                <textarea className="form-control" rows="3" value={notifForm.message}
                                    onChange={nf('message')}
                                    placeholder="Howrah Bridge will undergo major structural maintenance in 2026. Commuters are advised to plan alternate routes. Work will run Jan–Apr 2026."
                                    required style={{ resize: 'vertical' }} />
                            </div>
                            <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Planned Year</label>
                                    <input className="form-control" type="number" min="2025" max="2050"
                                        value={notifForm.notify_year} onChange={nf('notify_year')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-control" value={notifForm.type} onChange={nf('type')}>
                                        <option value="maintenance">🔧 Maintenance</option>
                                        <option value="closure">⚠️ Closure</option>
                                        <option value="inspection">🔍 Inspection</option>
                                        <option value="alert">🚨 Alert</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Severity</label>
                                    <select className="form-control" value={notifForm.severity} onChange={nf('severity')}>
                                        <option value="info">ℹ️ Info</option>
                                        <option value="warning">⚡ Warning</option>
                                        <option value="critical">🔴 Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowNotifForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingNotif}
                                    style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}>
                                    {submittingNotif ? 'Publishing…' : '📢 Publish Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Notifications list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {notifications.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                            No announcements yet. Create one above to alert users about upcoming maintenance.
                        </div>
                    )}
                    {notifications.map(n => (
                        <div key={n.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 14,
                            background: n.is_active ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                            border: `1px solid ${n.is_active ? `${SEV_COLOR[n.severity]}40` : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: 10, padding: '12px 16px',
                            opacity: n.is_active ? 1 : 0.5,
                        }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{TYPE_ICON[n.type] || '📢'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</span>
                                    {n.notify_year && (
                                        <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, fontSize: '0.7rem', padding: '1px 7px', color: 'var(--text-muted)' }}>
                                            {n.notify_year}
                                        </span>
                                    )}
                                    <span style={{
                                        fontSize: '0.68rem', fontWeight: 700, padding: '1px 8px',
                                        borderRadius: 6, background: `${SEV_COLOR[n.severity]}20`,
                                        color: SEV_COLOR[n.severity],
                                    }}>{n.severity}</span>
                                    {!n.is_active && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>• dismissed</span>}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{n.message}</div>
                                {n.infra_name && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {n.infra_name}</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button
                                    title={n.is_active ? 'Dismiss from users' : 'Restore'}
                                    onClick={async () => { await dismissNotification(n.id); reloadNotifs(); }}
                                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                                >
                                    {n.is_active ? <Eye size={13} /> : '↺'}
                                </button>
                                <button
                                    title="Delete permanently"
                                    onClick={async () => { await deleteNotification(n.id); reloadNotifs(); toast.success('Deleted'); }}
                                    style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', color: '#ef4444' }}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Model Intelligence ───────────────────────────────────────── */}
            <div style={{ marginTop: 32 }}>
                <div className="section-title" style={{ marginBottom: 16, fontSize: '1rem' }}>🤖 Model Intelligence</div>
                <ModelVersionPanel />
            </div>

            {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────── */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div className="card animate-in" style={{
                        maxWidth: 420, width: '90%', border: '1px solid rgba(239,68,68,0.3)',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={20} color="#ef4444" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Delete Structure?</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>This action cannot be undone</div>
                            </div>
                        </div>
                        <div style={{
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                            borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: '0.88rem',
                        }}>
                            <strong style={{ color: '#ef4444' }}>{deleteTarget.name}</strong> and all associated data (risk scores, ML predictions, budgets, sensor readings) will be permanently deleted.
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700 }}
                            >
                                {deleting ? 'Deleting…' : '🗑 Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
