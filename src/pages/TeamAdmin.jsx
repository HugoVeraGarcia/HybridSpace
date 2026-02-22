import { useState } from 'react';
import { Users, Mail, Copy, Check, Loader, UserPlus, Power } from 'lucide-react';
import { useCompanyUsers, createInvitation, useCompanyInvitations, setUserActiveStatus } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Administrador', employee: 'Empleado' };

export default function TeamAdmin() {
    const { profile: me } = useAuth();
    const { data: users, loading: uLoad, error: uErr, refetch: refetchUsers } = useCompanyUsers();
    const { data: invites, loading: iLoad, refetch: refetchInvites } = useCompanyInvitations();

    const [email, setEmail] = useState('');
    const [role, setRole] = useState('employee');
    const [creating, setCreating] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [confirmToggle, setConfirmToggle] = useState(null); // { id, active }
    const [createError, setCreateError] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setCreating(true);
        setCreateError('');
        const { error } = await createInvitation(email.trim(), role);
        if (error) {
            setCreateError(error.message);
        } else {
            setEmail('');
            refetchInvites();
        }
        setCreating(false);
    };

    const handleToggleActive = async (userId, active) => {
        setTogglingId(userId);
        const { error } = await setUserActiveStatus(userId, active);
        if (!error) {
            refetchUsers();
            setConfirmToggle(null);
        } else {
            alert('Error al actualizar estado: ' + error.message);
        }
        setTogglingId(null);
    };

    const copyLink = (token) => {
        const url = `${window.location.origin}/accept-invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedId(token);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const maxUsers = users?.[0]?.companies?.max_users ?? 10;
    const activeUsers = users?.filter(u => u.active !== false) ?? [];
    const userCount = activeUsers.length;
    const usagePercent = Math.min(100, Math.round((userCount / maxUsers) * 100));

    return (
        <div>
            {confirmToggle && (
                <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => !togglingId && setConfirmToggle(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>{confirmToggle.active ? '🔄' : '⚠️'}</div>
                        <h3>{confirmToggle.active ? 'Reactivar Usuario' : 'Desactivar Usuario'}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                            {confirmToggle.active
                                ? `¿Quieres reactivar a ${users.find(u => u.id === confirmToggle.id)?.name}? Recuperará el acceso de inmediato.`
                                : `¿Estás seguro de desactivar a ${users.find(u => u.id === confirmToggle.id)?.name}? Perderá el acceso de inmediato.`}
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={() => setConfirmToggle(null)} disabled={togglingId}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: confirmToggle.active ? 'var(--success)' : '#ef4444' }}
                                onClick={() => handleToggleActive(confirmToggle.id, confirmToggle.active)} disabled={togglingId}>
                                {togglingId ? 'Cargando...' : (confirmToggle.active ? 'Reactivar' : 'Sí, Desactivar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h2>👥 Equipo</h2>
                    <p>Gestiona los usuarios de tu empresa e invita nuevos miembros</p>
                </div>
            </div>

            {/* Usage bar */}
            <div className="card mb-6" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Usuarios Activos</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: usagePercent >= 90 ? '#ef4444' : 'var(--accent)' }}>{userCount}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / {maxUsers}</span>
                    </span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 99, transition: 'width 0.4s',
                        width: `${usagePercent}%`,
                        background: usagePercent >= 90 ? '#ef4444' : 'linear-gradient(90deg,#6c63ff,#38bdf8)',
                    }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

                {/* Left: User list */}
                <div className="card">
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={16} /> Miembros actuales
                    </div>
                    {uLoad && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando…</div>}
                    {uErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{uErr}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(users ?? []).map((u, i) => {
                            const colors = ['#6c63ff', '#f59e0b', '#10b981', '#ef4444', '#38bdf8', '#ec4899'];
                            const color = colors[i % colors.length];
                            const initials = (u.name ?? u.email ?? '?').slice(0, 2).toUpperCase();
                            const isMe = u.id === me?.id;

                            return (
                                <div key={u.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                                    opacity: u.active !== false ? 1 : 0.5,
                                    transition: 'opacity 0.2s'
                                }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg,${color},${color}99)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 13, fontWeight: 700, color: '#fff',
                                    }}>{initials}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.name ?? '—'} {isMe && <span style={{ color: 'var(--accent)', fontSize: 11 }}>(Tú)</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.email}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        {u.active === false && (
                                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                                                Inactivo
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                                            background: u.role === 'admin' ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.06)',
                                            color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.5px'
                                        }}>
                                            {ROLE_LABELS[u.role] ?? u.role}
                                        </span>

                                        {!isMe && (
                                            <button
                                                onClick={() => setConfirmToggle({ id: u.id, active: u.active === false })}
                                                style={{
                                                    background: 'none', border: 'none',
                                                    color: u.active !== false ? 'var(--text-muted)' : 'var(--success)',
                                                    cursor: 'pointer', padding: 6, borderRadius: 6, transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = u.active !== false ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)';
                                                    if (u.active !== false) e.currentTarget.style.color = '#ef4444';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = 'none';
                                                    e.currentTarget.style.color = u.active !== false ? 'var(--text-muted)' : 'var(--success)';
                                                }}
                                                title={u.active !== false ? 'Desactivar usuario' : 'Activar usuario'}
                                            >
                                                <Power size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {!uLoad && !users?.length && (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Sin usuarios.</div>
                        )}
                    </div>
                </div>

                {/* Right: Invite + pending */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Invite form */}
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UserPlus size={16} /> Invitar usuario
                        </div>
                        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="input-group">
                                <label>Correo electrónico</label>
                                <div className="input-wrapper">
                                    <Mail size={15} className="input-icon" />
                                    <input type="email" placeholder="colega@empresa.com"
                                        value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Rol</label>
                                <select value={role} onChange={e => setRole(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}>
                                    <option value="employee">Empleado</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            {createError && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 12 }}>
                                    {createError}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={creating || userCount >= maxUsers}>
                                {creating ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</> : '✉️ Generar enlace de invitación'}
                            </button>
                            {userCount >= maxUsers && (
                                <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                                    Límite de usuarios activos alcanzado ({maxUsers}). Actualiza tu plan.
                                </p>
                            )}
                        </form>
                    </div>

                    {/* Pending invitations */}
                    <div className="card">
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📨 Invitaciones pendientes</div>
                        {iLoad && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando…</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(invites ?? []).filter(i => !i.used && new Date(i.expires_at) > new Date()).map(inv => (
                                <div key={inv.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 8, border: '1px solid var(--border)',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.email}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Expira {new Date(inv.expires_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => copyLink(inv.token)}
                                        style={{
                                            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                            background: copiedId === inv.token ? 'rgba(16,185,129,0.15)' : 'rgba(108,99,255,0.15)',
                                            color: copiedId === inv.token ? '#10b981' : 'var(--accent)',
                                            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                                        }}>
                                        {copiedId === inv.token ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}
                                    </button>
                                </div>
                            ))}
                            {!iLoad && !(invites ?? []).filter(i => !i.used && new Date(i.expires_at) > new Date()).length && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin invitaciones activas.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div >
    );
}
