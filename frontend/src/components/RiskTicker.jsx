import { useEffect, useState } from 'react';
import { getInfrastructures } from '../services/api';
import { useNavigate } from 'react-router-dom';

const RISK_COLOR = {
    critical: { bg: '#ef4444', text: '#fff' },
    high: { bg: '#f97316', text: '#fff' },
    moderate: { bg: '#f59e0b', text: '#000' },
    low: { bg: '#10b981', text: '#fff' },
};

const ICON = { critical: '🔴', high: '🟠', moderate: '🟡', low: '🟢' };

export default function RiskTicker() {
    const [items, setItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        getInfrastructures({ limit: 100 })
            .then(r => {
                const sorted = (r.data || [])
                    .filter(i => i.risk_score != null)
                    .sort((a, b) => parseFloat(b.risk_score) - parseFloat(a.risk_score))
                    .slice(0, 20);
                setItems(sorted);
            })
            .catch(() => { });
    }, []);

    if (items.length === 0) return null;

    // Duplicate items so the marquee loops seamlessly
    const doubled = [...items, ...items];

    return (
        <div style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            height: 34,
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'sticky',
            top: 0,
            zIndex: 200,
            flexShrink: 0,
        }}>
            {/* Label badge */}
            <div style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 10px',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                borderRight: '1px solid rgba(255,255,255,0.1)',
                textTransform: 'uppercase',
            }}>
                ⚡ LIVE ALERTS
            </div>

            {/* Scrolling track */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                    display: 'flex',
                    gap: 0,
                    animation: `ticker-scroll ${items.length * 4}s linear infinite`,
                    whiteSpace: 'nowrap',
                    willChange: 'transform',
                }}>
                    {doubled.map((infra, i) => {
                        const col = RISK_COLOR[infra.risk_level] || RISK_COLOR.low;
                        const score = parseFloat(infra.risk_score).toFixed(1);
                        return (
                            <span
                                key={i}
                                onClick={() => navigate(`/infrastructures/${infra.id}`)}
                                title={`${infra.name} — Risk ${score} — Click to view`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '0 20px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    borderRight: '1px solid rgba(255,255,255,0.07)',
                                    height: 34,
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: '0.8rem' }}>{ICON[infra.risk_level] || '⚪'}</span>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{infra.name}</span>
                                <span style={{
                                    background: col.bg, color: col.text,
                                    borderRadius: 4, padding: '1px 6px',
                                    fontSize: '0.65rem', fontWeight: 800,
                                }}>
                                    {score}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                    {infra.area}
                                </span>
                                {infra.predicted_maintenance_year && (
                                    <span style={{ color: '#60a5fa', fontSize: '0.68rem' }}>
                                        maint. {infra.predicted_maintenance_year}
                                    </span>
                                )}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
