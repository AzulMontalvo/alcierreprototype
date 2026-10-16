import { Link } from 'react-router-dom';
import { IconPlus, IconQr } from '../../components/Icons';
import { Empty, ErrorNote, FoodPlate, Loader, StatusBadge, useAsync } from '../../components/ui';
import { api } from '../../lib/api';
import { BUSINESS_STATUS_LABEL, hhmm, isToday, money } from '../../lib/format';

export default function BusinessHome() {
  const { data, error, loading } = useAsync(async () => {
    const business = await api.getMyBusiness();
    if (!business) return { business: null, orders: [], offers: [] };
    const [orders, offers] = await Promise.all([api.listBusinessOrders(), api.listMyOffers()]);
    return { business, orders, offers };
  });

  if (loading) return <Loader />;
  if (error) return <ErrorNote error={error} />;
  if (!data?.business)
    return (
      <Empty emoji="🏪" title="Registra tu negocio para empezar">
        <p className="muted">Nombre, dirección, horario de recolección y teléfono. Tarda 1 minuto.</p>
        <Link to="/negocio/perfil" className="pill-btn">
          Registrar negocio
        </Link>
      </Empty>
    );

  const { business: b, orders, offers } = data;
  const pending = orders.filter((o) => o.status === 'pending');
  const todaySales = orders.filter((o) => isToday(o.created_at) && o.status !== 'cancelled');
  const liveOffers = offers.filter((o) => o.active && !o.disabled_by_admin && o.stock > 0);

  return (
    <>
      <section className="hero">
        <p className="hero__hello">Panel del negocio</p>
        <h1 className="hero__title">{b.name}</h1>
        <p className="small">
          Recolección hoy {hhmm(b.pickup_start)}–{hhmm(b.pickup_end)} ·{' '}
          <span className={`dot ${b.status === 'approved' ? 'dot--on' : ''}`}>{BUSINESS_STATUS_LABEL[b.status]}</span>
        </p>
      </section>

      {b.status === 'pending' && (
        <div className="banner">⏳ Tu negocio está en revisión. Puedes preparar ofertas; serán visibles cuando lo aprobemos.</div>
      )}
      {b.status === 'suspended' && (
        <div className="banner banner--error">🚫 Tu negocio está suspendido. Contacta a soporte.</div>
      )}

      <div className="stats">
        <div className="stat">
          <span className="stat__num">{pending.length}</span>
          <span className="stat__label">por entregar</span>
        </div>
        <div className="stat">
          <span className="stat__num">{money(todaySales.reduce((s, o) => s + o.payout, 0))}</span>
          <span className="stat__label">ingreso neto hoy</span>
        </div>
        <div className="stat">
          <span className="stat__num">{liveOffers.length}</span>
          <span className="stat__label">ofertas activas</span>
        </div>
      </div>

      <div className="quick">
        <Link to="/negocio/ofertas/nueva" className="quick__btn">
          <IconPlus /> Publicar oferta
        </Link>
        <Link to="/negocio/verificar" className="quick__btn quick__btn--alt">
          <IconQr /> Verificar código
        </Link>
      </div>

      <section className="section">
        <h2 className="section__title">Por entregar</h2>
        {pending.length === 0 ? (
          <p className="muted">No hay pedidos pendientes.</p>
        ) : (
          <div className="stack">
            {pending.slice(0, 5).map((o) => (
              <Link to="/negocio/pedidos" key={o.id} className="order-card">
                <div className="order-card__top">
                  <strong>{o.customer_name || 'Cliente'}</strong>
                  <StatusBadge status={o.status} />
                </div>
                <p className="small">{o.items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {liveOffers.length > 0 && (
        <section className="section">
          <h2 className="section__title">En vitrina</h2>
          <div className="mini-grid">
            {liveOffers.map((o) => (
              <Link key={o.id} to={`/negocio/ofertas/${o.id}`} className="mini-card">
                <FoodPlate category={o.category} size="sm" />
                <span className="mini-card__title">{o.title}</span>
                <span className="small">
                  {o.stock} disp. · {money(o.price)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
