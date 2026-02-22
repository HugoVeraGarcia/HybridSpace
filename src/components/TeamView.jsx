import { useState, useMemo } from 'react';
import { useTeamToday } from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { Loader, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
    office: { label: 'En Oficina', cls: 'office' },
    none: { label: 'Sin definir', cls: 'none' },
};

const AVATAR_COLORS = ['#6c63ff', '#f59e0b', '#10b981', '#ef4444', '#38bdf8', '#ec4899', '#8b5cf6', '#14b8a6'];

const FMT_SHORT = { weekday: 'short', day: 'numeric' };
const FMT_FULL = { weekday: 'long', day: 'numeric', month: 'long' };
const toISO = (d) => d.toISOString().split('T')[0];

function getWorkingDays(count = 3) {
    const days = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    days.push(new Date(d));
    while (days.length <= count) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    }
    return days;
}

function AvatarCircle({ initials, index, size = 'md' }) {
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
        <div className={`avatar ${size}`} style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
            {initials}
        </div>
    );
}

export default function TeamView() {
    const workingDays = useMemo(() => getWorkingDays(3), []);
    const [selectedDate, setSelectedDate] = useState(workingDays[0]);
    const selectedDateISO = toISO(selectedDate);

    const { data: users, loading, error } = useTeamToday(selectedDateISO);
    const { user } = useAuth();
    const [filter, setFilter] = useState('all');

    const dateLabel = selectedDate.toLocaleDateString('es-MX', FMT_FULL);
    const inOffice = (users ?? []).filter(u => u.status === 'office').length;
    const myTeamName = users?.find(u => u.id === user?.id)?.teams?.name ?? 'Mi Equipo';
    const filtered = filter === 'all' ? (users ?? []) : (users ?? []).filter(u => u.status === filter);

    if (error) return <div style={{ color: 'var(--danger)', padding: 20 }}>Error: {error}</div>;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                    <div>
                        <h2 style={{ marginBottom: 4 }}>👥 ¿Quién va?</h2>
                        <p style={{ textTransform: 'capitalize', color: 'var(--text-muted)', fontSize: 14 }}>{dateLabel}</p>
                    </div>

                    {/* Date Selector */}
                    <div style={{
                        display: 'flex', background: 'rgba(255,255,255,0.03)',
                        padding: 4, borderRadius: 12, border: '1px solid var(--border)'
                    }}>
                        {workingDays.map((d, i) => {
                            const active = toISO(d) === selectedDateISO;
                            return (
                                <button key={toISO(d)}
                                    onClick={() => setSelectedDate(d)}
                                    style={{
                                        background: active ? 'var(--accent)' : 'transparent',
                                        color: active ? '#fff' : 'var(--text-muted)',
                                        border: 'none', borderRadius: 8, padding: '6px 14px',
                                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', minWidth: 60
                                    }}>
                                    <span style={{ fontSize: 10, opacity: active ? 1 : 0.7, textTransform: 'uppercase' }}>
                                        {i === 0 ? 'Hoy' : d.toLocaleDateString('es-MX', { weekday: 'short' })}
                                    </span>
                                    <span>{d.getDate()}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando equipo…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    <div className="card mb-6" style={{
                        background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(108,99,255,0.04))',
                        borderColor: 'rgba(108,99,255,0.25)'
                    }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                    Equipo · {myTeamName}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 800 }}>
                                    <span style={{ color: 'var(--success)' }}>{inOffice}</span>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 16 }}> en oficina</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(users ?? []).filter(u => u.status === 'office').slice(0, 4).map((u, i) => (
                                    <AvatarCircle key={u.id} initials={u.avatar ?? u.name.slice(0, 2).toUpperCase()} index={i} />
                                ))}
                            </div>
                        </div>

                        <div style={{
                            marginTop: 16, padding: '12px 14px',
                            background: 'rgba(108,99,255,0.1)', borderRadius: 8,
                            border: '1px solid rgba(108,99,255,0.2)',
                            fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start'
                        }}>
                            <span style={{ fontSize: 18 }}>🤖</span>
                            <div>
                                <strong style={{ color: 'var(--accent)' }}>Sugerencia IA · </strong>
                                Tienes 4 reuniones con <strong>Rocio Herrera</strong> esta semana.
                                ¿Por qué no reservan ambos el <strong>miércoles</strong>?{' '}
                                <button style={{
                                    background: 'var(--accent)', color: '#fff', border: 'none',
                                    borderRadius: 6, padding: '3px 10px', fontSize: 12,
                                    cursor: 'pointer', fontWeight: 600, marginLeft: 4
                                }}>Invitar a Rocio</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                        {[['all', 'Todos'], ['office', 'En Oficina'], ['none', 'Sin definir']].map(([v, l]) => (
                            <button key={v}
                                className={`btn ${filter === v ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ padding: '6px 14px', fontSize: 13 }}
                                onClick={() => setFilter(v)}>
                                {l}
                            </button>
                        ))}
                    </div>

                    <div className="team-grid">
                        {filtered.map((u, i) => {
                            const cfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG['none'];
                            const isMe = u.id === user?.id;
                            return (
                                <div key={u.id} className="team-card" style={isMe ? { borderColor: 'rgba(108,99,255,0.4)', background: 'rgba(108,99,255,0.06)' } : {}}>
                                    <AvatarCircle initials={u.avatar ?? u.name.slice(0, 2).toUpperCase()} index={i} size="lg" />
                                    <div className="tc-name">{u.name}{isMe && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>Tú</span>}</div>
                                    <div className={`badge dot ${cfg.cls}`}>{cfg.label}</div>
                                    {u.desk && <div className="tc-desk">📍 {u.desk}</div>}
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>
                            No hay compañeros con este estado {toISO(selectedDate) === toISO(new Date()) ? 'hoy' : 'para este día'}.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
