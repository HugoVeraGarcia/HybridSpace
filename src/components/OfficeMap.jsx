import { useState, useEffect, useMemo } from 'react';
import {
    useOffices, useOfficeAssets, useOfficeZones,
    useBookingsByOfficeDate, createBooking, cancelBooking,
} from '../hooks/useSupabase';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Loader, Building2, ChevronDown } from 'lucide-react';

// Returns today + up to `count` next working days (Mon-Fri)
function getWorkingDays(count = 3) {
    const days = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Always include today regardless of weekday
    days.push(new Date(d));
    while (days.length <= count) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
    }
    return days;
}

const FMT_SHORT = { weekday: 'short', day: 'numeric', month: 'short' };
const FMT_FULL = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const toISO = (d) => d.toISOString().split('T')[0];

// Room dimensions
const ROOM_W = 60;
const ROOM_H = 80;

export default function OfficeMap() {
    const { user } = useAuth();

    // Office selector
    const { data: offices, loading: offLoading } = useOffices();
    const [selectedOfficeId, setSelectedOfficeId] = useState(null);

    // Auto-select first office once list loads
    useEffect(() => {
        if (offices?.length && !selectedOfficeId) {
            setSelectedOfficeId(offices[0].id);
        }
    }, [offices, selectedOfficeId]);

    const selectedOffice = (offices ?? []).find(o => o.id === selectedOfficeId);

    // Date selector (today + up to 3 next working days)
    const workingDays = useMemo(() => getWorkingDays(3), []);
    const [selectedDate, setSelectedDate] = useState(workingDays[0]);
    const selectedDateISO = toISO(selectedDate);
    const isToday = selectedDateISO === toISO(workingDays[0]);

    // Data for selected office + date
    const { data: assets, loading: aLoad, refetch: refetchAssets } = useOfficeAssets(selectedOfficeId);
    const { data: bookings, loading: bLoad, refetch: refetchBookings } = useBookingsByOfficeDate(selectedOfficeId, selectedDateISO);
    const { data: zones, loading: zLoad } = useOfficeZones(selectedOfficeId);

    const [tooltip, setTooltip] = useState(null);
    const [modal, setModal] = useState(null);
    const [confirmed, setConfirmed] = useState(null);
    const [booking, setBooking] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const loading = offLoading || aLoad || bLoad || zLoad;

    // Build booking map
    const bookingMap = Object.fromEntries(
        (bookings ?? []).map(b => [b.asset_id, b])
    );

    const desks = (assets ?? []).filter(a => a.type === 'desk');
    const rooms = (assets ?? []).filter(a => a.type === 'room');

    // Compute viewBox from zones
    const allZones = zones ?? [];
    const paddedRight = allZones.length ? Math.max(...allZones.map(z => z.coord_x + z.coord_w)) + 55 : 555;
    const paddedBottom = allZones.length ? Math.max(...allZones.map(z => z.coord_y + z.coord_h)) + 55 : 530;
    const viewBox = `0 0 ${paddedRight} ${paddedBottom}`;

    const handleDeskClick = (desk) => {
        const bk = bookingMap[desk.id];
        if (bk?.user_id === user?.id)
            setModal({ type: 'myDesk', desk, booking: bk });
        else if (bk)
            setModal({ type: 'view', desk, bookedBy: bk.profiles?.name });
        else
            setModal({ type: 'book', desk });
    };

    const confirmBook = async () => {
        setBooking(true);
        const { error } = await createBooking(modal.desk.id, selectedDateISO);
        setBooking(false);
        if (!error) {
            setConfirmed(modal.desk.name);
            setModal(null);
            refetchAssets();
            refetchBookings();
            setTimeout(() => setConfirmed(null), 3000);
        } else {
            setModal({ type: 'error', message: error.message });
        }
    };

    const confirmCancel = async () => {
        setCancelling(true);
        const { error } = await cancelBooking(modal.booking.id);
        setCancelling(false);
        if (!error) {
            setModal(null);
            refetchBookings();
        } else {
            setModal({ type: 'error', message: 'No se pudo cancelar: ' + error.message });
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}>🗺️ Mapa de Oficina</h2>
                    <p style={{ textTransform: 'capitalize' }}>
                        {isToday ? 'Hoy · ' : ''}
                        {selectedDate.toLocaleDateString('es-MX', FMT_FULL)}
                    </p>
                </div>

                {/* Office selector */}
                <div style={{ position: 'relative', minWidth: 200, width: 'max-content' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', background: 'var(--accent)',
                        border: '1px solid var(--accent)', borderRadius: 10,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                        <Building2 size={15} style={{ color: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
                        <select
                            value={selectedOfficeId ?? ''}
                            onChange={e => setSelectedOfficeId(e.target.value)}
                            style={{
                                background: 'transparent', border: 'none', outline: 'none',
                                color: '#fff', fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', flex: 1, appearance: 'none',
                            }}
                            disabled={offLoading}
                        >
                            {offLoading && <option style={{ color: '#000' }}>Cargando…</option>}
                            {(offices ?? []).map(o => (
                                <option key={o.id} value={o.id} style={{ color: '#000', background: '#fff' }}>{o.name}</option>
                            ))}
                            {!offLoading && !offices?.length && (
                                <option disabled style={{ color: '#000' }}>Sin oficinas</option>
                            )}
                        </select>
                        <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
                    </div>
                </div>
            </div>

            {/* Date pill strip */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                {workingDays.map((d, i) => {
                    const iso = toISO(d);
                    const active = iso === selectedDateISO;
                    const label = i === 0 ? 'Hoy' : d.toLocaleDateString('es-MX', FMT_SHORT);
                    return (
                        <button key={iso} onClick={() => setSelectedDate(d)}
                            style={{
                                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                                border: active ? 'none' : '1px solid var(--border)',
                                background: active ? 'var(--accent)' : 'var(--bg-card)',
                                color: active ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                                whiteSpace: 'nowrap'
                            }}>
                            {label}
                        </button>
                    );
                })}
            </div>

            {confirmed && (
                <div style={{
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: 10, padding: '12px 18px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)', fontSize: 14, fontWeight: 600
                }}>
                    <CheckCircle size={18} />
                    ¡Reserva confirmada! Escritorio {confirmed} — {isToday ? 'hoy' : selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}.
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, color: 'var(--text-secondary)' }}>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando mapa…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : !selectedOfficeId ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, fontSize: 14 }}>
                    Crea una oficina desde <strong>Admin → Oficinas</strong> para comenzar.
                </div>
            ) : (
                <>
                    <div className="map-wrapper" style={{ position: 'relative' }}>
                        <svg viewBox={viewBox} className="map-svg" style={{ minHeight: 450 }}>
                            <defs>
                                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width={paddedRight} height={paddedBottom} fill="url(#grid)" />

                            {/* Zones */}
                            {allZones.map(z => (
                                <g key={z.id}>
                                    <rect x={z.coord_x} y={z.coord_y} width={z.coord_w} height={z.coord_h}
                                        fill={`${z.color}18`} stroke={`${z.color}40`} strokeWidth="1" rx="10" />
                                    <text x={z.coord_x + 10} y={z.coord_y + 18}
                                        fill={`${z.color}cc`} fontSize="11" fontWeight="700">
                                        {z.name ?? z.label}
                                    </text>
                                </g>
                            ))}

                            {/* Rooms */}
                            {rooms.map(r => {
                                const isBooked = !!bookingMap[r.id];
                                return (
                                    <g key={r.id}>
                                        <rect x={r.coord_x} y={r.coord_y} width={ROOM_W} height={ROOM_H}
                                            className={`room-rect ${isBooked ? 'reserved' : 'free'}`}
                                            onClick={() => {
                                                const bk = bookingMap[r.id];
                                                if (!bk) setModal({ type: 'bookRoom', room: r });
                                                else if (bk.user_id === user?.id) setModal({ type: 'myRoom', room: r, booking: bk });
                                                else setModal({ type: 'viewRoom', room: r, booking: bk });
                                            }} />
                                        <text x={r.coord_x + ROOM_W / 2} y={r.coord_y + ROOM_H / 2 - 6}
                                            textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontWeight="600">{r.name}</text>
                                        <text x={r.coord_x + ROOM_W / 2} y={r.coord_y + ROOM_H / 2 + 8}
                                            textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">Cap. {r.capacity}</text>
                                        <text x={r.coord_x + ROOM_W / 2} y={r.coord_y + ROOM_H / 2 + 20}
                                            textAnchor="middle" fontSize="8"
                                            fill={isBooked ? 'rgba(245,158,11,0.9)' : 'rgba(56,189,248,0.9)'}>
                                            {isBooked ? '● Ocupada' : '● Libre'}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Desks */}
                            {desks.map(desk => {
                                const bk = bookingMap[desk.id];
                                const isMine = bk?.user_id === user?.id;
                                const status = bk ? 'reserved' : 'free';
                                return (
                                    <g key={desk.id}
                                        onMouseEnter={(e) => {
                                            const svg = e.currentTarget.closest('svg');
                                            const rect = svg.getBoundingClientRect();
                                            const scale = rect.width / paddedRight;
                                            setTooltip({ x: desk.coord_x * scale + 30, y: desk.coord_y * scale - 10, desk, isMine, bookedBy: bk?.profiles?.name ?? null });
                                        }}
                                        onMouseLeave={() => setTooltip(null)}
                                        onClick={() => handleDeskClick(desk)}
                                    >
                                        <rect x={desk.coord_x - 18} y={desk.coord_y - 14} width="36" height="28"
                                            className={`desk-rect ${status}${isMine ? ' mine' : ''}`} />
                                        <rect x={desk.coord_x - 12} y={desk.coord_y - 8} width="24" height="3" rx="1.5"
                                            fill={status === 'free' ? 'rgba(16,185,129,0.6)' : isMine ? 'rgba(255,255,255,0.9)' : 'rgba(108,99,255,0.6)'} />
                                        <rect x={desk.coord_x - 8} y={desk.coord_y - 1} width="16" height="8" rx="3"
                                            fill={status === 'free' ? 'rgba(16,185,129,0.4)' : isMine ? 'rgba(255,255,255,0.6)' : 'rgba(108,99,255,0.4)'} />
                                        {isMine && (
                                            <circle cx={desk.coord_x + 14} cy={desk.coord_y - 12} r="5"
                                                fill="var(--accent)" stroke="var(--bg-surface)" strokeWidth="1.5" />
                                        )}
                                        <text x={desk.coord_x} y={desk.coord_y + 22} textAnchor="middle"
                                            fontSize="8" fill="rgba(255,255,255,0.4)">{desk.name}</text>
                                    </g>
                                );
                            })}
                        </svg>

                        {tooltip && (
                            <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.desk.name}</div>
                                {tooltip.isMine
                                    ? <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓ Tu escritorio</span>
                                    : tooltip.bookedBy
                                        ? <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>👤 {tooltip.bookedBy}</span>
                                        : <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Disponible — Click para reservar</span>
                                }
                            </div>
                        )}
                    </div>

                    <div className="map-legend">
                        <div className="legend-item"><div className="legend-dot" style={{ background: 'rgba(16,185,129,0.5)', border: '1px solid rgba(16,185,129,0.8)' }} /> Libre</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: 'rgba(108,99,255,0.5)', border: '1px solid rgba(108,99,255,0.8)' }} /> Reservado</div>
                        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent)', border: '2px solid #fff' }} /> Tu escritorio</div>
                    </div>
                </>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        {modal.type === 'book' && (<>
                            <h3>Reservar Escritorio</h3>
                            <p>{isToday ? 'Confirma tu reserva para hoy.' : `Reservando para el ${selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}.`}</p>
                            <div className="modal-row"><span>Escritorio</span><span>{modal.desk.name}</span></div>
                            <div className="modal-row"><span>Oficina</span><span>{selectedOffice?.name ?? '—'}</span></div>
                            <div className="modal-row"><span>Zona</span><span>{modal.desk.zones?.name ?? '—'}</span></div>
                            <div className="modal-row">
                                <span>Reservado para</span>
                                <span style={{ color: isToday ? 'inherit' : 'var(--accent)', fontWeight: isToday ? 400 : 600, textTransform: 'capitalize' }}>
                                    {isToday ? 'Hoy' : selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            {!isToday && (
                                <div className="modal-row">
                                    <span>Registrado el</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                                        {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <div className="modal-row"><span>Horario</span><span>09:00 – 18:00</span></div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={confirmBook} disabled={booking}>
                                    {booking ? 'Reservando…' : 'Confirmar Reserva'}
                                </button>
                            </div>
                        </>)}
                        {modal.type === 'myDesk' && (<>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{ fontSize: 28 }}>🪑</div>
                                <div>
                                    <h3 style={{ marginBottom: 2 }}>Tu Reserva de Hoy</h3>
                                    <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Este es tu escritorio reservado</p>
                                </div>
                            </div>
                            <div className="modal-row"><span>Escritorio</span><span>{modal.desk.name}</span></div>
                            <div className="modal-row"><span>Oficina</span><span>{selectedOffice?.name ?? '—'}</span></div>
                            <div className="modal-row"><span>Fecha</span><span>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
                            <div className="modal-row"><span>Horario</span><span>09:00 – 18:00</span></div>
                            <div className="modal-row">
                                <span>Estado</span>
                                <span style={{ color: modal.booking.check_in_status === 'checked_in' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                                    {modal.booking.check_in_status === 'checked_in' ? '✅ Check-in realizado' : '⏳ Pendiente llegada'}
                                </span>
                            </div>
                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
                                <button
                                    onClick={confirmCancel}
                                    disabled={cancelling}
                                    style={{
                                        padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: cancelling ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.15)',
                                        color: '#ef4444', fontWeight: 700, fontSize: 13,
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}>
                                    🗑️ {cancelling ? 'Cancelando…' : 'Cancelar Reserva'}
                                </button>
                            </div>
                        </>)}
                        {modal.type === 'view' && (<>
                            <h3>Escritorio Ocupado</h3>
                            <p>Este escritorio ya tiene una reserva para hoy.</p>
                            <div className="modal-row"><span>Escritorio</span><span>{modal.desk.name}</span></div>
                            <div className="modal-row"><span>Reservado por</span><span>{modal.bookedBy ?? 'Colega'}</span></div>
                            <div className="modal-actions">
                                <button className="btn btn-primary" onClick={() => setModal(null)}>Entendido</button>
                            </div>
                        </>)}
                        {modal.type === 'bookRoom' && (<>
                            <h3>Reservar {modal.room.name}</h3>
                            <div className="modal-row"><span>Capacidad</span><span>{modal.room.capacity} personas</span></div>
                            <div className="modal-row"><span>Fecha</span><span style={{ textTransform: 'capitalize' }}>{isToday ? 'Hoy' : selectedDate.toLocaleDateString('es-MX', FMT_SHORT)}</span></div>
                            <div className="modal-row"><span>Estado</span><span style={{ color: 'var(--success)' }}>Disponible</span></div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={async () => {
                                    const { error } = await createBooking(modal.room.id, selectedDateISO);
                                    if (error) setModal({ type: 'error', message: error.message });
                                    else { refetchBookings(); setModal(null); }
                                }}>Reservar Sala</button>
                            </div>
                        </>)}
                        {modal.type === 'viewRoom' && (<>
                            <h3>{modal.room.name} — Ocupada</h3>
                            <div className="modal-row"><span>Capacidad</span><span>{modal.room.capacity} personas</span></div>
                            <div className="modal-row"><span>Reservado por</span><span>{modal.booking?.profiles?.name ?? 'Colega'}</span></div>
                            <div className="modal-actions">
                                <button className="btn btn-primary" onClick={() => setModal(null)}>Entendido</button>
                            </div>
                        </>)}
                        {modal.type === 'myRoom' && (<>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{ fontSize: 28 }}>🚪</div>
                                <div>
                                    <h3 style={{ marginBottom: 2 }}>Tu Sala Reservada</h3>
                                    <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Tienes esta sala reservada hoy</p>
                                </div>
                            </div>
                            <div className="modal-row"><span>Sala</span><span>{modal.room.name}</span></div>
                            <div className="modal-row"><span>Capacidad</span><span>{modal.room.capacity} personas</span></div>
                            <div className="modal-row"><span>Fecha</span><span>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
                                <button
                                    onClick={confirmCancel}
                                    disabled={cancelling}
                                    style={{
                                        padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: cancelling ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.15)',
                                        color: '#ef4444', fontWeight: 700, fontSize: 13,
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}>
                                    🗑️ {cancelling ? 'Cancelando…' : 'Cancelar Reserva'}
                                </button>
                            </div>
                        </>)}
                        {modal.type === 'error' && (<>
                            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>No se pudo reservar</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                                {modal.message}
                            </p>
                            <div className="modal-actions" style={{ justifyContent: 'center' }}>
                                <button className="btn btn-primary" onClick={() => setModal(null)}>Entendido</button>
                            </div>
                        </>)}
                    </div>
                </div>
            )}
        </div>
    );
}
