import { useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useMyBookingToday, checkIn } from '../hooks/useSupabase';
import { CheckCircle, Loader, Scan } from 'lucide-react';

export default function QRCheckIn() {
    const { data: booking, loading, error, refetch } = useMyBookingToday();
    const [scanning, setScanning] = useState(false);

    const handleScan = async () => {
        if (!booking) return;
        setScanning(true);
        await new Promise(r => setTimeout(r, 1800)); // simulate scan delay
        const { error: e } = await checkIn(booking.id);
        setScanning(false);
        if (!e) refetch();
        else alert('Error en check-in: ' + e.message);
    };

    const checkedIn = booking?.check_in_status === 'checked_in';

    const qrValue = booking
        ? `${window.location.origin}/checkin/${booking.id}`
        : `${window.location.origin}/checkin/NO_BOOKING`;

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando reserva…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!booking) return (
        <div>
            <div className="page-header">
                <h2>📲 Check-in QR</h2>
                <p>Escanea el código al llegar al escritorio para confirmar tu asistencia</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Sin reserva para hoy</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Reserva un escritorio en el <strong>Mapa de Oficina</strong> para generar tu QR de check-in.
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <h2>📲 Check-in QR</h2>
                <p>Escanea el código al llegar al escritorio para confirmar tu asistencia</p>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="qr-card">
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Tu reserva de hoy</div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{booking.assets?.name ?? '—'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            {booking.start_time} – {booking.end_time}
                        </div>
                    </div>

                    {checkedIn ? (
                        <div className="checkin-success" style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                            padding: 24, background: 'rgba(16,185,129,0.1)', borderRadius: 16,
                            border: '1px solid rgba(16,185,129,0.3)', width: '100%'
                        }}>
                            <CheckCircle size={56} color="var(--success)" strokeWidth={1.5} />
                            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--success)' }}>¡Check-in Exitoso!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Bienvenido/a a la oficina. Tu asistencia ha sido registrada.
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                #{booking.id.slice(0, 8)} · {booking.checked_in_at
                                    ? new Date(booking.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`qr-wrapper ${scanning ? '' : 'qr-pulse'}`}>
                                {scanning ? (
                                    <div style={{ width: 180, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff' }}>
                                        <div style={{ width: 40, height: 40, border: '3px solid transparent', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ color: '#333', fontSize: 12, fontWeight: 600 }}>Escaneando…</span>
                                    </div>
                                ) : (
                                    <QRCode value={qrValue} size={180} bgColor="#ffffff" fgColor="#0a0d14" level="M" />
                                )}
                            </div>

                            <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }}
                                onClick={handleScan} disabled={scanning}>
                                <Scan size={16} />
                                {scanning ? 'Procesando…' : 'Simular Escaneo QR'}
                            </button>

                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                En la app móvil, apunta la cámara al QR del escritorio físico para hacer check-in automático.
                            </p>
                        </>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card card-sm">
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600 }}>Detalles de la Reserva</div>
                        {[
                            { icon: '🗂️', label: 'ID Reserva', value: booking.id.slice(0, 8) + '…' },
                            { icon: '🪑', label: 'Escritorio', value: booking.assets?.name ?? '—' },
                            { icon: '🏢', label: 'Zona', value: booking.assets?.zones?.name ?? '—' },
                            { icon: '📅', label: 'Fecha', value: new Date(booking.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }) },
                            { icon: '🕘', label: 'Horario', value: `${booking.start_time} – ${booking.end_time}` },
                            { icon: checkedIn ? '✅' : '⏳', label: 'Estado', value: checkedIn ? 'Check-in realizado' : 'Pendiente' },
                        ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{row.icon} {row.label}</span>
                                <span style={{ fontWeight: 600, color: row.label === 'Estado' && checkedIn ? 'var(--success)' : 'var(--text-primary)' }}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="card card-sm" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 8 }}>⚡ Auto check-out</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Si no realizas check-out manual, el sistema liberará tu escritorio automáticamente a las <strong>{booking.end_time}</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
