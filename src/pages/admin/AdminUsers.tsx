import { useState } from 'react';
import { ErrorNote, Loader, PageTitle, useAsync } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { dateTime, errorMessage } from '../../lib/format';
import type { Role } from '../../lib/types';

const ROLE_LABEL: Record<Role, string> = { customer: 'Cliente', business: 'Negocio', admin: 'Admin' };

export default function AdminUsers() {
  const { data, error, loading, reload } = useAsync(() => api.adminListUsers());
  const { profile } = useAuth();
  const [role, setRole] = useState<Role | 'all'>('all');
  const toast = useToast();

  async function toggle(id: string, disabled: boolean) {
    try {
      await api.adminSetUserDisabled(id, disabled);
      toast(disabled ? 'Cuenta deshabilitada' : 'Cuenta habilitada', 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const list = (data ?? []).filter((u) => role === 'all' || u.role === role);

  return (
    <>
      <PageTitle>Usuarios</PageTitle>
      <div className="tabs" role="tablist">
        {(['all', 'customer', 'business', 'admin'] as const).map((r) => (
          <button key={r} role="tab" aria-selected={role === r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>
            {r === 'all' ? 'Todos' : ROLE_LABEL[r]}
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
      {loading && !data && <Loader />}
      <div className="stack">
        {list.map((u) => (
          <article key={u.id} className={`user-row ${u.disabled ? 'manage-card--off' : ''}`}>
            <div className="user-row__avatar">{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
            <div className="user-row__info">
              <strong>{u.full_name || '—'}</strong>
              <span className="small">{u.email}</span>
              <span className="small muted">
                {ROLE_LABEL[u.role]} · desde {dateTime(u.created_at)}
                {u.disabled && ' · deshabilitada'}
              </span>
            </div>
            {u.id !== profile?.id &&
              (u.disabled ? (
                <button className="pill-btn pill-btn--sm" onClick={() => toggle(u.id, false)}>
                  Habilitar
                </button>
              ) : (
                <button className="link-btn" onClick={() => toggle(u.id, true)}>
                  Deshabilitar
                </button>
              ))}
          </article>
        ))}
      </div>
    </>
  );
}
