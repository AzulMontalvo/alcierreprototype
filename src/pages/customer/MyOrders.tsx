import { Link } from 'react-router-dom';
import { Empty, ErrorNote, Loader, PageTitle, StatusBadge, useAsync } from '../../components/ui';
import { api } from '../../lib/api';
import { dateTime, money } from '../../lib/format';

export default function MyOrders() {
  const { data, error, loading } = useAsync(() => api.listMyOrders());

  return (
    <>
      <PageTitle>Mis pedidos</PageTitle>
      <ErrorNote error={error} />
      {loading && <Loader />}
      {data?.length === 0 && (
        <Empty emoji="🎟️" title="Aún no tienes pedidos">
          <Link to="/" className="pill-btn">
            Rescatar comida
          </Link>
        </Empty>
      )}
      <div className="stack">
        {data?.map((o) => (
          <Link key={o.id} to={`/pedidos/${o.id}`} className={`order-card ${o.status === 'pending' ? 'order-card--hot' : ''}`}>
            <div className="order-card__top">
              <strong>{o.business.name}</strong>
              <StatusBadge status={o.status} />
            </div>
            <p className="small">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}</p>
            <div className="order-card__top">
              <span className="muted small">{dateTime(o.created_at)}</span>
              <strong>{money(o.total)}</strong>
            </div>
            {o.status === 'pending' && <span className="order-card__cta">Ver código de recolección →</span>}
          </Link>
        ))}
      </div>
    </>
  );
}
