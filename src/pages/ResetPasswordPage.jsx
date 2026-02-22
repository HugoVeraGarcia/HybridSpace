import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, CheckCircle, Zap } from 'lucide-react';

export default function ResetPasswordPage() {
    const { session, updatePassword, signOut } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // If no session (meaning they didn't come from a valid recovery link), redirect to login
    // Note: Supabase automatically handles the session when clicking the recovery link.
    if (!session && session !== undefined) return <Navigate to="/login" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        setError('');

        const { error: err } = await updatePassword(password);
        setLoading(false);

        if (err) {
            setError(err.message);
        } else {
            setSuccess(true);
            // Sign out to force a fresh login with the new password
            await signOut();
            setTimeout(() => navigate('/login'), 3000);
        }
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-base)', padding: '24px'
            }}>
                <div style={{
                    width: '100%', maxWidth: 400, textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)', padding: '48px 32px',
                    borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 32, background: 'rgba(16,185,129,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                    }}>
                        <CheckCircle size={32} color="var(--success)" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>¡Contraseña actualizada!</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                        Tu contraseña ha sido cambiada con éxito. Redirigiendo al inicio de sesión...
                    </p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Ir al login ahora
                    </button>
                </div>
            </div>
        );
    }

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
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>HybridSpace</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>Establece tu nueva contraseña</h2>
                </div>

                <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: '36px 32px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="input-group">
                            <label>Nueva contraseña</label>
                            <div className="input-wrapper">
                                <Lock size={16} className="input-icon" />
                                <input type={showPw ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres" value={password}
                                    onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus />
                                <button type="button" className="input-icon-right"
                                    onClick={() => setShowPw(s => !s)}>
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Confirmar nueva contraseña</label>
                            <div className="input-wrapper">
                                <Lock size={16} className="input-icon" />
                                <input type={showPw ? 'text' : 'password'}
                                    placeholder="Repite la contraseña" value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary"
                            style={{ justifyContent: 'center', padding: '12px', fontSize: 15 }}
                            disabled={loading}>
                            {loading ? 'Actualizando…' : 'Actualizar contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
