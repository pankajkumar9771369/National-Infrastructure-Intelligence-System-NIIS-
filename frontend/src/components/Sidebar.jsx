import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Building2, Map, DollarSign,
    ShieldAlert, LogOut, Settings, Activity, IndianRupee, Flag, Zap
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Infrastructures', to: '/infrastructures', icon: Building2 },
    { label: 'City Heatmap', to: '/heatmap', icon: Map },
    { label: 'Budget Planner', to: '/budget', icon: DollarSign },
    { label: 'Risk Simulator', to: '/simulator', icon: Zap },
];

const adminNavItems = [
    { label: 'Budget Optimizer', to: '/optimizer', icon: IndianRupee },
];

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ShieldAlert size={18} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '0.95rem', marginBottom: 1 }}>NIIS</h2>
                        <span>National Infra Intelligence</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {navItems.map(({ label, to, icon: Icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Icon size={17} />
                        {label}
                    </NavLink>
                ))}

                {isAdmin && (
                    <>
                        <div className="nav-section-label" style={{ marginTop: 8 }}>Admin</div>
                        <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Settings size={17} />
                            Admin Panel
                        </NavLink>
                        {adminNavItems.map(({ label, to, icon: Icon }) => (
                            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Icon size={17} />
                                {label}
                            </NavLink>
                        ))}
                    </>
                )}

                <div className="nav-section-label" style={{ marginTop: 8 }}>Status</div>
                <div className="nav-link" style={{ cursor: 'default' }}>
                    <Activity size={17} color="var(--accent-green)" />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>All Systems Live</span>
                    <span className="sensor-dot" style={{ marginLeft: 'auto' }} />
                </div>
            </nav>

            <div className="sidebar-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, color: 'white'
                    }}>
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
                    </div>
                </div>
                <button className="btn btn-outline" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
                    <LogOut size={15} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
