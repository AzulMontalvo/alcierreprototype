# Al Cierre — MVP de rescate de alimentos (pick-up)

Web app mobile-first (PWA) estilo Too Good To Go. **Stack:** React + TypeScript + CSS puro + Supabase (Postgres, Auth, Realtime, Edge Functions) + Stripe Checkout + Resend (correo).

## Probar ya (modo demo)

```bash
npm install
npm run dev
```

Sin variables de Supabase la app arranca en **modo demo**: datos en `localStorage`, pago simulado. En `/login` hay botones de acceso rápido:

| Cuenta | Correo | Contraseña |
|---|---|---|
| Cliente | cliente@demo.com | demo1234 |
| Negocio | negocio@demo.com | demo1234 |
| Admin | admin@demo.com | demo1234 |

El botón **demo ↺** del encabezado restablece los datos. Abre dos pestañas (cliente y negocio) para ver la alerta de pedido entrante.

## Módulos

**Cliente** — catálogo con búsqueda y filtros, explorar comercios, carrito (un comercio por pedido), pago con Stripe, ticket digital con código de 6 dígitos + QR, instrucciones y mapa, historial.

**Negocio** — registro (nombre, categoría, dirección, horario de recolección, teléfono) sujeto a aprobación; publicar/editar/pausar ofertas (precio original vs. rescate, stock); pedidos del día con estados Pendiente / Recogido / Cancelado; verificación de entrega por código; alertas web en tiempo real.

**Admin** — aprobar/rechazar/suspender negocios; bloquear publicaciones; deshabilitar usuarios; transacciones con comisión (15 % por defecto), generación de liquidaciones por comercio, marcarlas como pagadas y exportar CSV.

## Producción con Supabase + Stripe

1. Crea un proyecto en Supabase y aplica el esquema:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
2. Crea el primer admin (tras registrarte normalmente), en el SQL editor:
   ```sql
   update profiles set role = 'admin' where email = 'tu@correo.com';
   ```
3. Secretos de las Edge Functions:
   ```bash
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... RESEND_API_KEY=re_... EMAIL_FROM="Al Cierre <pedidos@tudominio.com>" SITE_URLS=https://tu-app.com,http://localhost:5173 CURRENCY=mxn
   ```
4. Despliega las funciones:
   ```bash
   npx supabase functions deploy create-checkout
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```
5. En Stripe → Webhooks, apunta a `https://<ref>.supabase.co/functions/v1/stripe-webhook` con los eventos `checkout.session.completed` y `checkout.session.expired`.
6. Copia `.env.example` a `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### Flujo de pago

1. `create-checkout` llama a `create_pending_order` (SQL, transaccional): valida stock y lo aparta; el pedido queda en `awaiting_payment`.
2. Se crea la sesión de Stripe Checkout (expira en 30 min).
3. `stripe-webhook`:
   - `completed` → `mark_order_paid` genera el código único y envía los correos al cliente (con el código) y al comercio.
   - `expired` → `cancel_unpaid_order` libera el stock.
4. El comercio recibe la alerta por Realtime y verifica con `verify_pickup(code)`.

### Seguridad (RLS)

- El código de recolección vive en `order_codes`, que solo puede leer el cliente; el comercio solo lo **verifica** vía RPC.
- Los dueños no pueden auto-aprobarse ni quitar bloqueos de admin (triggers `guard_*`).
- El registro nunca permite asignarse el rol `admin`.
- Pedidos y stock solo se modifican desde funciones `security definer` o Edge Functions con service role.

## Fuera del alcance del MVP

- Reparto a domicilio (solo pick-up).
- Reembolsos automáticos: al cancelar un pedido pagado, el reembolso se hace desde el panel de Stripe.
- Subida de fotos: las ofertas usan una ilustración por categoría.
- Escaneo del QR desde la app del negocio (hoy se teclea el código; el QR contiene el mismo código).
