import { useMemo, useState } from 'react';
import { Empty, ErrorNote, Loader, PageTitle, StatusBadge, useAsync } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { dateTime, errorMessage, money } from '../../lib/format';
import type { Order } from '../../lib/types';

type Tab = 'balances' | 'transactions' | 'settlements';

function exportCsv(orders: Order[]) {
  const rows = [
    ['pedido', 'fecha', 'comercio', 'estado', 'total', 'comision', 'neto_comercio', 'liquidacion'],
    ...orders.map((o) => [
      o.id, o.created_at, o.business.name, o.status, o.total, o.commission, o.payout, o.settlement_id ?? '',
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `transacciones-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminSales() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [orders, settlements, businesses] = await Promise.all([
      api.adminListOrders(),
      api.adminListSettlements(),
      api.adminListBusinesses(),
    ]);
    return { orders, settlements, businesses };
  });
  const [tab, setTab] = useState<Tab>('balances');
  const toast = useToast();

  // Saldo por comercio: pedidos entregados y aún no incluidos en una liquidación.
  const balances = useMemo(() => {
    if (!data) return [];
    return data.businesses
      .map((b) => {
        const mine = data.orders.filter((o) => o.business_id === b.id && o.status === 'picked_up');
        const unsettled = mine.filter((o) => !o.settlement_id);
        return {
          business: b,
          sold: mine.reduce((s, o) => s + o.total, 0),
          unsettledCount: unsettled.length,
          unsettledAmount: unsettled.reduce((s, o) => s + o.payout, 0),
        };
      })
      .filter((x) => x.sold > 0)
      .sort((a, b) => b.unsettledAmount - a.unsettledAmount);
  }, [data]);

  const bizName = (id: string) => data?.businesses.find((b) => b.id === id)?.name ?? '—';

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      toast(ok, 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageTitle
        action={
          data && (
            <button className="pill-btn pill-btn--sm" onClick={() => exportCsv(data.orders)}>
              CSV
            </button>
          )
        }
      >
        Ventas
      </PageTitle>
      <div className="tabs" role="tablist">
        {(
          [
            ['balances', 'Por liquidar'],
            ['transactions', 'Transacciones'],
            ['settlements', 'Liquidaciones'],
          ] as const
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>
      <ErrorNote error={error} />
      {loading && !data && <Loader />}

      {data && tab === 'balances' && (
        <div className="stack">
          {balances.length === 0 && <Empty emoji="💸" title="Aún no hay ventas entregadas" />}
          {balances.map((x) => (
            <article key={x.business.id} className="order-card">
              <div className="order-card__top">
                <strong>{x.business.name}</strong>
                <span className="small">vendido {money(x.sold)}</span>
              </div>
              <p className="small">
                {x.unsettledCount} pedido(s) entregados sin liquidar · neto a pagar{' '}
                <strong>{money(x.unsettledAmount)}</strong>
              </p>
              <div className="order-card__actions">
                <button
                  className="pill-btn pill-btn--sm"
                  disabled={x.unsettledCount === 0}
                  onClick={() => run(() => api.adminCreateSettlement(x.business.id), 'Liquidación generada')}
                >
                  Generar liquidación
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && tab === 'transactions' && (
        <div className="stack">
          {data.orders.length === 0 && <Empty title="Sin transacciones" />}
          {data.orders.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-card__top">
                <strong>{o.business.name}</strong>
                <StatusBadge status={o.status} />
              </div>
              <p className="small muted">
                #{o.id.slice(0, 8).toUpperCase()} · {dateTime(o.created_at)} · {o.customer_name}
              </p>
              <div className="ledger">
                <span>Total {money(o.total)}</span>
                <span>Comisión {money(o.commission)}</span>
                <span>Neto {money(o.payout)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && tab === 'settlements' && (
        <div className="stack">
          {data.settlements.length === 0 && <Empty emoji="🧾" title="Aún no hay liquidaciones" />}
          {data.settlements.map((s) => (
            <article key={s.id} className="order-card">
              <div className="order-card__top">
                <strong>{bizName(s.business_id)}</strong>
                <span className={`badge ${s.status === 'paid' ? 'badge--picked_up' : 'badge--pending'}`}>
                  {s.status === 'paid' ? 'Pagada' : 'Por pagar'}
                </span>
              </div>
              <p className="small">
                {s.orders_count} pedido(s) · <strong>{money(s.amount)}</strong> · {dateTime(s.created_at)}
              </p>
              {s.status === 'pending' && (
                <div className="order-card__actions">
                  <button
                    className="pill-btn pill-btn--sm"
                    onClick={() => run(() => api.adminMarkSettlementPaid(s.id), 'Liquidación marcada como pagada')}
                  >
                    Marcar como pagada
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
