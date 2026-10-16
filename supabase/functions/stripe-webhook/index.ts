// Webhook de Stripe. Desplegar con --no-verify-jwt (Stripe no envía JWT de Supabase).
// checkout.session.completed -> pedido pagado + código + correos
// checkout.session.expired   -> cancela y libera stock
import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { businessNewOrderHtml, customerConfirmationHtml, sendEmail } from '../_shared/email.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE_URL = (Deno.env.get('SITE_URLS') ?? 'http://localhost:5173').split(',')[0].trim();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (e) {
    console.error('firma inválida', e);
    return new Response('Bad signature', { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  if (!orderId) return new Response('ok');

  if (event.type === 'checkout.session.expired') {
    await admin.rpc('cancel_unpaid_order', { p_order_id: orderId });
    return new Response('ok');
  }

  if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
    // Evita reenviar correos si Stripe reintenta el evento.
    const { data: before } = await admin.from('orders').select('status').eq('id', orderId).single();
    const firstTime = before?.status === 'awaiting_payment';

    const { data: code, error } = await admin.rpc('mark_order_paid', {
      p_order_id: orderId,
      p_session_id: session.id,
    });
    if (error) {
      console.error(error);
      return new Response('error', { status: 500 });
    }
    if (!firstTime) return new Response('ok');

    const { data: order } = await admin
      .from('orders')
      .select('total, customer:profiles!orders_customer_id_fkey(email, full_name), business:businesses(name, address, phone, pickup_start, pickup_end, owner:profiles!businesses_owner_id_fkey(email)), order_items(title, unit_price, quantity)')
      .eq('id', orderId)
      .single();

    if (order) {
      // deno-lint-ignore no-explicit-any
      const o = order as any;
      const items = o.order_items.map((i: any) => ({ ...i, unit_price: Number(i.unit_price) }));
      await Promise.all([
        sendEmail(
          o.customer.email,
          `Tu código de recolección: ${code}`,
          customerConfirmationHtml(code as string, `${SITE_URL}/pedidos/${orderId}`, o.business, items, Number(o.total)),
        ),
        sendEmail(
          o.business.owner.email,
          '📦 Nuevo pedido en Al Cierre',
          businessNewOrderHtml(o.customer.full_name, items, Number(o.total), `${SITE_URL}/negocio/pedidos`),
        ),
      ]);
    }
  }
  return new Response('ok');
});
