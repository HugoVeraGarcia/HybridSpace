import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
    const { session, profile, loading } = useAuth();

    if (loading) return null; // already handled by ProtectedRoute above
    if (!session) return <Navigate to="/login" replace />;

    // Both admins and superadmins can access admin routes
    const isAllowed = profile?.role === 'admin' || profile?.role === 'superadmin';
    if (!isAllowed) return <Navigate to="/map" replace />;

    return children;
}
