import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconQr } from '../../components/Icons';
import { Empty, ErrorNote, Loader, PageTitle, StatusBadge, useAsync } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { dateTime, errorMessage, isToday, money, ORDER_STATUS_LABEL } from '../../lib/format';
import type { OrderStatus } from '../../lib/types';

const TABS: Exclude<OrderStatus, 'awaiting_payment'>[] = ['pending', 'picked_up', 'cancelled'];

export default function BusinessOrders() {
  const { data, error, loading, reload } = useAsync(() => api.listBusinessOrders());
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const toast = useToast();

  // Recarga automática cuando llega un pedido nuevo (ver Layout).
  useEffect(() => {
    const h = () => reload();
    window.addEventListener('alcierre:orders-changed', h);
    return () => window.removeEventListener('alcierre:orders-changed', h);
  }, [reload]);

  // Ventana del día: todos los pendientes + recogidos/cancelados de hoy.
  const visible = useMemo(
    () => (data ?? []).filter((o) => o.status === 'pending' || isToday(o.created_at) || (o.picked_up_at && isToday(o.picked_up_at))),
    [data],
  );
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t, visible.filter((o) => o.status === t).length])),
    [visible],
  );
  const list = visible.filter((o) => o.status === tab);

  async function cancel(id: string) {
    if (!confirm('¿Cancelar este pedido? Las unidades volverán al stock y se gestionará el reembolso.')) return;
    try {
      await api.cancelOrder(id);
      toast('Pedido cancelado', 'info');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageTitle
        action={
          <Link to="/negocio/verificar" className="icon-btn icon-btn--accent" aria-label="Verificar código">
            <IconQr />
          </Link>
        }
      >
        Pedidos del día
      </PageTitle>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {ORDER_STATUS_LABEL[t]} <span className="tabs__count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <ErrorNote error={error} />
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty emoji="📭" title={`Sin pedidos: ${ORDER_STATUS_LABEL[tab].toLowerCase()}`} />}

      <div className="stack">
        {list.map((o) => (
          <article key={o.id} className="order-card">
            <div className="order-card__top">
              <strong>{o.customer_name || 'Cliente'}</strong>
              <StatusBadge status={o.status} />
            </div>
            <ul className="order-card__items">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.quantity} × {i.title}
                </li>
              ))}
            </ul>
            <div className="order-card__top">
              <span className="muted small">
                #{o.id.slice(0, 8).toUpperCase()} · {dateTime(o.paid_at ?? o.created_at)}
              </span>
              <strong>{money(o.total)}</strong>
            </div>
            {o.status === 'pending' && (
              <div className="order-card__actions">
                <Link to="/negocio/verificar" className="pill-btn pill-btn--sm">
                  Entregar con código
                </Link>
                <button className="link-btn" onClick={() => cancel(o.id)}>
                  Cancelar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
