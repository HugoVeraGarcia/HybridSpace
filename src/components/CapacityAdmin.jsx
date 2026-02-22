import { useState, useEffect } from 'react';
import { useZones, useTeams, updateZoneCapacity, useOffices } from '../hooks/useSupabase';
import { AlertTriangle, Loader, ChevronDown, Building2 } from 'lucide-react';

export default function CapacityAdmin() {
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
    const [pending, setPending] = useState({});
    const [saving, setSaving] = useState(null);

    const loading = offLoading || zLoad || tLoad;

    // Local overrides while slider is moving
    const getVal = (zone) => pending[zone.id]?.max_capacity ?? zone.max_capacity;

    const handleSlider = (zoneId, value) => {
        setPending(p => ({ ...p, [zoneId]: { ...p[zoneId], max_capacity: Number(value) } }));
    };

    const saveCapacity = async (zone) => {
        setSaving(zone.id);
        await updateZoneCapacity(zone.id, getVal(zone));
        setSaving(null);
        refetchZones();
    };

    if (loading && !selectedOfficeId) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando aforos…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const zonesData = zones ?? [];
    const totalMax = zonesData.reduce((a, z) => a + (getVal(z) || 0), 0);
    const selectedOfficeName = offices?.find(o => o.id === selectedOfficeId)?.name ?? 'Selecciona oficina';

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>⚙️ Gestión de Aforos</h2>
                    <p>Establece límites máximos de capacidad por zona y monitorea la ocupación</p>
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

            <div className="grid-4 mb-6">
                {[
                    { label: 'Zonas Activas', value: zonesData.length, color: 'var(--accent)', icon: '🏢' },
                    { label: 'Capacidad Total', value: totalMax, color: 'var(--info)', icon: '📊' },
                    { label: 'Equipos Asignados', value: zonesData.filter(z => z.team_id).length, color: 'var(--success)', icon: '✅' },
                    { label: 'Sin equipo', value: zonesData.filter(z => !z.team_id).length, color: 'var(--warning)', icon: '⚠️' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div style={{ fontSize: 22 }}>{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2" style={{ gap: 20 }}>
                {zonesData.map(zone => {
                    const maxCap = getVal(zone);
                    const barColor = 'var(--accent)';
                    const team = (teams ?? []).find(t => t.id === zone.team_id);
                    const isSaving = saving === zone.id;
                    const isDirty = pending[zone.id]?.max_capacity != null && pending[zone.id].max_capacity !== zone.max_capacity;

                    return (
                        <div key={zone.id} className="capacity-zone-card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div style={{ width: 10, height: 32, borderRadius: 4, background: zone.color ?? '#6c63ff', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{zone.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{team?.name ?? 'Sin equipo'} · Zona {zone.label}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: zone.color ?? 'var(--accent)' }}>{maxCap}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>personas máx.</div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <div className="flex justify-between mb-2">
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Capacidad máxima</label>
                                    <span style={{ fontSize: 12, fontWeight: 700 }}>{maxCap} personas</span>
                                </div>
                                <input type="range" min="5" max="60" value={maxCap}
                                    onChange={e => handleSlider(zone.id, e.target.value)}
                                    style={{ accentColor: zone.color ?? 'var(--accent)' }} />
                            </div>

                            {isDirty && (
                                <button className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 13 }}
                                    onClick={() => saveCapacity(zone)} disabled={isSaving}>
                                    {isSaving ? 'Guardando…' : '💾 Guardar cambio'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
