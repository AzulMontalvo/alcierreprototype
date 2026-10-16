import { createClient } from '@supabase/supabase-js';
import type { Api } from './types';
import type { Business, Offer, OfferWithBusiness, Order, Profile, Settlement } from '../types';

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb = createClient(url, anonKey);

  const must = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const uid = async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Inicia sesión para continuar');
    return id;
  };

  // Normalización (numeric -> number, time "HH:MM:SS" -> "HH:MM")
  const toBusiness = (b: any): Business => ({
    ...b,
    pickup_start: String(b.pickup_start).slice(0, 5),
    pickup_end: String(b.pickup_end).slice(0, 5),
  });
  const toOffer = (o: any): Offer => ({ ...o, original_price: Number(o.original_price), price: Number(o.price) });
  const toOfferWB = (o: any): OfferWithBusiness => ({ ...toOffer(o), business: toBusiness(o.business) });
  const toOrder = (o: any): Order => ({
    ...o,
    total: Number(o.total),
    commission: Number(o.commission),
    payout: Number(o.payout),
    business: toBusiness(o.business),
    items: (o.items ?? []).map((i: any) => ({ ...i, unit_price: Number(i.unit_price) })),
  });
  const ORDER_SELECT = '*, items:order_items(*), business:businesses(*)';

  const myBusinessId = async () => {
    const id = await uid();
    const { data } = await sb.from('businesses').select('id').eq('owner_id', id).maybeSingle();
    if (!data) throw new Error('Primero registra tu negocio');
    return data.id as string;
  };

  return {
    mode: 'supabase',

    async currentProfile() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const res = await sb.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
      return (res.data as Profile) ?? null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event !== 'TOKEN_REFRESHED') cb();
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message);
    },
    async signUp({ email, password, fullName, role }) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role }, emailRedirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async updateName(fullName) {
      must(await sb.from('profiles').update({ full_name: fullName }).eq('id', await uid()));
    },

    async listOffers() {
      // RLS ya filtra: oferta activa, no bloqueada y comercio aprobado.
      const data = must(
        await sb
          .from('offers')
          .select('*, business:businesses!inner(*)')
          .eq('active', true)
          .eq('disabled_by_admin', false)
          .eq('business.status', 'approved')
          .gt('stock', 0)
          .order('created_at', { ascending: false }),
      );
      return (data ?? []).map(toOfferWB);
    },
    async listBusinesses() {
      const data = must(await sb.from('businesses').select('*').eq('status', 'approved').order('name'));
      return (data ?? []).map(toBusiness);
    },
    async getBusiness(id) {
      const b = must(await sb.from('businesses').select('*').eq('id', id).maybeSingle());
      if (!b) return null;
      const offers = must(
        await sb
          .from('offers')
          .select('*, business:businesses(*)')
          .eq('business_id', id)
          .eq('active', true)
          .eq('disabled_by_admin', false)
          .order('created_at', { ascending: false }),
      );
      return { business: toBusiness(b), offers: (offers ?? []).map(toOfferWB) };
    },

    async checkout(items) {
      await uid();
      const { data, error } = await sb.functions.invoke('create-checkout', {
        body: {
          items: items.map((i) => ({ offer_id: i.offer.id, quantity: i.quantity })),
          origin: window.location.origin,
        },
      });
      if (error) {
        // Mensaje legible devuelto por la función, si existe.
        const ctx = (error as { context?: Response }).context;
        const msg = ctx ? await ctx.json().then((j) => j.error).catch(() => null) : null;
        throw new Error(msg ?? error.message);
      }
      return { orderId: data.order_id, redirectUrl: data.url };
    },
    async listMyOrders() {
      const data = must(
        await sb
          .from('orders')
          .select(ORDER_SELECT)
          .eq('customer_id', await uid())
          .neq('status', 'awaiting_payment')
          .order('created_at', { ascending: false }),
      );
      return (data ?? []).map(toOrder);
    },
    async getMyOrder(id) {
      const o = must(await sb.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle());
      if (!o) return null;
      const c = await sb.from('order_codes').select('code').eq('order_id', id).maybeSingle();
      return { ...toOrder(o), code: c.data?.code ?? null };
    },

    async getMyBusiness() {
      const data = must(await sb.from('businesses').select('*').eq('owner_id', await uid()).maybeSingle());
      return data ? toBusiness(data) : null;
    },
    async saveMyBusiness(input) {
      const owner_id = await uid();
      const existing = await sb.from('businesses').select('id').eq('owner_id', owner_id).maybeSingle();
      const res = existing.data
        ? await sb.from('businesses').update(input).eq('id', existing.data.id).select().single()
        : await sb.from('businesses').insert({ ...input, owner_id }).select().single();
      return toBusiness(must(res));
    },
    async listMyOffers() {
      const data = must(
        await sb
          .from('offers')
          .select('*')
          .eq('business_id', await myBusinessId())
          .order('created_at', { ascending: false }),
      );
      return (data ?? []).map(toOffer);
    },
    async saveOffer({ id, ...input }) {
      const res = id
        ? await sb.from('offers').update(input).eq('id', id).select().single()
        : await sb
            .from('offers')
            .insert({ ...input, business_id: await myBusinessId() })
            .select()
            .single();
      return toOffer(must(res));
    },
    async setOfferActive(id, active) {
      must(await sb.from('offers').update({ active }).eq('id', id));
    },
    async listBusinessOrders() {
      const data = must(
        await sb
          .from('orders')
          .select(ORDER_SELECT)
          .eq('business_id', await myBusinessId())
          .neq('status', 'awaiting_payment')
          .order('created_at', { ascending: false })
          .limit(200),
      );
      return (data ?? []).map(toOrder);
    },
    async verifyPickup(code) {
      const orderId = must(await sb.rpc('verify_pickup', { p_code: code })) as string;
      const o = must(await sb.from('orders').select(ORDER_SELECT).eq('id', orderId).single());
      return toOrder(o);
    },
    async cancelOrder(orderId) {
      must(await sb.rpc('business_cancel_order', { p_order_id: orderId }));
    },
    subscribeIncomingOrders(businessId, cb) {
      const channel = sb
        .channel(`orders-${businessId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
          (payload) => {
            const n = payload.new as { status?: string };
            const o = payload.old as { status?: string };
            if (n.status === 'pending' && o.status !== 'pending') cb();
          },
        )
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },

    async adminListBusinesses() {
      const data = must(await sb.from('businesses').select('*').order('created_at', { ascending: false }));
      return (data ?? []).map(toBusiness);
    },
    async adminSetBusinessStatus(id, status) {
      must(await sb.from('businesses').update({ status }).eq('id', id));
    },
    async adminListOffers() {
      const data = must(
        await sb.from('offers').select('*, business:businesses(*)').order('created_at', { ascending: false }),
      );
      return (data ?? []).map(toOfferWB);
    },
    async adminSetOfferDisabled(id, disabled) {
      must(await sb.from('offers').update({ disabled_by_admin: disabled }).eq('id', id));
    },
    async adminListUsers() {
      return must(await sb.from('profiles').select('*').order('created_at', { ascending: false })) as Profile[];
    },
    async adminSetUserDisabled(id, disabled) {
      must(await sb.rpc('admin_set_user_disabled', { p_user_id: id, p_disabled: disabled }));
    },
    async adminListOrders() {
      const data = must(
        await sb
          .from('orders')
          .select(ORDER_SELECT)
          .neq('status', 'awaiting_payment')
          .order('created_at', { ascending: false })
          .limit(500),
      );
      return (data ?? []).map(toOrder);
    },
    async adminListSettlements() {
      const data = must(await sb.from('settlements').select('*').order('created_at', { ascending: false }));
      return (data ?? []).map((s: any): Settlement => ({ ...s, amount: Number(s.amount) }));
    },
    async adminCreateSettlement(businessId) {
      must(await sb.rpc('admin_create_settlement', { p_business_id: businessId }));
    },
    async adminMarkSettlementPaid(id) {
      must(await sb.rpc('admin_mark_settlement_paid', { p_settlement_id: id }));
    },
    async getCommissionRate() {
      const data = must(await sb.from('app_settings').select('commission_rate').single());
      return Number(data?.commission_rate ?? 0);
    },
  };
}
