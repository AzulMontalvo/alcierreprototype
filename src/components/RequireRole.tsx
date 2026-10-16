import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../lib/types';
import { Empty, Loader } from './ui';

export default function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (profile.disabled)
    return (
      <Empty emoji="🚫" title="Tu cuenta está deshabilitada">
        <p className="muted">Si crees que es un error, escribe a soporte.</p>
      </Empty>
    );
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
