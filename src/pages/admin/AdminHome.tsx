import { Link } from 'react-router-dom';
import { IconChart, IconStore, IconTag, IconUsers } from '../../components/Icons';
import { ErrorNote, Loader, useAsync } from '../../components/ui';
import { api } from '../../lib/api';
import { money } from '../../lib/format';

export default function AdminHome() {
  const { data, error, loading } = useAsync(async () => {
    const [businesses, orders, settlements, rate] = await Promise.all([
      api.adminListBusinesses(),
      api.adminListOrders(),
      api.adminListSettlements(),
      api.getCommissionRate(),
    ]);
    const paid = orders.filter((o) => o.status !== 'cancelled');
    return {
      pendingBiz: businesses.filter((b) => b.status === 'pending').length,
      gmv: paid.reduce((s, o) => s + o.total, 0),
      commission: paid.reduce((s, o) => s + o.commission, 0),
      toSettle: orders.filter((o) => o.status === 'picked_up' && !o.settlement_id).reduce((s, o) => s + o.payout, 0),
      toPay: settlements.filter((s) => s.status === 'pending').reduce((a, s) => a + s.amount, 0),
      orders: paid.length,
      rate,
    };
  });

  if (loading) return <Loader />;
  if (!data) return <ErrorNote error={error} />;

  return (
    <>
      <section className="hero">
        <p className="hero__hello">Backoffice</p>
        <h1 className="hero__title">Panel de administración</h1>
      </section>

      {data.pendingBiz > 0 && (
        <Link to="/admin/negocios" className="banner">
          🏪 {data.pendingBiz} negocio(s) esperando aprobación →
        </Link>
      )}

      <div className="stats stats--2">
        <div className="stat">
          <span className="stat__num">{money(data.gmv)}</span>
          <span className="stat__label">ventas totales ({data.orders})</span>
        </div>
        <div className="stat">
          <span className="stat__num">{money(data.commission)}</span>
          <span className="stat__label">comisión ({Math.round(data.rate * 100)}%)</span>
        </div>
        <div className="stat">
          <span className="stat__num">{money(data.toSettle)}</span>
          <span className="stat__label">por liquidar</span>
        </div>
        <div className="stat">
          <span className="stat__num">{money(data.toPay)}</span>
          <span className="stat__label">liquidaciones por pagar</span>
        </div>
      </div>

      <div className="quick quick--grid">
        <Link to="/admin/negocios" className="quick__btn">
          <IconStore /> Negocios
        </Link>
        <Link to="/admin/ventas" className="quick__btn">
          <IconChart /> Ventas y liquidaciones
        </Link>
        <Link to="/admin/ofertas" className="quick__btn quick__btn--alt">
          <IconTag /> Publicaciones
        </Link>
        <Link to="/admin/usuarios" className="quick__btn quick__btn--alt">
          <IconUsers /> Usuarios
        </Link>
      </div>
    </>
  );
}
