-- =====================================================================
-- Al Cierre — esquema inicial
-- Pedidos solo pick-up. Pago con Stripe antes de la recolección.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.user_role as enum ('customer', 'business', 'admin');
create type public.business_status as enum ('pending', 'approved', 'suspended');
create type public.business_category as enum
  ('restaurante', 'panaderia', 'fruteria', 'cafeteria', 'pasteleria', 'supermercado');
-- awaiting_payment: reservado, esperando pago en Stripe (stock ya apartado)
-- pending: pagado, pendiente de recoger | picked_up: entregado | cancelled
create type public.order_status as enum ('awaiting_payment', 'pending', 'picked_up', 'cancelled');
create type public.settlement_status as enum ('pending', 'paid');

-- ---------- Tablas ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'customer',
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (length(name) between 2 and 80),
  category public.business_category not null,
  address text not null check (length(address) >= 5),
  phone text not null check (length(phone) >= 7),
  pickup_start time not null,
  pickup_end time not null,
  description text not null default '',
  status public.business_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (length(title) between 2 and 80),
  description text not null default '',
  category public.business_category not null,
  original_price numeric(10, 2) not null check (original_price > 0),
  price numeric(10, 2) not null check (price > 0),
  stock integer not null check (stock >= 0),
  active boolean not null default true,
  disabled_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint price_is_discounted check (price < original_price)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  amount numeric(10, 2) not null,
  orders_count integer not null,
  status public.settlement_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  customer_name text not null default '', -- copia para que el comercio no lea profiles
  business_id uuid not null references public.businesses (id),
  status public.order_status not null default 'awaiting_payment',
  total numeric(10, 2) not null,
  commission numeric(10, 2) not null,
  payout numeric(10, 2) not null,
  stripe_session_id text unique,
  settlement_id uuid references public.settlements (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  picked_up_at timestamptz,
  cancelled_at timestamptz
);
create index orders_business_idx on public.orders (business_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  offer_id uuid not null references public.offers (id),
  title text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

-- El código de recolección vive aparte para que el comercio NO pueda leerlo:
-- solo el cliente lo ve; el comercio solo puede verificarlo vía RPC.
create table public.order_codes (
  order_id uuid primary key references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  business_id uuid not null references public.businesses (id),
  code text not null,
  unique (business_id, code)
);

create table public.app_settings (
  id boolean primary key default true check (id), -- fila única
  commission_rate numeric(4, 3) not null default 0.15 check (commission_rate between 0 and 1)
);
insert into public.app_settings default values;

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not disabled);
$$;

create or replace function public.owns_business(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from businesses where id = p_business_id and owner_id = auth.uid());
$$;

-- Perfil automático al registrarse. Nunca permite auto-asignarse 'admin'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::user_role
         else 'customer'::user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Los dueños no pueden cambiar el estado de aprobación de su propio negocio.
create or replace function public.guard_business_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
    else
      new.status := old.status;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;
create trigger businesses_guard before insert or update on public.businesses
  for each row execute function public.guard_business_status();

-- Los comercios no pueden quitarse un bloqueo de admin.
create or replace function public.guard_offer_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    if tg_op = 'INSERT' then
      new.disabled_by_admin := false;
    else
      new.disabled_by_admin := old.disabled_by_admin;
      new.business_id := old.business_id;
    end if;
  end if;
  return new;
end $$;
create trigger offers_guard before insert or update on public.offers
  for each row execute function public.guard_offer_admin_flag();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_codes enable row level security;
alter table public.settlements enable row level security;
alter table public.app_settings enable row level security;

-- profiles: cada quien ve el suyo; admin ve todos. Solo full_name es editable por el usuario.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- businesses
create policy businesses_select on public.businesses for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy businesses_insert on public.businesses for insert
  with check (owner_id = auth.uid()
              and exists (select 1 from public.profiles where id = auth.uid() and role = 'business'));
create policy businesses_update on public.businesses for update
  using (owner_id = auth.uid() or public.is_admin());

-- offers
create policy offers_select on public.offers for select using (
  (active and not disabled_by_admin
     and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved'))
  or public.owns_business(business_id)
  or public.is_admin()
);
create policy offers_insert on public.offers for insert
  with check (public.owns_business(business_id));
create policy offers_update on public.offers for update
  using (public.owns_business(business_id) or public.is_admin());

-- orders / items: solo lectura desde el cliente; las escrituras pasan por RPC o Edge Functions.
create policy orders_select on public.orders for select using (
  customer_id = auth.uid() or public.owns_business(business_id) or public.is_admin()
);
create policy order_items_select on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id
          and (o.customer_id = auth.uid() or public.owns_business(o.business_id) or public.is_admin()))
);
create policy order_codes_select on public.order_codes for select using (customer_id = auth.uid());

create policy settlements_select on public.settlements for select
  using (public.owns_business(business_id) or public.is_admin());

create policy app_settings_select on public.app_settings for select using (true);
create policy app_settings_update on public.app_settings for update using (public.is_admin());

-- ---------- Flujo de pedido (solo service_role: lo usan las Edge Functions) ----------

