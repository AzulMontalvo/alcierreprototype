import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconClock, IconPin } from '../../components/Icons';
import { Empty, ErrorNote, FoodPlate, PageTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../lib/api';
import { errorMessage, hhmm, money } from '../../lib/format';

export default function Cart() {
  const cart = useCart();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('pago') === 'cancelado' ? 'El pago fue cancelado. Tu reserva se liberará en unos minutos.' : null,
  );

  if (cart.items.length === 0)
    return (
      <>
        <PageTitle>Mi carrito</PageTitle>
        <ErrorNote error={error} />
        <Empty emoji="🛍️" title="Tu carrito está vacío">
          <Link to="/" className="pill-btn">
            Ver ofertas
          </Link>
        </Empty>
      </>
    );

  const biz = cart.items[0].offer.business;
  const savings = cart.items.reduce((s, i) => s + (i.offer.original_price - i.offer.price) * i.quantity, 0);

  async function pay() {
    if (!profile) {
      nav('/login', { state: { from: '/carrito' } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { redirectUrl } = await api.checkout(cart.items);
      cart.clear();
      if (redirectUrl.startsWith('http')) window.location.href = redirectUrl;
      else nav(redirectUrl);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle>Mi carrito</PageTitle>

      <section className="panel">
        <p className="eyebrow">Recoges en</p>
        <h2 className="panel__title panel__title--sm">{biz.name}</h2>
        <p className="small">
          <IconPin width={14} height={14} /> {biz.address}
        </p>
        <p className="small">
          <IconClock width={14} height={14} /> Hoy de {hhmm(biz.pickup_start)} a {hhmm(biz.pickup_end)}
        </p>
      </section>

      <div className="stack">
        {cart.items.map(({ offer, quantity }) => (
          <div key={offer.id} className="cart-line">
            <FoodPlate category={offer.category} size="sm" />
            <div className="cart-line__info">
              <h3>{offer.title}</h3>
              <p className="small">
                {money(offer.price)} <s className="muted">{money(offer.original_price)}</s>
              </p>
            </div>
            <div className="stepper" aria-label={`Cantidad de ${offer.title}`}>
              <button onClick={() => cart.setQty(offer.id, quantity - 1)} aria-label="Quitar uno">
                −
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => cart.setQty(offer.id, quantity + 1)}
                disabled={quantity >= offer.stock}
                aria-label="Añadir uno"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <section className="summary">
        <div className="summary__row">
          <span>Ahorras</span>
          <span className="success">{money(savings)}</span>
        </div>
        <div className="summary__row summary__row--total">
          <span>Total</span>
          <span>{money(cart.total)}</span>
        </div>
        <ErrorNote error={error} />
        <button className="cta" onClick={pay} disabled={busy}>
          {busy ? 'Conectando con el pago…' : profile ? `Pagar ${money(cart.total)}` : 'Inicia sesión para pagar'}
        </button>
        <p className="muted small center">
          {api.mode === 'demo'
            ? 'Modo demo: el pago es simulado.'
            : 'Pago seguro con Stripe. Se cobra ahora y recoges en el local.'}
        </p>
      </section>
    </>
  );
}
