import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, RefreshCw } from 'lucide-react';

const PAGE_TITLES = {
    '/dashboard': { title: 'Dashboard', subtitle: 'City infrastructure overview' },
    '/infrastructures': { title: 'Infrastructures', subtitle: 'Monitor bridges, roads, and overpasses' },
    '/heatmap': { title: 'City Risk Heatmap', subtitle: 'Geospatial risk visualization' },
    '/budget': { title: 'Budget Planner', subtitle: 'Maintenance cost estimation for 2025–2028' },
    '/admin': { title: 'Admin Panel', subtitle: 'Manage infrastructure data' },
};

export default function Topbar() {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const baseRoute = '/' + pathname.split('/')[1];
    const page = PAGE_TITLES[baseRoute] || { title: 'Dashboard', subtitle: '' };

    return (
        <div className="topbar">
            <div>
                <div className="topbar-title">{page.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{page.subtitle}</div>
            </div>
            <div className="topbar-actions">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--accent-green)' }}>
                    <span className="sensor-dot" />
                    Live Data
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
                    <RefreshCw size={13} /> Refresh
                </button>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem', color: 'white'
                }}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
            </div>
        </div>
    );
}
