import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FeaturedOfferCard, OfferRow } from '../../components/OfferCards';
import { IconSearch } from '../../components/Icons';
import { Empty, ErrorNote, Loader, useAsync } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAddToCart } from '../../hooks/useAddToCart';
import { api } from '../../lib/api';
import { CATEGORIES, discountPct } from '../../lib/format';
import type { Category } from '../../lib/types';

export default function Home() {
  const { profile } = useAuth();
  const { data: offers, error, loading } = useAsync(() => api.listOffers());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | null>(null);
  const addToCart = useAddToCart();

  const featured = useMemo(
    () =>
      [...(offers ?? [])]
        .sort((a, b) => discountPct(b.original_price, b.price) - discountPct(a.original_price, a.price))
        .slice(0, 5),
    [offers],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (offers ?? []).filter(
      (o) =>
        (!cat || o.category === cat) &&
        (!needle ||
          o.title.toLowerCase().includes(needle) ||
          o.business.name.toLowerCase().includes(needle) ||
          o.description.toLowerCase().includes(needle)),
    );
  }, [offers, q, cat]);

  if (profile?.role === 'business') return <Navigate to="/negocio" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  const first = profile?.full_name.split(' ')[0];

  return (
    <>
      <section className="hero">
        <p className="hero__hello">¡Hola{first ? `, ${first}` : ''}!</p>
        <h1 className="hero__title">Rescata comida rica al cierre</h1>
        <label className="search">
          <IconSearch width={18} height={18} />
          <input
            type="search"
            placeholder="Busca pan, comida, fruta o un local"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar ofertas"
          />
        </label>
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          <button className={`chip ${cat === null ? 'chip--on' : ''}`} onClick={() => setCat(null)}>
            Todo
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`chip ${cat === c.id ? 'chip--on' : ''}`}
              onClick={() => setCat(cat === c.id ? null : c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </section>

      <ErrorNote error={error} />
      {loading && <Loader />}

      {!loading && !q && !cat && featured.length > 0 && (
        <section className="panel panel--bleed">
          <h2 className="panel__title">Mayores descuentos</h2>
          <div className="carousel">
            {featured.map((o) => (
              <FeaturedOfferCard key={o.id} offer={o} onAdd={addToCart} />
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="section">
          <h2 className="section__title">{q || cat ? `${filtered.length} resultados` : 'Disponibles hoy'}</h2>
          {filtered.length === 0 ? (
            <Empty title="No hay ofertas que coincidan">
              <p className="muted">Vuelve más tarde: los comercios publican al acercarse su cierre.</p>
            </Empty>
          ) : (
            <div className="stack">
              {filtered.map((o) => (
                <OfferRow key={o.id} offer={o} onAdd={addToCart} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
