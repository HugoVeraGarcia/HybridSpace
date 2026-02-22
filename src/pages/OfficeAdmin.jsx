import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffices, createOffice, deleteOffice } from '../hooks/useSupabase';
import { Building2, Plus, Pencil, Trash2, MapPin, Loader, AlertCircle } from 'lucide-react';

export default function OfficeAdmin() {
    const navigate = useNavigate();
    const { data: offices, loading, error, refetch } = useOffices();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const { data, error: err } = await createOffice(name.trim(), address.trim());
        setSaving(false);
        if (!err && data) {
            setName(''); setAddress('');
            setShowCreate(false);
            refetch();
        } else {
            alert('Error al crear: ' + (err?.message ?? 'desconocido'));
        }
    };

    const handleDelete = async (id, officeName) => {
        if (!window.confirm(`¿Eliminar "${officeName}"? Se eliminarán todas las zonas y escritorios.`)) return;
        setDeleting(id);
        await deleteOffice(id);
        setDeleting(null);
        refetch();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h2>🏢 Gestión de Oficinas</h2>
                    <p>Crea y gestiona los espacios físicos de tu empresa</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(s => !s)}>
                    <Plus size={16} /> Nueva Oficina
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="card mb-6" style={{ borderColor: 'var(--border-accent)', maxWidth: 480 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nueva Oficina</h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="input-group">
                            <label>Nombre</label>
                            <div className="input-wrapper">
                                <Building2 size={15} className="input-icon" />
                                <input type="text" placeholder="Ej. Torre Oriente, Piso 3" value={name}
                                    onChange={e => setName(e.target.value)} required autoFocus />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Dirección (opcional)</label>
                            <div className="input-wrapper">
                                <MapPin size={15} className="input-icon" />
                                <input type="text" placeholder="Av. Insurgentes Sur 1234, CDMX" value={address}
                                    onChange={e => setAddress(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Creando…' : 'Crear Oficina'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', padding: 40 }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cargando oficinas…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {error && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--danger)', padding: 20 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {!loading && !error && (offices ?? []).length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <Building2 size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p>Aún no tienes oficinas. Crea la primera con el botón de arriba.</p>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {(offices ?? []).map(office => (
                    <div key={office.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(108,99,255,0.05))',
                                border: '1px solid rgba(108,99,255,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Building2 size={20} color="var(--accent)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {office.name}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={11} /> {office.address || 'Sin dirección'}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                            <button className="btn btn-primary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}
                                onClick={() => navigate(`/admin/offices/${office.id}/edit`)}>
                                <Pencil size={14} /> Editar layout
                            </button>
                            <button className="btn btn-danger"
                                style={{ padding: '8px 12px', fontSize: 13 }}
                                disabled={deleting === office.id}
                                onClick={() => handleDelete(office.id, office.name)}>
                                {deleting === office.id ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
