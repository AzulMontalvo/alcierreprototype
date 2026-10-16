import { useState } from 'react';
import { Empty, ErrorNote, FoodPlate, Loader, PageTitle, useAsync } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { errorMessage, money } from '../../lib/format';

export default function AdminOffers() {
  const { data, error, loading, reload } = useAsync(() => api.adminListOffers());
  const [q, setQ] = useState('');
  const toast = useToast();

  async function toggle(id: string, disabled: boolean) {
    try {
      await api.adminSetOfferDisabled(id, disabled);
      toast(disabled ? 'Publicación bloqueada' : 'Publicación habilitada', 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const needle = q.trim().toLowerCase();
  const list = (data ?? []).filter(
    (o) => !needle || o.title.toLowerCase().includes(needle) || o.business.name.toLowerCase().includes(needle),
  );

  return (
    <>
      <PageTitle>Publicaciones</PageTitle>
      <label className="search">
        <input type="search" placeholder="Buscar oferta o comercio" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <ErrorNote error={error} />
      {loading && !data && <Loader />}
      {data && list.length === 0 && <Empty title="Sin publicaciones" />}
      <div className="stack">
        {list.map((o) => (
          <article key={o.id} className={`manage-card ${o.disabled_by_admin ? 'manage-card--off' : ''}`}>
            <FoodPlate category={o.category} size="sm" />
            <div className="manage-card__info">
              <span className="store-card__cat">{o.business.name}</span>
              <h3>{o.title}</h3>
              <p className="small">
                {money(o.price)} <s className="muted">{money(o.original_price)}</s> · stock {o.stock} ·{' '}
                {o.active ? 'publicada' : 'pausada por el comercio'}
              </p>
              <div className="manage-card__actions">
                {o.disabled_by_admin ? (
                  <button className="pill-btn pill-btn--sm" onClick={() => toggle(o.id, false)}>
                    Habilitar
                  </button>
                ) : (
                  <button className="link-btn" onClick={() => toggle(o.id, true)}>
                    Bloquear publicación
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
