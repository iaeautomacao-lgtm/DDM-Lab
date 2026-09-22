import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