-- Crea el pedido y aparta stock de forma atómica.
-- p_items: [{"offer_id": "...", "quantity": 1}, ...]
create or replace function public.create_pending_order(p_customer uuid, p_items jsonb)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_business uuid;
  v_total numeric(10, 2) := 0;
  v_rate numeric;
  v_item jsonb;
  v_offer offers;
  v_qty int;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if exists (select 1 from profiles where id = p_customer and disabled) then
    raise exception 'Cuenta deshabilitada';
  end if;

  select commission_rate into v_rate from app_settings;

  insert into orders (customer_id, customer_name, business_id, total, commission, payout)
  values (p_customer,
          (select full_name from profiles where id = p_customer),
          (select business_id from offers where id = (p_items -> 0 ->> 'offer_id')::uuid),
          0, 0, 0)
  returning * into v_order;
  v_business := v_order.business_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty < 1 then raise exception 'Cantidad inválida'; end if;

    update offers o set stock = o.stock - v_qty
    where o.id = (v_item ->> 'offer_id')::uuid
      and o.stock >= v_qty and o.active and not o.disabled_by_admin
      and o.business_id = v_business
      and exists (select 1 from businesses b where b.id = o.business_id and b.status = 'approved')
    returning o.* into v_offer;

    if not found then
      raise exception 'Una oferta ya no está disponible o no hay unidades suficientes';
    end if;

    insert into order_items (order_id, offer_id, title, unit_price, quantity)
    values (v_order.id, v_offer.id, v_offer.title, v_offer.price, v_qty);
    v_total := v_total + v_offer.price * v_qty;
  end loop;

  update orders set total = v_total,
                    commission = round(v_total * v_rate, 2),
                    payout = v_total - round(v_total * v_rate, 2)
  where id = v_order.id
  returning * into v_order;
  return v_order;
end $$;

-- Marca como pagado y genera un código de 6 dígitos único por comercio. Idempotente.
create or replace function public.mark_order_paid(p_order_id uuid, p_session_id text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_code text;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;

  if v_order.status = 'awaiting_payment' then
    update orders set status = 'pending', paid_at = now(), stripe_session_id = p_session_id
    where id = p_order_id;
  end if;

  select code into v_code from order_codes where order_id = p_order_id;
  if v_code is null then
    loop
      v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
      begin
        insert into order_codes (order_id, customer_id, business_id, code)
        values (p_order_id, v_order.customer_id, v_order.business_id, v_code);
        exit;
      exception when unique_violation then
        -- colisión con otro pedido del mismo comercio: reintentar
      end;
    end loop;
  end if;
  return v_code;
end $$;

-- Libera el stock de un pedido no pagado (sesión de Stripe expirada o fallida).
create or replace function public.cancel_unpaid_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'cancelled', cancelled_at = now()
  where id = p_order_id and status = 'awaiting_payment';
  if found then
    update offers o set stock = o.stock + i.quantity
    from order_items i where i.order_id = p_order_id and i.offer_id = o.id;
  end if;
end $$;

revoke execute on function public.create_pending_order(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_unpaid_order(uuid) from public, anon, authenticated;

-- ---------- RPC del comercio ----------

-- Verifica el código que presenta el cliente y marca el pedido como recogido.
create or replace function public.verify_pickup(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
begin
  select c.order_id into v_order_id
  from order_codes c
  join businesses b on b.id = c.business_id
  join orders o on o.id = c.order_id
  where b.owner_id = auth.uid() and c.code = trim(p_code) and o.status = 'pending';

  if v_order_id is null then
    raise exception 'Código no válido o el pedido ya fue entregado/cancelado';
  end if;

  update orders set status = 'picked_up', picked_up_at = now() where id = v_order_id;
  return v_order_id;
end $$;

-- Cancela un pedido pagado pendiente (incidencia). Devuelve stock.
-- El reembolso en Stripe lo gestiona el admin desde el panel de Stripe en este MVP.
create or replace function public.business_cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'cancelled', cancelled_at = now()
  where id = p_order_id and status = 'pending' and (owns_business(business_id) or is_admin());
  if not found then raise exception 'No se puede cancelar este pedido'; end if;
  update offers o set stock = o.stock + i.quantity
  from order_items i where i.order_id = p_order_id and i.offer_id = o.id;
end $$;

-- ---------- RPC de administración ----------
create or replace function public.admin_set_user_disabled(p_user_id uuid, p_disabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administradores'; end if;
  if p_user_id = auth.uid() then raise exception 'No puedes deshabilitar tu propia cuenta'; end if;
  update profiles set disabled = p_disabled where id = p_user_id;
end $$;

-- Agrupa los pedidos entregados y no liquidados de un comercio en una liquidación.
create or replace function public.admin_create_settlement(p_business_id uuid)
returns public.settlements language plpgsql security definer set search_path = public as $$
declare
  v_s settlements;
  v_amount numeric(10, 2);
  v_count int;
begin
  if not is_admin() then raise exception 'Solo administradores'; end if;
  select coalesce(sum(payout), 0), count(*) into v_amount, v_count
  from orders where business_id = p_business_id and status = 'picked_up' and settlement_id is null;
  if v_count = 0 then raise exception 'No hay ventas pendientes de liquidar'; end if;

  insert into settlements (business_id, amount, orders_count)
  values (p_business_id, v_amount, v_count) returning * into v_s;
  update orders set settlement_id = v_s.id
  where business_id = p_business_id and status = 'picked_up' and settlement_id is null;
  return v_s;
end $$;

create or replace function public.admin_mark_settlement_paid(p_settlement_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administradores'; end if;
  update settlements set status = 'paid', paid_at = now() where id = p_settlement_id;
end $$;

-- ---------- Realtime: alertas web de pedidos entrantes para el comercio ----------
alter publication supabase_realtime add table public.orders;
