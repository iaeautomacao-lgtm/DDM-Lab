import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
  requireRH?: boolean;
}

export const ProtectedRoute = ({ requireAdmin = false, requireRH = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isRH } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!user) {
    if (requireRH) return <Navigate to="/rh-login" replace state={{ from: location }} />;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireRH && !isRH && !isAdmin) {
    return <Navigate to="/rh-login" replace />;
  }

  return <Outlet />;
};
