import { NavLink, useNavigate } from 'react-router-dom';
import {
    Map, Users, QrCode, BarChart2,
    Settings, Layers, LogOut, Zap, Building2, Building, Globe,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const NAV = {
    employee: [
        { to: '/map', icon: <Map size={18} />, label: 'Mapa de Oficina' },
        { to: '/team', icon: <Users size={18} />, label: '¿Quién va hoy?' },
        { to: '/qr', icon: <QrCode size={18} />, label: 'Check-in QR' },
    ],
    admin: [
        { to: '/admin/analytics', icon: <BarChart2 size={18} />, label: 'Analítica' },
        { to: '/admin/capacity', icon: <Settings size={18} />, label: 'Aforos' },
        { to: '/admin/zones', icon: <Layers size={18} />, label: 'Barrios / Zonas' },
        { to: '/admin/offices', icon: <Building2 size={18} />, label: 'Oficinas' },
        { to: '/admin/team', icon: <Users size={18} />, label: 'Equipo' },
    ],
    saas: [
        { to: '/saas/dashboard', icon: <Globe size={18} />, label: 'Dashboard SaaS' },
        { to: '/saas/companies', icon: <Building size={18} />, label: 'Empresas' },
    ]
};

const AVATAR_COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#ef4444', '#38bdf8'];

export default function Sidebar({ mode, setMode }) {
    const navigate = useNavigate();
    const { profile, signOut } = useAuth();

    const avatarColor = AVATAR_COLORS[
        (profile?.name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
    ];

    const isAdmin = profile?.role === 'admin';
    const isSuperAdmin = profile?.role === 'superadmin';

    const handleModeChange = (m) => {
        setMode(m);
        if (m === 'employee') navigate('/map');
        else if (m === 'admin') navigate('/admin/analytics');
        else if (m === 'saas') navigate('/saas/dashboard');
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            {/* Logo + Company */}
            <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                    empresa
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
                    {profile?.companies?.name ?? 'Mi Empresa'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        background: 'linear-gradient(135deg,#6c63ff,#38bdf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Zap size={11} color="#fff" fill="#fff" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>
                        HybridSpace
                    </div>
                </div>
            </div>

            {/* Mode toggle — admins/superadmins only */}
            {(isAdmin || isSuperAdmin) && (
                <div className="mode-toggle">
                    {(isSuperAdmin ? ['employee', 'admin', 'saas'] : ['employee', 'admin']).map(m => (
                        <button key={m}
                            className={`mode-btn ${mode === m ? 'active' : ''}`}
                            onClick={() => handleModeChange(m)}>
                            {m === 'employee' ? 'Empleado' : m === 'admin' ? 'Admin' : 'Plataforma'}
                        </button>
                    ))}
                </div>
            )}

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">
                    {mode === 'saas' ? 'Plataforma SaaS' : (isAdmin && mode === 'admin') ? 'Gestión' : 'Mi Espacio'}
                </div>
                {NAV[mode].map(({ to, icon, label }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        {icon}
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom: user chip + logout */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* User chip */}
                <div className="user-chip">
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}99)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff'
                    }}>
                        {profile?.avatar ?? '??'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile?.name ?? 'Usuario'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile?.teams?.name ?? profile?.role ?? 'employee'}
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleSignOut}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 13, width: '100%',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                    <LogOut size={14} /> Cerrar sesión
                </button>
            </div>
        </aside>
    );
}
