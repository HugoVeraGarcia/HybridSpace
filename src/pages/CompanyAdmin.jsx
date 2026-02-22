import { useState } from 'react';
import { useCompanies, createCompany, updateCompany } from '../hooks/useSupabase';
import { Building, Plus, X, Globe, Layers, Pencil, Check, Power } from 'lucide-react';

const TIMEZONES = [
    'UTC', 'America/Mexico_City', 'America/New_York', 'America/Chicago',
    'America/Los_Angeles', 'America/Bogota', 'America/Lima',
    'America/Santiago', 'America/Buenos_Aires', 'Europe/Madrid',
    'Europe/London', 'America/Sao_Paulo',
];

const PLANS = [
    { value: 'free', label: 'Free', desc: 'Hasta 10 usuarios' },
    { value: 'starter', label: 'Starter', desc: 'Hasta 50 usuarios' },
    { value: 'pro', label: 'Pro', desc: 'Hasta 500 usuarios' },
    { value: 'enterprise', label: 'Enterprise', desc: 'Sin límite' },
];

const PLAN_COLORS = {
    free: '#6b7280', starter: '#38bdf8', pro: '#6c63ff', enterprise: '#f59e0b',
};

// ── Inline edit form ──────────────────────────────────────────────────────────
function EditForm({ company, onSave, onCancel }) {
    const [name, setName] = useState(company.name);
    const [plan, setPlan] = useState(company.plan ?? 'free');
    const [timezone, setTimezone] = useState(company.timezone ?? 'UTC');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const { data, error } = await updateCompany(company.id, { name: name.trim(), plan, timezone });
        setSaving(false);
        if (!error) onSave(data);
        else alert('Error: ' + error.message);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {/* Name */}
            <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Nombre</label>
                <div className="input-wrapper">
                    <Building size={14} />
                    <input value={name} onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        autoFocus />
                </div>
            </div>

            {/* Plan */}
            <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Plan</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {PLANS.map(p => (
                        <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                            style={{
                                padding: '8px 12px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                                border: plan === p.value ? `2px solid ${PLAN_COLORS[p.value]}` : '1px solid var(--border)',
                                background: plan === p.value ? `${PLAN_COLORS[p.value]}18` : 'var(--bg-card)',
                                color: 'var(--text-primary)',
                            }}>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>{p.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Timezone */}
            <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Zona horaria</label>
                <div className="input-wrapper">
                    <Globe size={14} />
                    <select value={timezone} onChange={e => setTimezone(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            color: 'var(--text-primary)', flex: 1, fontSize: 14
                        }}>
                        {TIMEZONES.map(tz => (
                            <option key={tz} value={tz} style={{ color: '#000', background: '#fff' }}>{tz}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <Check size={14} /> {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompanyAdmin() {
    const { data: companies, loading, refetch } = useCompanies();

    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [plan, setPlan] = useState('free');
    const [timezone, setTimezone] = useState('UTC');
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const { data, error } = await createCompany(name.trim(), plan, timezone);
        setSaving(false);
        if (!error && data) {
            setName(''); setPlan('free'); setTimezone('UTC');
            setShowCreate(false);
            refetch();
        } else {
            alert('Error al crear: ' + (error?.message ?? 'desconocido'));
        }
    };

    const handleToggle = async (company) => {
        setToggling(company.id);
        await updateCompany(company.id, { active: !company.active });
        setToggling(null);
        refetch();
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>🏢 Empresas</h2>
                    <p>Administra las organizaciones registradas en HybridSpace</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
                    {showCreate ? <X size={16} /> : <Plus size={16} />}
                    {showCreate ? 'Cancelar' : 'Nueva Empresa'}
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="card" style={{ marginBottom: 24, maxWidth: 540 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Nueva Empresa</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="input-group">
                            <label>Nombre *</label>
                            <div className="input-wrapper">
                                <Building size={16} />
                                <input type="text" placeholder="Ej. Acme Corporation"
                                    value={name} onChange={e => setName(e.target.value)} autoFocus required />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Plan</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {PLANS.map(p => (
                                    <button key={p.value} type="button" onClick={() => setPlan(p.value)}
                                        style={{
                                            padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                                            border: plan === p.value ? `2px solid ${PLAN_COLORS[p.value]}` : '1px solid var(--border)',
                                            background: plan === p.value ? `${PLAN_COLORS[p.value]}18` : 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Zona horaria</label>
                            <div className="input-wrapper">
                                <Globe size={16} />
                                <select value={timezone} onChange={e => setTimezone(e.target.value)}
                                    style={{
                                        background: 'transparent', border: 'none', outline: 'none',
                                        color: 'var(--text-primary)', flex: 1, fontSize: 14
                                    }}>
                                    {TIMEZONES.map(tz => (
                                        <option key={tz} value={tz} style={{ color: '#000', background: '#fff' }}>{tz}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Creando…' : 'Crear Empresa'}
                        </button>
                    </form>
                </div>
            )}

            {/* List */}
            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Cargando…</p>
            ) : !companies?.length ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
                    No hay empresas. Crea una con el botón de arriba.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
                    {companies.map(c => {
                        const isEditing = editingId === c.id;
                        const planColor = PLAN_COLORS[c.plan ?? 'free'];
                        return (
                            <div key={c.id} className="card"
                                style={{ opacity: c.active === false ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                                {/* Header row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                        background: `linear-gradient(135deg, ${planColor}, #38bdf8)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                    }}>🏢</div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {c.name}
                                            {c.active === false && (
                                                <span style={{
                                                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                                                    background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600
                                                }}>
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Layers size={11} style={{ color: planColor }} />
                                                <span style={{ color: planColor, fontWeight: 600 }}>{c.plan ?? 'free'}</span>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Globe size={11} /> {c.timezone ?? 'UTC'}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                Creada {new Date(c.created_at).toLocaleDateString('es-MX')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button
                                            title={c.active === false ? 'Activar' : 'Desactivar'}
                                            onClick={() => handleToggle(c)}
                                            disabled={toggling === c.id}
                                            style={{
                                                padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                                background: c.active === false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                                                color: c.active === false ? '#10b981' : '#ef4444',
                                                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                                            }}>
                                            <Power size={13} />
                                            {c.active === false ? 'Activar' : 'Desactivar'}
                                        </button>
                                        <button
                                            onClick={() => setEditingId(isEditing ? null : c.id)}
                                            style={{
                                                padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                                background: isEditing ? 'var(--accent-dim)' : 'var(--bg-surface)',
                                                color: isEditing ? 'var(--accent)' : 'var(--text-secondary)',
                                                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
                                            }}>
                                            {isEditing ? <X size={13} /> : <Pencil size={13} />}
                                            {isEditing ? 'Cerrar' : 'Editar'}
                                        </button>
                                    </div>
                                </div>

                                {/* Inline edit form */}
                                {isEditing && (
                                    <EditForm
                                        company={c}
                                        onSave={() => { setEditingId(null); refetch(); }}
                                        onCancel={() => setEditingId(null)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
