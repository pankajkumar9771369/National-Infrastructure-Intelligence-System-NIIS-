import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, Wrench, Eye } from 'lucide-react';
import { getNotifications } from '../services/api';

const TYPE_ICON = {
    maintenance: <Wrench size={14} />,
    closure: <AlertTriangle size={14} />,
    inspection: <Eye size={14} />,
    alert: <AlertTriangle size={14} />,
};

const SEVERITY_STYLE = {
    critical: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', icon: '#ef4444', label: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', icon: '#f59e0b', label: '#f59e0b' },
    info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', icon: '#3b82f6', label: '#60a5fa' },
};

export default function NotificationBanner() {
    const [notifications, setNotifications] = useState([]);
    const [dismissed, setDismissed] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]'); }
        catch { return []; }
    });
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        getNotifications()
            .then(r => setNotifications(r.data || []))
            .catch(() => { });
    }, []);

    const visible = notifications.filter(n => !dismissed.includes(n.id));
    if (visible.length === 0) return null;

    const dismissOne = (id) => {
        const next = [...dismissed, id];
        setDismissed(next);
        localStorage.setItem('dismissed_notifs', JSON.stringify(next));
    };

    const shown = expanded ? visible : visible.slice(0, 2);

    return (
        <div style={{ marginBottom: 20 }}>
            {/* Banner header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
            }}>
                <Bell size={16} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Infrastructure Alerts & Notices
                </span>
                <span style={{
                    background: '#ef4444', color: '#fff', borderRadius: '999px',
                    fontSize: '0.68rem', fontWeight: 800, padding: '1px 7px', lineHeight: '18px',
                }}>
                    {visible.length}
                </span>
            </div>

            {/* Notification cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shown.map(n => {
                    const s = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
                    return (
                        <div key={n.id} style={{
                            background: s.bg, border: `1px solid ${s.border}`,
                            borderRadius: 12, padding: '12px 16px',
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            animation: 'fadeIn 0.3s ease',
                        }}>
                            <span style={{ color: s.icon, marginTop: 2, flexShrink: 0 }}>
                                {TYPE_ICON[n.type] || <Bell size={14} />}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                        {n.title}
                                    </span>
                                    {n.notify_year && (
                                        <span style={{
                                            background: s.border, color: s.label,
                                            borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                            padding: '1px 7px',
                                        }}>
                                            {n.notify_year}
                                        </span>
                                    )}
                                    {n.infra_name && (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            📍 {n.infra_name}
                                            {n.city ? `, ${n.city}` : ''}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {n.message}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    {new Date(n.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                </div>
                            </div>
                            <button
                                onClick={() => dismissOne(n.id)}
                                title="Dismiss"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: 2, flexShrink: 0,
                                    borderRadius: 4, lineHeight: 1,
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
                {visible.length > 2 && (
                    <button
                        onClick={() => setExpanded(e => !e)}
                        style={{
                            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600,
                            borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                            alignSelf: 'flex-start',
                        }}
                    >
                        {expanded ? '▲ Show less' : `▼ Show ${visible.length - 2} more alerts`}
                    </button>
                )}
            </div>
        </div>
    );
}
