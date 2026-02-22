import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, User, Mail, Lock, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = form, 2 = success
    const [companyName, setCompanyName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) { setError('Ingresa el nombre de tu empresa.'); return; }
        if (!userName.trim()) { setError('Ingresa tu nombre completo.'); return; }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        setLoading(true);
        setError('');

        // company_name in metadata → the DB trigger creates company + admin profile atomically
        // This happens BEFORE email confirmation, so the company always exists.
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: userName.trim(),
                    company_name: companyName.trim(),
                },
                emailRedirectTo: `${window.location.origin}/map`,
            },
        });

        if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

        setLoading(false);
        // If session exists (email confirm disabled) go straight to app, otherwise show confirm screen
        setStep(authData.session ? 2 : 'confirm');
    };

    if (step === 2) return (
        <div style={BG}>
            <div style={CARD}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={ICON_BOX}><CheckCircle size={36} color="#10b981" /></div>
                    <h2 style={{ color: '#fff', marginBottom: 8 }}>¡Empresa registrada!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>
                        Tu empresa y cuenta de administrador están listas.
                    </p>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                    onClick={() => navigate('/map')}>
                    Ir a la app →
                </button>
            </div>
        </div>
    );

    if (step === 'confirm') return (
        <div style={BG}>
            <div style={{ ...CARD, textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
                <h2 style={{ color: '#fff', marginBottom: 8 }}>Confirma tu correo</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                    Enviamos un enlace de confirmación a <strong style={{ color: '#fff' }}>{email}</strong>.
                    <br />Haz clic en ese enlace y luego inicia sesión — tu empresa se configurará automáticamente.
                </p>
                <div style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
                    💡 Si no ves el correo, revisa Spam o usa el botón "Reenviar" en la pantalla de login.
                </div>
                <Link to="/login" style={{ display: 'block', color: 'var(--accent)', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                    Ir a iniciar sesión →
                </Link>
            </div>
        </div>
    );

    return (
        <div style={BG}>
            <div style={{ width: '100%', maxWidth: 460 }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#6c63ff,#38bdf8)', borderRadius: 14, padding: '10px 20px', marginBottom: 12 }}>
                        <Zap size={20} color="#fff" fill="#fff" />
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>HybridSpace</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Registra tu empresa — prueba gratis 14 días</p>
                </div>

                <div style={CARD}>
                    <h3 style={{ color: '#fff', marginBottom: 4, fontWeight: 800 }}>Crear cuenta de empresa</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 28 }}>
                        Tú serás el administrador de tu espacio.
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Company name */}
                        <div className="input-group">
                            <label>Nombre de la empresa</label>
                            <div className="input-wrapper">
                                <Building2 size={16} className="input-icon" />
                                <input type="text" placeholder="Acme Corp" value={companyName}
                                    onChange={e => setCompanyName(e.target.value)} required autoFocus />
                            </div>
                        </div>

                        {/* Admin name */}
                        <div className="input-group">
                            <label>Tu nombre completo</label>
                            <div className="input-wrapper">
                                <User size={16} className="input-icon" />
                                <input type="text" placeholder="Ana García" value={userName}
                                    onChange={e => setUserName(e.target.value)} required />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="input-group">
                            <label>Correo electrónico</label>
                            <div className="input-wrapper">
                                <Mail size={16} className="input-icon" />
                                <input type="email" placeholder="ana@empresa.com" value={email}
                                    onChange={e => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="input-group">
                            <label>Contraseña</label>
                            <div className="input-wrapper">
                                <Lock size={16} className="input-icon" />
                                <input type={showPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    required minLength={6} />
                                <button type="button" className="input-icon-right" onClick={() => setShowPw(s => !s)}>
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary"
                            style={{ justifyContent: 'center', padding: 14, fontSize: 15 }}
                            disabled={loading}>
                            {loading ? 'Creando empresa…' : '🚀 Crear empresa gratis'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 20 }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                            Iniciar sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

const BG = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-base)', padding: 24,
    backgroundImage: `
        radial-gradient(ellipse at 20% 20%, rgba(108,99,255,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(56,189,248,0.07) 0%, transparent 50%)
    `,
};
const CARD = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '36px 32px', backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
};
const ICON_BOX = {
    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
    background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
