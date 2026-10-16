// Envío de correos transaccionales con Resend (https://resend.com).
// Si RESEND_API_KEY no está configurada, solo se registra en logs.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Al Cierre <pedidos@example.com>';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[email:dry-run] to=${to} subject="${subject}"`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) console.error('[email] error', res.status, await res.text());
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

type Item = { title: string; quantity: number; unit_price: number };
type Biz = { name: string; address: string; pickup_start: string; pickup_end: string; phone: string };

const wrap = (inner: string) => `
<div style="font-family:Arial,sans-serif;background:#4a2410;padding:24px;color:#fff7ec">
  <div style="max-width:480px;margin:auto;background:#7b4417;border-radius:24px;padding:24px">
    <h1 style="margin:0 0 12px;color:#ffb938;font-size:22px">Al Cierre</h1>
    ${inner}
  </div>
</div>`;

const itemsTable = (items: Item[]) =>
  items.map((i) => `<li>${i.quantity} × ${esc(i.title)} — ${money(i.unit_price * i.quantity)}</li>`).join('');

export function customerConfirmationHtml(code: string, orderUrl: string, biz: Biz, items: Item[], total: number) {
  return wrap(`
    <p>¡Gracias por rescatar comida! Tu pedido está pagado.</p>
    <p style="margin:20px 0 4px">Tu código de recolección:</p>
    <div style="background:#ffb938;color:#4a2410;font-size:36px;font-weight:bold;letter-spacing:8px;
                text-align:center;border-radius:16px;padding:16px">${esc(code)}</div>
    <h3 style="color:#ffb938">Dónde recoger</h3>
    <p><b>${esc(biz.name)}</b><br>${esc(biz.address)}<br>
       Horario de recolección: <b>${biz.pickup_start.slice(0, 5)}–${biz.pickup_end.slice(0, 5)}</b><br>
       Tel. ${esc(biz.phone)}</p>
    <ul>${itemsTable(items)}</ul>
    <p><b>Total pagado: ${money(total)}</b></p>
    <p>Muestra este código (o el QR en la app) en el mostrador.</p>
    <p><a style="color:#ffb938" href="${orderUrl}">Ver mi ticket digital</a></p>`);
}

export function businessNewOrderHtml(customerName: string, items: Item[], total: number, panelUrl: string) {
  return wrap(`
    <p>📦 <b>¡Nuevo pedido!</b> ${esc(customerName || 'Un cliente')} reservó:</p>
    <ul>${itemsTable(items)}</ul>
    <p><b>Total: ${money(total)}</b></p>
    <p>El cliente presentará un código de 6 dígitos al recoger.</p>
    <p><a style="color:#ffb938" href="${panelUrl}">Abrir pedidos del día</a></p>`);
}
