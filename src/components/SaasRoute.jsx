import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SaasRoute({ children }) {
    const { session, profile, loading } = useAuth();

    if (loading) return null;
    if (!session) return <Navigate to="/login" replace />;

    // Only superadmins can access SaaS routes
    if (profile?.role !== 'superadmin') return <Navigate to="/map" replace />;

    return children;
}
