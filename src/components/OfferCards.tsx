import { Link } from 'react-router-dom';
import { discountPct, hhmm, money } from '../lib/format';
import type { OfferWithBusiness } from '../lib/types';
import { IconClock } from './Icons';
import { FoodPlate } from './ui';

interface Props {
  offer: OfferWithBusiness;
  onAdd: (o: OfferWithBusiness) => void;
}

/** Tarjeta grande amarilla para el carrusel destacado. */
export function FeaturedOfferCard({ offer, onAdd }: Props) {
  const off = discountPct(offer.original_price, offer.price);
  return (
    <article className="feature-card">
      <span className="feature-card__pct">-{off}%</span>
      <div className="feature-card__info">
        <Link to={`/comercios/${offer.business_id}`} className="feature-card__store">
          {offer.business.name}
        </Link>
        <h3 className="feature-card__title">{offer.title}</h3>
        <p className="feature-card__meta">
          <IconClock width={14} height={14} /> Recoge hasta {hhmm(offer.business.pickup_end)}
        </p>
        <p className="feature-card__price">
          <strong>{money(offer.price)}</strong> <s>{money(offer.original_price)}</s>
        </p>
        <button className="pill-btn" onClick={() => onAdd(offer)}>
          Lo quiero
        </button>
      </div>
      <div className="feature-card__art">
        <FoodPlate category={offer.category} size="lg" />
        <span className="stock-chip">{offer.stock} disp.</span>
      </div>
    </article>
  );
}

/** Fila de lista (estilo "Favorite food" de la referencia). */
export function OfferRow({ offer, onAdd, showStore = true }: Props & { showStore?: boolean }) {
  return (
    <article className="offer-row">
      <div className="offer-row__art">
        <FoodPlate category={offer.category} size="md" />
      </div>
      <div className="offer-row__info">
        {showStore && (
          <Link to={`/comercios/${offer.business_id}`} className="offer-row__store">
            {offer.business.name}
          </Link>
        )}
        <h3 className="offer-row__title">{offer.title}</h3>
        <p className="offer-row__meta">
          <IconClock width={13} height={13} /> Cierra {hhmm(offer.business.pickup_end)} · {offer.stock} disp.
        </p>
        <div className="offer-row__bottom">
          <p className="offer-row__price">
            <strong>{money(offer.price)}</strong> <s>{money(offer.original_price)}</s>
          </p>
          <button className="pill-btn pill-btn--sm" onClick={() => onAdd(offer)} disabled={offer.stock < 1}>
            {offer.stock < 1 ? 'Agotado' : 'Lo quiero'}
          </button>
        </div>
      </div>
    </article>
  );
}
