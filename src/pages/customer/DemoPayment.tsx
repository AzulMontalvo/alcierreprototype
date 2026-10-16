import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorNote, Loader, PageTitle, useAsync } from '../../components/ui';
import { api, demoApi } from '../../lib/api';
import { errorMessage, money } from '../../lib/format';

/** Sustituye a Stripe Checkout en modo demo. */
export default function DemoPayment() {
  const { orderId = '' } = useParams();
  const nav = useNavigate();
  const { data: order, loading } = useAsync(() => api.getMyOrder(orderId), [orderId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!demoApi) return <Navigate to="/" replace />;
  if (loading) return <Loader />;
  if (!order || order.status !== 'awaiting_payment') return <Navigate to={`/pedidos/${orderId}`} replace />;

  async function finish(paid: boolean) {
    setBusy(true);
    try {
      await demoApi!.demoPay(orderId, paid);
      nav(paid ? `/pedidos/${orderId}?pago=ok` : '/carrito?pago=cancelado', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle>Pago</PageTitle>
      <section className="panel paybox">
        <p className="eyebrow">Pasarela simulada (demo)</p>
        <p className="paybox__amount">{money(order.total)}</p>
        <p className="small">{order.business.name}</p>
        <ul className="small paybox__items">
          {order.items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.title}
            </li>
          ))}
        </ul>
        <div className="fake-card" aria-hidden>
          <span>•••• •••• •••• 4242</span>
          <span>12/34</span>
        </div>
        <ErrorNote error={error} />
        <button className="cta" disabled={busy} onClick={() => finish(true)}>
          {busy ? 'Procesando…' : 'Pagar ahora'}
        </button>
        <button className="link-btn" disabled={busy} onClick={() => finish(false)}>
          Cancelar pago
        </button>
      </section>
    </>
  );
}
