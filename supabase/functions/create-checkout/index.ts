// Crea el pedido (apartando stock) y una sesión de Stripe Checkout.
// POST { items: [{ offer_id, quantity }], origin }  ->  { url, order_id }
import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // Identifica al usuario a partir de su JWT.
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return json({ error: 'No autenticado' }, 401);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: 'No autenticado' }, 401);
  const user = userData.user;

  let body: { items?: { offer_id: string; quantity: number }[]; origin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const items = (body.items ?? []).filter((i) => i && i.offer_id && Number(i.quantity) > 0);
  if (items.length === 0) return json({ error: 'El carrito está vacío' }, 400);

  // Solo se aceptan orígenes configurados para las URLs de retorno.
  const allowed = (Deno.env.get('SITE_URLS') ?? 'http://localhost:5173').split(',').map((s) => s.trim());
  const origin = body.origin && allowed.includes(body.origin) ? body.origin : allowed[0];

  // 1) Pedido + reserva atómica de stock.
  const { data: order, error: orderErr } = await admin.rpc('create_pending_order', {
    p_customer: user.id,
    p_items: items.map((i) => ({ offer_id: i.offer_id, quantity: Math.floor(Number(i.quantity)) })),
  });
  if (orderErr || !order) return json({ error: orderErr?.message ?? 'No se pudo crear el pedido' }, 409);

  const { data: orderItems } = await admin
    .from('order_items')
    .select('title, unit_price, quantity')
    .eq('order_id', order.id);
  const { data: biz } = await admin.from('businesses').select('name').eq('id', order.business_id).single();

  // 2) Sesión de Stripe Checkout (expira en 30 min; si expira, el webhook libera el stock).
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: (orderItems ?? []).map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: (Deno.env.get('CURRENCY') ?? 'mxn').toLowerCase(),
          unit_amount: Math.round(Number(i.unit_price) * 100),
          product_data: { name: `${i.title} · ${biz?.name ?? ''}` },
        },
      })),
      metadata: { order_id: order.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${origin}/pedidos/${order.id}?pago=ok`,
      cancel_url: `${origin}/carrito?pago=cancelado&order=${order.id}`,
    });

    await admin.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return json({ url: session.url, order_id: order.id });
  } catch (e) {
    console.error('stripe error', e);
    await admin.rpc('cancel_unpaid_order', { p_order_id: order.id });
    return json({ error: 'No se pudo iniciar el pago' }, 502);
  }
});
