import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ErrorNote } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';

export default function Register() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<'customer' | 'business'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  if (profile) return <Navigate to={profile.role === 'business' ? '/negocio/perfil' : '/'} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await api.signUp({ email, password, fullName, role });
      if (needsConfirmation) setConfirmSent(true);
      else nav(role === 'business' ? '/negocio/perfil' : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (confirmSent)
    return (
      <div className="auth center">
        <div className="empty__emoji">📬</div>
        <h1 className="hero__title">Revisa tu correo</h1>
        <p>Te enviamos un enlace a {email} para confirmar tu cuenta.</p>
        <Link to="/login" className="pill-btn">
          Ir a iniciar sesión
        </Link>
      </div>
    );

  return (
    <div className="auth">
      <h1 className="hero__title">Crea tu cuenta</h1>
      <div className="segmented" role="radiogroup" aria-label="Tipo de cuenta">
        <button
          type="button"
          role="radio"
          aria-checked={role === 'customer'}
          className={role === 'customer' ? 'on' : ''}
          onClick={() => setRole('customer')}
        >
          🛍️ Quiero rescatar comida
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={role === 'business'}
          className={role === 'business' ? 'on' : ''}
          onClick={() => setRole('business')}
        >
          🏪 Tengo un negocio
        </button>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>{role === 'business' ? 'Nombre del responsable' : 'Tu nombre'}</span>
          <input autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="field">
          <span>Correo</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña (mín. 6 caracteres)</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {role === 'business' && (
          <p className="small muted">Después completarás los datos del local. Un administrador lo aprobará antes de publicar.</p>
        )}
        <ErrorNote error={error} />
        <button className="cta" disabled={busy}>
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="center small">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
