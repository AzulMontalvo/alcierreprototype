import { useParams } from 'react-router-dom';
import { OfferRow } from '../../components/OfferCards';
import { IconClock, IconPhone, IconPin } from '../../components/Icons';
import { Empty, ErrorNote, FoodPlate, Loader, PageTitle, useAsync } from '../../components/ui';
import { useAddToCart } from '../../hooks/useAddToCart';
import { api } from '../../lib/api';
import { categoryInfo, hhmm } from '../../lib/format';

export default function StoreDetail() {
  const { id = '' } = useParams();
  const { data, error, loading } = useAsync(() => api.getBusiness(id), [id]);
  const addToCart = useAddToCart();

  if (loading) return <Loader />;
  if (!data)
    return (
      <>
        <ErrorNote error={error} />
        <Empty emoji="🏪" title="Comercio no encontrado" />
      </>
    );

  const { business: b, offers } = data;
  return (
    <>
      <PageTitle back>{b.name}</PageTitle>
      <section className="panel store-hero">
        <FoodPlate category={b.category} size="lg" />
        <div>
          <span className="store-card__cat">{categoryInfo(b.category).label}</span>
          {b.description && <p className="small">{b.description}</p>}
          <p className="small">
            <IconPin width={14} height={14} />{' '}
            <a href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`} target="_blank" rel="noreferrer">
              {b.address}
            </a>
          </p>
          <p className="small">
            <IconClock width={14} height={14} /> Recolección {hhmm(b.pickup_start)}–{hhmm(b.pickup_end)}
          </p>
          <p className="small">
            <IconPhone width={14} height={14} /> <a href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a>
          </p>
        </div>
      </section>

      <h2 className="section__title">Ofertas de hoy</h2>
      {offers.length === 0 ? (
        <Empty title="Sin ofertas por ahora" />
      ) : (
        <div className="stack">
          {offers.map((o) => (
            <OfferRow key={o.id} offer={o} onAdd={addToCart} showStore={false} />
          ))}
        </div>
      )}
    </>
  );
}
