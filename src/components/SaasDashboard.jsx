import { useSaasCompanies, useSaasStats, updateCompany } from '../hooks/useSupabase';
import { Building2, Users, Calendar, ShieldCheck, Globe, Loader, Power, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function SaasDashboard() {
    const { data: companies, loading: cLoad, refetch: refetchComps } = useSaasCompanies();
    const { data: stats, loading: sLoad } = useSaasStats();
    const [toggling, setToggling] = useState(null);

    const loading = cLoad || sLoad;

    const handleToggleStatus = async (company) => {
        setToggling(company.id);
        await updateCompany(company.id, { active: !company.active });
        setToggling(null);
        refetchComps();
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, color: 'var(--text-secondary)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando datos globales…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className="saas-dashboard animate-in">
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--info))',
                        padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center'
                    }}>
                        <ShieldCheck color="#fff" size={20} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Portal Superadmin
                    </span>
                </div>
                <h2 style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>Control Global de HybridSpace</h2>
                <p>Monitoreo de infraestructura, clientes y métricas de plataforma</p>
            </div>

            {/* Global Stats */}
            <div className="grid-3 mb-8">
                {[
                    { label: 'Empresas Registradas', value: stats?.totalCompanies, icon: <Building2 />, color: 'var(--info)' },
                    { label: 'Usuarios Totales', value: stats?.totalUsers, icon: <Users />, color: 'var(--accent)' },
                    { label: 'Reservas (30d)', value: stats?.monthlyBookings, icon: <Calendar />, color: 'var(--success)' },
                ].map(s => (
                    <div key={s.label} className="stat-card" style={{ padding: 24, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s.color, border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0
                        }}>
                            {s.icon}
                        </div>
                        <div>
                            <div className="stat-value" style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
                            <div className="stat-label" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Companies Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Listado de Clientes</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ background: 'var(--success)', width: 8, height: 8, borderRadius: '50%' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Métricas en tiempo real</span>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>EMPRESA</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>PLAN</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ESTADO</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>USUARIOS</th>
                                <th style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(companies ?? []).map(comp => (
                                <tr key={comp.id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{comp.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {comp.id.slice(0, 8)}...</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{
                                            padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                            display: 'inline-block',
                                            background: comp.plan === 'enterprise' ? 'rgba(168,85,247,0.1)' : 'rgba(56,189,248,0.1)',
                                            color: comp.plan === 'enterprise' ? '#a855f7' : '#38bdf8'
                                        }}>
                                            {comp.plan}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: comp.active ? 'var(--success)' : 'var(--danger)' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                            {comp.active ? 'Activa' : 'Suspendida'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600 }}>
                                        {comp.profiles?.[0]?.count ?? 0}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                title={comp.active ? 'Suspender cuenta' : 'Reactivar cuenta'}
                                                onClick={() => handleToggleStatus(comp)}
                                                disabled={toggling === comp.id}
                                                style={{
                                                    padding: 6, borderRadius: 6, border: '1px solid var(--border)',
                                                    background: 'transparent', cursor: 'pointer', color: comp.active ? 'var(--danger)' : 'var(--success)',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                                                }}
                                            >
                                                <Power size={14} />
                                            </button>
                                            <button
                                                title="Gestionar compañía"
                                                style={{
                                                    padding: 6, borderRadius: 6, border: '1px solid var(--border)',
                                                    background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
                                                    display: 'flex', alignItems: 'center'
                                                }}
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
