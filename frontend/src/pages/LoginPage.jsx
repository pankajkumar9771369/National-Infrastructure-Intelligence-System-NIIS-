import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Shield, Eye, UserPlus, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { register as registerApi } from '../services/api';

export default function LoginPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [role, setRole] = useState('admin');

    // Login fields
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Signup fields
    const [signupUsername, setSignupUsername] = useState('');
    const [signupFullName, setSignupFullName] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirm, setSignupConfirm] = useState('');

    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const fillDemo = (r) => {
        setRole(r);
        setUsername(r === 'admin' ? 'admin' : 'viewer');
        setPassword('admin123');
    };

    const switchMode = (m) => {
        setMode(m);
        setUsername('');
        setPassword('');
        setSignupUsername('');
        setSignupFullName('');
        setSignupPassword('');
        setSignupConfirm('');
    };

    /* ── Login ── */
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await login(username, password);
            toast.success(`Welcome back, ${data.user.full_name || data.user.username}!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    /* ── Signup ── */
    const handleSignup = async (e) => {
        e.preventDefault();
        if (signupPassword !== signupConfirm) {
            toast.error('Passwords do not match');
            return;
        }
        if (signupPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await registerApi(signupUsername, signupPassword, signupFullName);
            toast.success('Account created! You can now sign in.');
            // Auto-fill login form and switch back
            setUsername(signupUsername);
            setPassword('');
            switchMode('login');
            setUsername(signupUsername);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-in">

                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <ShieldAlert size={24} color="white" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>Smart City</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Infrastructure Risk Dashboard</div>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
                    <button
                        onClick={() => switchMode('login')}
                        style={{
                            flex: 1, padding: '9px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
                            background: mode === 'login' ? 'rgba(59,130,246,0.18)' : 'transparent',
                            color: mode === 'login' ? 'var(--accent-blue)' : 'var(--text-muted)',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                    >
                        <LogIn size={15} /> Sign In
                    </button>
                    <button
                        onClick={() => switchMode('signup')}
                        style={{
                            flex: 1, padding: '9px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
                            background: mode === 'signup' ? 'rgba(16,185,129,0.18)' : 'transparent',
                            color: mode === 'signup' ? '#10b981' : 'var(--text-muted)',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                    >
                        <UserPlus size={15} /> Sign Up
                    </button>
                </div>

                {/* ── LOGIN FORM ── */}
                {mode === 'login' && (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 500 }}>Select your role</div>
                            <div className="role-selector">
                                <button className={`role-option ${role === 'admin' ? 'selected' : ''}`} onClick={() => fillDemo('admin')}>
                                    <div className="role-option-icon"><Shield size={24} color={role === 'admin' ? 'var(--accent-blue)' : 'var(--text-muted)'} /></div>
                                    <div className="role-option-label">Admin</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Full access</div>
                                </button>
                                <button className={`role-option ${role === 'viewer' ? 'selected' : ''}`} onClick={() => fillDemo('viewer')}>
                                    <div className="role-option-icon"><Eye size={24} color={role === 'viewer' ? 'var(--accent-blue)' : 'var(--text-muted)'} /></div>
                                    <div className="role-option-label">Viewer</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Read only</div>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                            <p className="demo-hint">Demo: admin/admin123 · viewer/admin123</p>
                        </form>
                    </>
                )}

                {/* ── SIGNUP FORM ── */}
                {mode === 'signup' && (
                    <>
                        {/* Viewer-only notice */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                            <Eye size={18} color="#10b981" style={{ flexShrink: 0 }} />
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                New accounts are created as <strong style={{ color: '#10b981' }}>Viewer</strong> by default.
                                Admin accounts are managed by the system administrator only.
                            </div>
                        </div>

                        <form onSubmit={handleSignup}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-control" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} placeholder="Your full name (optional)" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input className="form-control" value={signupUsername} onChange={e => setSignupUsername(e.target.value)} placeholder="Choose a username" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="form-control" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Min. 6 characters" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input className="form-control" type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder="Re-enter password" required />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                            <p className="demo-hint">Already have an account? <span style={{ color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => switchMode('login')}>Sign In</span></p>
                        </form>
                    </>
                )}

                {/* Footer */}
                <div style={{ marginTop: 24, padding: '14px', background: 'rgba(59,130,246,0.06)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        🏙️ <strong style={{ color: 'var(--text-secondary)' }}>Bangalore City Infrastructure Monitor</strong><br />
                        AI-powered risk assessment for 50+ bridges, roads &amp; overpasses
                    </div>
                </div>
            </div>
        </div>
    );
}
