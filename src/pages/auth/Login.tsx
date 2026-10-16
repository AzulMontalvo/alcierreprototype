import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorNote } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';

const DEMO_ACCOUNTS = [
  { email: 'cliente@demo.com', label: 'Cliente' },
  { email: 'negocio@demo.com', label: 'Negocio' },
  { email: 'admin@demo.com', label: 'Admin' },
];

export default function Login() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile) return <Navigate to={from} replace />;

  async function login(e: string, p: string) {
    setBusy(true);
    setError(null);
    try {
      await api.signIn(e, p);
      nav(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    login(email, password);
  };

  return (
    <div className="auth">
      <h1 className="hero__title">Bienvenido de vuelta</h1>
      <p className="muted">Entra para reservar y pagar tus paquetes.</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Correo</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <ErrorNote error={error} />
        <button className="cta" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="center small">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>

      {api.mode === 'demo' && (
        <section className="panel demo-box">
          <p className="eyebrow">Modo demo · acceso rápido</p>
          <div className="demo-box__btns">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} className="pill-btn pill-btn--sm" disabled={busy} onClick={() => login(a.email, 'demo1234')}>
                {a.label}
              </button>
            ))}
          </div>
          <p className="small muted">Contraseña de todas las cuentas demo: demo1234</p>
        </section>
      )}
    </div>
  );
}
