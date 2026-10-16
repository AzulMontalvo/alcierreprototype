import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck } from '../../components/Icons';
import { ErrorNote, PageTitle } from '../../components/ui';
import { api } from '../../lib/api';
import { errorMessage, money } from '../../lib/format';
import type { Order } from '../../lib/types';

export default function VerifyPickup() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Order | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError('El código tiene 6 dígitos');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDone(await api.verifyPickup(code));
      setCode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <>
        <PageTitle>Entrega confirmada</PageTitle>
        <section className="panel verify-ok">
          <div className="verify-ok__icon">
            <IconCheck width={48} height={48} />
          </div>
          <h2>¡Pedido entregado!</h2>
          <p>
            <strong>{done.customer_name || 'Cliente'}</strong> · #{done.id.slice(0, 8).toUpperCase()}
          </p>
          <ul className="order-card__items">
            {done.items.map((i) => (
              <li key={i.id}>
                {i.quantity} × {i.title}
              </li>
            ))}
          </ul>
          <p>Total: {money(done.total)}</p>
          <button
            className="cta"
            onClick={() => {
              setDone(null);
              setTimeout(() => input.current?.focus(), 0);
            }}
          >
            Verificar otro código
          </button>
          <Link to="/negocio/pedidos" className="link-btn">
            Ver pedidos del día
          </Link>
        </section>
      </>
    );

  return (
    <>
      <PageTitle>Verificar entrega</PageTitle>
      <form className="panel verify" onSubmit={submit}>
        <p>Pide al cliente su código de 6 dígitos (aparece en su ticket y en su correo).</p>
        <input
          ref={input}
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          aria-label="Código de recolección"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        <ErrorNote error={error} />
        <button className="cta" disabled={busy || code.length !== 6}>
          {busy ? 'Verificando…' : 'Marcar como entregado'}
        </button>
      </form>
    </>
  );
}
