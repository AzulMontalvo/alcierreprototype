import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorNote, PageTitle } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { errorMessage } from '../lib/format';

const ROLE_LABEL = { customer: 'Cliente', business: 'Negocio', admin: 'Administrador' } as const;

export default function Profile() {
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notif, setNotif] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));

  if (!profile) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api.updateName(name.trim());
      await refresh();
      toast('Perfil actualizado', 'success');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function logout() {
    await api.signOut();
    nav('/', { replace: true });
  }

  return (
    <>
      <PageTitle>Mi perfil</PageTitle>
      <section className="panel">
        <p className="eyebrow">{ROLE_LABEL[profile.role]}</p>
        <p>{profile.email}</p>
        <form className="form" onSubmit={save}>
          <label className="field">
            <span>Nombre</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <ErrorNote error={error} />
          <button className="pill-btn">Guardar</button>
        </form>
      </section>

      {profile.role === 'business' && (
        <section className="panel">
          <h2 className="panel__title panel__title--sm">Mi negocio</h2>
          <Link to="/negocio/perfil" className="pill-btn">
            Editar datos del local
          </Link>
          {'Notification' in window && notif !== 'granted' && (
            <>
              <p className="small">Activa las alertas para enterarte al instante de cada pedido nuevo.</p>
              <button
                className="pill-btn"
                onClick={async () => setNotif(await Notification.requestPermission())}
                disabled={notif === 'denied'}
              >
                {notif === 'denied' ? 'Alertas bloqueadas en el navegador' : 'Activar alertas de pedidos'}
              </button>
            </>
          )}
        </section>
      )}

      <button className="cta cta--ghost" onClick={logout}>
        Cerrar sesión
      </button>
    </>
  );
}
