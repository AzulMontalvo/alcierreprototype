import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IconCheck, IconClock, IconPhone, IconPin } from '../../components/Icons';
import { Empty, ErrorNote, Loader, PageTitle, StatusBadge, useAsync } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { dateTime, hhmm, money } from '../../lib/format';

export default function Ticket() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const { data: order, error, loading, reload } = useAsync(() => api.getMyOrder(id), [id]);
  const justPaid = params.get('pago') === 'ok';

  // Tras volver de Stripe el webhook puede tardar unos segundos en confirmar.
  const waiting = order?.status === 'awaiting_payment';
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(reload, 2500);
    return () => clearInterval(t);
  }, [waiting, reload]);

  if (loading && !order) return <Loader />;
  if (!order)
    return (
      <>
        <ErrorNote error={error} />
        <Empty emoji="🎟️" title="Pedido no encontrado" />
      </>
    );

  const b = order.business;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${b.name}, ${b.address}`)}`;

  return (
    <>
      <PageTitle back>Ticket digital</PageTitle>

      {waiting ? (
        <section className="panel center">
          <Loader label="Confirmando pago" />
          <p>Confirmando tu pago… esto tarda solo unos segundos.</p>
        </section>
      ) : (
        <>
          {justPaid && order.status === 'pending' && (
            <div className="banner banner--success">
              <IconCheck /> ¡Pago confirmado! Te enviamos el código a {profile?.email}.
              {api.mode === 'demo' && <small> (correo simulado en modo demo)</small>}
            </div>
          )}

          <section className={`ticket ticket--${order.status}`}>
            <div className="ticket__head">
              <span>Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
              <StatusBadge status={order.status} />
            </div>

            {order.status === 'pending' && order.code && (
              <>
                <p className="ticket__label">Código de recolección</p>
                <p className="ticket__code" aria-label={`Código ${order.code.split('').join(' ')}`}>
                  {order.code}
                </p>
                <div className="ticket__qr">
                  <QRCodeSVG value={order.code} size={168} bgColor="#ffffff" fgColor="#4a2410" level="M" />
                </div>
                <p className="ticket__hint">Muéstralo en el mostrador para recibir tu pedido.</p>
              </>
            )}
            {order.status === 'picked_up' && (
              <p className="ticket__done">
                ✅ Entregado {order.picked_up_at ? dateTime(order.picked_up_at) : ''}. ¡Gracias por rescatar comida!
              </p>
            )}
            {order.status === 'cancelled' && (
              <p className="ticket__done">Este pedido fue cancelado. Si ya pagaste, recibirás el reembolso.</p>
            )}

            <div className="ticket__cut" aria-hidden />

            <ul className="ticket__items">
              {order.items.map((i) => (
                <li key={i.id}>
                  <span>
                    {i.quantity} × {i.title}
                  </span>
                  <span>{money(i.unit_price * i.quantity)}</span>
                </li>
              ))}
              <li className="ticket__total">
                <span>Total pagado</span>
                <span>{money(order.total)}</span>
              </li>
            </ul>
          </section>

          {order.status === 'pending' && (
            <section className="panel">
              <h2 className="panel__title panel__title--sm">Cómo recoger</h2>
              <ol className="steps">
                <li>
                  Acude a <strong>{b.name}</strong> hoy entre{' '}
                  <strong>
                    {hhmm(b.pickup_start)} y {hhmm(b.pickup_end)}
                  </strong>
                  .
                </li>
                <li>Muestra tu código de 6 dígitos o el QR al personal.</li>
                <li>Lleva tu propia bolsa si puedes 🌱.</li>
              </ol>
              <p className="small">
                <IconPin width={14} height={14} /> {b.address}
              </p>
              <p className="small">
                <IconClock width={14} height={14} /> Ventana de recolección {hhmm(b.pickup_start)}–{hhmm(b.pickup_end)}
              </p>
              <p className="small">
                <IconPhone width={14} height={14} /> <a href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a>
              </p>
              <a className="pill-btn" href={mapsUrl} target="_blank" rel="noreferrer">
                Cómo llegar
              </a>
            </section>
          )}
        </>
      )}

      <p className="center">
        <Link to="/pedidos" className="link-btn">
          Ver todos mis pedidos
        </Link>
      </p>
    </>
  );
}
