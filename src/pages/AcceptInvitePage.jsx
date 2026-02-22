import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Eye, EyeOff, Zap, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function AcceptInvitePage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [validating, setValidating] = useState(true);
    const [inviteInfo, setInviteInfo] = useState(null); // null = invalid
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const validate = async () => {
            const { data, error } = await supabase
                .from('invitations')
                .select('email, role, expires_at, used, companies(name)')
                .eq('token', token)
                .maybeSingle();

            if (error || !data || data.used || new Date(data.expires_at) < new Date()) {
                setInviteInfo(null);
            } else {
                setInviteInfo(data);
                setEmail(data.email);
            }
            setValidating(false);
        };
        validate();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setError('Ingresa tu nombre completo.'); return; }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
        setLoading(true);
        setError('');

        // 1. Create auth user
        const { data: authData, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } },
        });
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

        // 2. Accept invite (link to company)
        if (authData.session) {
            const { data: rpcResult, error: rpcErr } = await supabase.rpc('accept_invite', {
                p_token: token,
                p_name: name.trim(),
            });
            if (rpcErr) { setError('Error al aceptar invitación: ' + rpcErr.message); setLoading(false); return; }
            if (rpcResult?.error) { setError(rpcResult.error); setLoading(false); return; }
        }

        setLoading(false);
        setDone(true);
    };

    if (validating) return (
        <div style={BG}>
            <Loader size={36} color="#6c63ff" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (!inviteInfo) return (
        <div style={BG}>
            <div style={{ ...CARD, textAlign: 'center', maxWidth: 400 }}>
                <div style={iconBox('#ef4444')}><XCircle size={36} color="#ef4444" /></div>
                <h3 style={{ color: '#fff', marginBottom: 8 }}>Invitación no válida</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Este enlace ha expirado, ya fue usado o no es válido.
                </p>
                <Link to="/login" style={{ color: 'var(--accent)', fontSize: 14 }}>← Ir al inicio de sesión</Link>
            </div>
        </div>
    );

    if (done) return (
        <div style={BG}>
            <div style={{ ...CARD, textAlign: 'center', maxWidth: 400 }}>
                <div style={iconBox('#10b981')}><CheckCircle size={36} color="#10b981" /></div>
                <h3 style={{ color: '#fff', marginBottom: 8 }}>¡Cuenta creada!</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Bienvenido/a a <strong style={{ color: '#fff' }}>{inviteInfo.companies?.name}</strong>.
                    {!supabase.auth.getSession ? ' Confirma tu correo y luego inicia sesión.' : ''}
                </p>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                    onClick={() => navigate('/map')}>
                    Ir a la app →
                </button>
            </div>
        </div>
    );

    return (
        <div style={BG}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#6c63ff,#38bdf8)', borderRadius: 14, padding: '10px 20px', marginBottom: 12 }}>
                        <Zap size={20} color="#fff" fill="#fff" />
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>HybridSpace</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                        Fuiste invitado/a a <strong style={{ color: '#fff' }}>{inviteInfo.companies?.name}</strong>
                    </p>
                </div>

                <div style={CARD}>
                    <h3 style={{ color: '#fff', marginBottom: 4, fontWeight: 800 }}>Crea tu cuenta</h3>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
                        Rol: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{inviteInfo.role}</span>
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="input-group">
                            <label>Tu nombre completo</label>
                            <div className="input-wrapper">
                                <User size={16} className="input-icon" />
                                <input type="text" placeholder="Ana García" value={name}
                                    onChange={e => setName(e.target.value)} required autoFocus />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Correo electrónico</label>
                            <div className="input-wrapper">
                                <Mail size={16} className="input-icon" />
                                <input type="email" value={email}
                                    onChange={e => setEmail(e.target.value)} required />
                            </div>
                        </div>

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
                            {loading ? 'Creando cuenta…' : '✅ Aceptar invitación'}
                        </button>
                    </form>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
const iconBox = (color) => ({
    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
    background: `${color}22`, border: `2px solid ${color}55`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
});
