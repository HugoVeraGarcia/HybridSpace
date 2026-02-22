import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkIn } from '../hooks/useSupabase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function CheckInPage() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');
    const [checkedAt, setCheckedAt] = useState(null);

    useEffect(() => {
        if (!bookingId || bookingId === 'NO_BOOKING') {
            setStatus('error');
            setMessage('No se encontró una reserva válida en este QR.');
            return;
        }

        const run = async () => {
            const { data, error } = await checkIn(bookingId);
            if (error) {
                // If already checked in, that's still OK
                if (error.message?.includes('already') || error.code === 'PGRST116') {
                    setStatus('success');
                    setMessage('Ya tenías check-in registrado para esta reserva.');
                } else {
                    setStatus('error');
                    setMessage(error.message ?? 'Ocurrió un error al registrar el check-in.');
                }
            } else {
                setStatus('success');
                setCheckedAt(new Date());
                setMessage('Tu asistencia ha sido registrada correctamente.');
            }
        };

        run();
    }, [bookingId]);

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg,#0a0d14 0%,#0f1420 100%)',
            padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            {/* App brand */}
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
                    background: 'linear-gradient(135deg,#6c63ff,#38bdf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                }}>⚡</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    HybridSpace
                </div>
            </div>

            {/* Status card */}
            <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 40, maxWidth: 380, width: '100%',
                textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}>
                {status === 'loading' && (
                    <>
                        <Loader size={56} color="#6c63ff" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Procesando Check-in…</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Verificando tu reserva</div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                            background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={44} color="#10b981" strokeWidth={1.5} />
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>¡Check-in Exitoso!</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                            {message}
                        </div>
                        {checkedAt && (
                            <div style={{
                                background: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: '10px 16px',
                                fontSize: 13, color: '#10b981', fontWeight: 600, marginBottom: 24,
                            }}>
                                🕐 {checkedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                        <button
                            onClick={() => navigate('/map')}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg,#6c63ff,#38bdf8)',
                                color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                            }}>
                            Ir al Mapa
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                            background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <XCircle size={44} color="#ef4444" strokeWidth={1.5} />
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Check-in Fallido</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            {message}
                        </div>
                        <button
                            onClick={() => navigate('/map')}
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                            }}>
                            Ir al Mapa
                        </button>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
