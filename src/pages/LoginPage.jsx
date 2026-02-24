import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';

export default function LoginPage() {
    const { session, signIn, signInWithMagicLink, resetPassword } = useAuth();
    const [mode, setMode] = useState('login');   // 'login' | 'magic' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Already logged in → go to app
    if (session) return <Navigate to="/map" replace />;

    const reset = () => { setError(''); setSuccess(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        reset();

        if (mode === 'reset') {
            const { error: err } = await resetPassword(email);
            setLoading(false);
            if (err) setError(err.message);
            else setSuccess('✉️ Revisa tu correo — te enviamos un enlace para restablecer tu contraseña.');
            return;
        }

        if (mode === 'magic') {
            const { error: err } = await signInWithMagicLink(email);
            setLoading(false);
            if (err) setError(err.message);
            else setSuccess('✉️ Revisa tu correo — te enviamos un enlace mágico de acceso.');
            return;
        }

        // Login
        const { error: err } = await signIn(email, password);
        setLoading(false);
        if (err) setError(
            err.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos.'
                : err.message
        );
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-base)', padding: '24px',
            backgroundImage: `
        radial-gradient(ellipse at 20% 20%, rgba(108,99,255,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.07) 0%, transparent 50%)
      `
        }}>
            <div style={{ width: '100%', maxWidth: 420 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        background: 'linear-gradient(135deg, #6c63ff, #38bdf8)',
                        borderRadius: 14, padding: '10px 18px', marginBottom: 14
                    }}>
                        <Zap size={20} color="#fff" fill="#fff" />
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
                            HybridSpace
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Workspace OS — Tu oficina inteligente</p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '36px 32px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                }}>
                    {/* Header for Reset/Magic Mode */}
                    {mode === 'reset' ? (
                        <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Recuperar contraseña</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Introduce tu email y te enviaremos un enlace para cambiar tu contraseña.</p>
                        </div>
                    ) : mode === 'magic' ? (
                        <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Acceso con Enlace Mágico</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Te enviaremos un enlace a tu correo para entrar sin contraseña.</p>
                        </div>
                    ) : (
                        <div style={{ marginBottom: 28 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Iniciar sesión</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ingresa tus credenciales para acceder a tu espacio.</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Email */}
                        <div className="input-group">
                            <label>Correo electrónico</label>
                            <div className="input-wrapper">
                                <Mail size={16} className="input-icon" />
                                <input type="email" placeholder="alex@empresa.com" value={email}
                                    onChange={e => setEmail(e.target.value)} required
                                    autoFocus />
                            </div>
                        </div>

                        {/* Password (only for login) */}
                        {mode === 'login' && (
                            <div className="input-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ marginBottom: 0 }}>Contraseña</label>
                                    <button type="button" onClick={() => { setMode('reset'); reset(); }}
                                        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="input-wrapper">
                                    <Lock size={16} className="input-icon" />
                                    <input type={showPw ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required minLength={6} />
                                    <button type="button" className="input-icon-right"
                                        onClick={() => setShowPw(s => !s)}>
                                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error / Success */}
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--success)', fontSize: 13 }}>
                                {success}
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" className="btn btn-primary"
                            style={{ justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}
                            disabled={loading}>
                            {loading ? 'Procesando…' :
                                mode === 'login' ? 'Iniciar sesión' :
                                    mode === 'reset' ? 'Enviar instrucciones' :
                                        '✉️ Enviar enlace mágico'}
                        </button>
                    </form>

                    {/* Footer buttons / Magic link toggle */}
                    {mode === 'reset' || mode === 'magic' ? (
                        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                            onClick={() => { setMode('login'); reset(); }}>
                            ← Volver al inicio de sesión
                        </button>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                                o
                                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            </div>
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                                onClick={() => { setMode('magic'); reset(); }}>
                                <Mail size={15} /> Acceder con Enlace Mágico
                            </button>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 24 }}>
                    Al continuar, aceptas los términos de uso de HybridSpace.
                </p>
                <div style={{
                    textAlign: 'center', marginTop: 16, padding: '16px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        ¿No tienes una cuenta aún?
                    </p>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                            Registrar una nueva empresa →
                        </Link>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                            Los empleados deben usar el enlace de invitación enviado por su administrador.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
