import { useState, useEffect } from 'react';
import { useZones, useTeams, updateZoneTeam, useOffices } from '../hooks/useSupabase';
import { CheckCircle, Loader, Building2, ChevronDown } from 'lucide-react';

const ZONE_COLORS_MAP = {
    A: { fill: 'rgba(108,99,255,0.15)', stroke: 'rgba(108,99,255,0.5)', label: '#9c8bff' },
    B: { fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.5)', label: '#fbbf24' },
    C: { fill: 'rgba(16,185,129,0.15)', stroke: 'rgba(16,185,129,0.5)', label: '#34d399' },
    D: { fill: 'rgba(239,68,68,0.15)', stroke: 'rgba(239,68,68,0.5)', label: '#f87171' },
};

export default function ZonesAdmin() {
    // Office selector
    const { data: offices, loading: offLoading } = useOffices();
    const [selectedOfficeId, setSelectedOfficeId] = useState(null);

    // Auto-select first office
    useEffect(() => {
        if (offices?.length && !selectedOfficeId) {
            setSelectedOfficeId(offices[0].id);
        }
    }, [offices, selectedOfficeId]);

    const { data: zones, loading: zLoad, refetch: refetchZones } = useZones(selectedOfficeId);
    const { data: teams, loading: tLoad } = useTeams();
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState({});

    const loading = offLoading || zLoad || tLoad;

    const getTeamId = (zone) => pending[zone.id] ?? zone.team_id ?? '';

    const handleSaveAll = async () => {
        setSaving(true);
        const updates = Object.entries(pending);
        await Promise.all(updates.map(([zoneId, teamId]) => updateZoneTeam(zoneId, teamId || null)));
        setPending({});
        setSaving(false);
        setSaved(true);
        refetchZones();
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading && !selectedOfficeId) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando zonas…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const zonesData = zones ?? [];
    const teamsData = teams ?? [];
    const hasPending = Object.keys(pending).length > 0;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>🗂️ Barrios / Zonas</h2>
                    <p>Asigna departamentos a cada zona del mapa y gestiona los "barrios" de tu oficina</p>
                </div>

                {/* Office Selector */}
                <div style={{ position: 'relative' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        padding: '8px 16px',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'default'
                    }}>
                        <Building2 size={16} color="var(--accent)" />
                        <select
                            value={selectedOfficeId ?? ''}
                            onChange={(e) => setSelectedOfficeId(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {!selectedOfficeId && <option value="">Selecciona oficina...</option>}
                            {offices?.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} color="var(--text-muted)" />
                    </div>
                </div>
            </div>

            {saved && (
                <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
                    <CheckCircle size={18} /> Asignaciones guardadas en Supabase.
                </div>
            )}

            <div className="grid-2" style={{ gap: 28, alignItems: 'start' }}>
                {/* Mini map */}
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600 }}>Vista de Planta — Zonas</div>
                    <div className="map-wrapper">
                        <svg viewBox="0 0 540 490" style={{ width: '100%', display: 'block' }}>
                            <defs>
                                <pattern id="g2" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width="540" height="490" fill="url(#g2)" />
                            {zonesData.map(z => {
                                const c = ZONE_COLORS_MAP[z.label] ?? ZONE_COLORS_MAP['A'];
                                const teamId = getTeamId(z);
                                const team = teamsData.find(t => t.id === teamId);
                                return (
                                    <g key={z.id}>
                                        <rect x={z.coord_x} y={z.coord_y} width={z.coord_w} height={z.coord_h}
                                            fill={c.fill} stroke={c.stroke} strokeWidth="1.5" rx="10" />
                                        <text x={z.coord_x + 12} y={z.coord_y + 22} fontSize="11" fontWeight="700" fill={c.label}>
                                            {team ? team.name : 'Sin asignar'}
                                        </text>
                                        <text x={z.coord_x + 12} y={z.coord_y + 36} fontSize="9" fill="rgba(255,255,255,0.3)">
                                            Zona {z.label}
                                        </text>
                                    </g>
                                );
                            })}
                            <text x="270" y="480" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.15)" letterSpacing="2">ENTRADA</text>
                        </svg>
                    </div>
                </div>

                {/* Zone editor */}
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600 }}>
                        Asignación de Equipos por Zona
                    </div>
                    <div className="zone-editor">
                        {zonesData.map(z => {
                            const c = ZONE_COLORS_MAP[z.label] ?? ZONE_COLORS_MAP['A'];
                            return (
                                <div key={z.id} className="zone-editor-row" style={{ borderColor: c.stroke.replace('0.5', '0.2') }}>
                                    <div className="zone-color-chip" style={{ background: c.stroke }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: c.label }}>{z.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cap. máx. {z.max_capacity}</div>
                                    </div>
                                    <select
                                        value={getTeamId(z)}
                                        onChange={e => setPending(p => ({ ...p, [z.id]: e.target.value }))}
                                        style={{ minWidth: 160 }}>
                                        <option value="">Sin asignar</option>
                                        {teamsData.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className={`btn w-full ${hasPending ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ marginTop: 20, justifyContent: 'center' }}
                        onClick={handleSaveAll}
                        disabled={!hasPending || saving}>
                        {saving ? '⏳ Guardando…' : '💾 Guardar Asignaciones'}
                    </button>

                    {/* Capacity bars */}
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {zonesData.map(z => {
                            const c = ZONE_COLORS_MAP[z.label] ?? ZONE_COLORS_MAP['A'];
                            return (
                                <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 60, fontSize: 12, color: c.label, fontWeight: 600 }}>Zona {z.label}</span>
                                    <div className="progress-bar" style={{ flex: 1 }}>
                                        <div className="progress-fill" style={{ width: '50%', background: c.stroke }} />
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>
                                        {z.max_capacity}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
