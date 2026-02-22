import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { session, loading } = useAuth();

    if (loading) return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-base)', flexDirection: 'column', gap: 16
        }}>
            <div style={{
                width: 40, height: 40,
                border: '3px solid rgba(108,99,255,0.2)',
                borderTop: '3px solid var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Verificando sesión…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return session ? children : <Navigate to="/login" replace />;
}
