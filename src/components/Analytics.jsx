import { useAnalytics, useWeeklyTrend } from '../hooks/useSupabase';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Users, Calendar, Zap, Loader } from 'lucide-react';

// Fallback data while DB is empty
const FALLBACK_DAYS = [
    { day_name: 'Mon', total_bookings: 45, checked_in_count: 37 },
    { day_name: 'Tue', total_bookings: 30, checked_in_count: 21 },
    { day_name: 'Wed', total_bookings: 52, checked_in_count: 48 },
    { day_name: 'Thu', total_bookings: 42, checked_in_count: 32 },
    { day_name: 'Fri', total_bookings: 21, checked_in_count: 10 },
];
const DAY_ES = { Mon: 'Lun', Tue: 'Mar', Wed: 'Mié', Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb', Sun: 'Dom' };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
            {payload.map(p => (
                <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
};

export default function Analytics() {
    const { data: rawDays, loading: dLoad } = useAnalytics();
    const { data: trendData, loading: tLoad } = useWeeklyTrend();

    const loading = dLoad || tLoad;

    const days = (rawDays ?? []).map(d => ({
        ...d,
        day: DAY_ES[d.day_name] ?? d.day_name,
        ocupacion: d.total_bookings || 0,
        checkin: d.checked_in_count || 0,
    }));

    // If no data, fill with weekdays with 0 values to keep the chart structure
    const chartDays = days.length > 0 ? days : Object.keys(DAY_ES).slice(0, 5).map(day => ({
        day: DAY_ES[day],
        ocupacion: 0,
        checkin: 0
    }));

    const trend = trendData?.length ? trendData : [];

    const maxDay = days.length ? days.reduce((a, b) => b.ocupacion > a.ocupacion ? b : a, days[0]) : null;
    const minDay = days.length ? days.reduce((a, b) => b.ocupacion < a.ocupacion ? b : a, days[0]) : null;
    const totalBookings = days.reduce((a, d) => a + d.ocupacion, 0);
    const avgOcc = Math.round(totalBookings / (days.length || 1));

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando analítica…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <h2>📊 Analítica de Uso</h2>
                <p>Reportes de ocupación para optimizar costos operativos · últimos 90 días</p>
            </div>

            <div className="grid-4 mb-6">
                {[
                    { label: 'Reservas Promedio/Día', value: avgOcc, sub: 'Últimos 90 días', icon: <TrendingUp size={18} />, color: 'var(--accent)' },
                    { label: 'Total Reservas', value: totalBookings, sub: 'Mon – Vie', icon: <Calendar size={18} />, color: 'var(--info)' },
                    { label: 'Día Más Concurrido', value: maxDay?.day ?? '—', sub: `${maxDay?.ocupacion ?? 0} reservas`, icon: <Zap size={18} />, color: 'var(--warning)' },
                    { label: 'Día Más Vacío', value: minDay?.day ?? '—', sub: `${minDay?.ocupacion ?? 0} reservas`, icon: <Users size={18} />, color: 'var(--success)' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                            {s.icon}
                        </div>
                        <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="chart-container mb-6">
                <div className="chart-title">Reservas por Día de Semana</div>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartDays} barGap={4} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="ocupacion" name="Reservas" radius={[6, 6, 0, 0]}>
                            {chartDays.map((d, i) => (
                                <Cell key={i}
                                    fill={d.ocupacion >= 45 ? 'var(--danger)' : d.ocupacion >= 30 ? 'var(--accent)' : 'var(--success)'}
                                    fillOpacity={0.85} />
                            ))}
                        </Bar>
                        <Bar dataKey="checkin" name="Check-in" fill="var(--info)" fillOpacity={0.5} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-container">
                <div className="chart-title">Tendencia Semanal</div>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trend}>
                        <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="promedio" name="Reservas" stroke="var(--accent)"
                            strokeWidth={2.5} fill="url(#trendGrad)" dot={{ fill: 'var(--accent)', r: 4 }} />
                    </AreaChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: 8, border: '1px solid rgba(108,99,255,0.15)', fontSize: 13 }}>
                    💡 <strong style={{ color: 'var(--accent)' }}>Recomendación: </strong>
                    {minDay ? <>Los <strong>{minDay.day}</strong> la ocupación baja a <strong>{minDay.ocupacion}</strong> reservas. Considera reducir servicios ese día para optimizar costos.</> : 'Genera más reservas para ver recomendaciones.'}
                </div>
            </div>
        </div>
    );
}
