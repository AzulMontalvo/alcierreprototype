import { Link } from 'react-router-dom';
import { IconPlus } from '../../components/Icons';
import { Empty, ErrorNote, FoodPlate, Loader, PageTitle, useAsync } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { discountPct, errorMessage, money } from '../../lib/format';

export default function BusinessOffers() {
  const { data, error, loading, reload } = useAsync(() => api.listMyOffers());
  const toast = useToast();

  async function toggle(id: string, active: boolean) {
    try {
      await api.setOfferActive(id, active);
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  return (
    <>
      <PageTitle
        action={
          <Link to="/negocio/ofertas/nueva" className="icon-btn icon-btn--accent" aria-label="Nueva oferta">
            <IconPlus />
          </Link>
        }
      >
        Mis ofertas
      </PageTitle>
      <ErrorNote error={error} />
      {loading && <Loader />}
      {data?.length === 0 && (
        <Empty emoji="🥐" title="Aún no publicas ofertas">
          <Link to="/negocio/ofertas/nueva" className="pill-btn">
            Publicar mi primera oferta
          </Link>
        </Empty>
      )}
      <div className="stack">
        {data?.map((o) => (
          <article key={o.id} className={`manage-card ${!o.active || o.disabled_by_admin ? 'manage-card--off' : ''}`}>
            <FoodPlate category={o.category} size="sm" />
            <div className="manage-card__info">
              <h3>{o.title}</h3>
              <p className="small">
                {money(o.price)} <s className="muted">{money(o.original_price)}</s> · -{discountPct(o.original_price, o.price)}%
              </p>
              <p className="small">
                Stock: <strong>{o.stock}</strong>
                {o.stock === 0 && <span className="dot"> agotado</span>}
              </p>
              {o.disabled_by_admin && <p className="small error-text">Bloqueada por administración</p>}
              <div className="manage-card__actions">
                <Link to={`/negocio/ofertas/${o.id}`} className="pill-btn pill-btn--sm">
                  Editar
                </Link>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={o.active}
                    onChange={(e) => toggle(o.id, e.target.checked)}
                    disabled={o.disabled_by_admin}
                  />
                  <span>{o.active ? 'Publicada' : 'Pausada'}</span>
                </label>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
