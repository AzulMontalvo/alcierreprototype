// Implementación local (localStorage) para probar el MVP sin backend.
// Reproduce las mismas reglas que el SQL de Supabase: reserva atómica de stock,
// código de 6 dígitos, comisiones y liquidaciones.
import type { Api } from './types';
import type { Business, Offer, Order, OrderItem, Profile, Settlement } from '../types';

type DemoUser = Profile & { password: string };
type DemoOrder = Omit<Order, 'business' | 'items'> & { items: OrderItem[]; code: string | null; customer_name: string };

interface DB {
  users: DemoUser[];
  businesses: Business[];
  offers: Offer[];
  orders: DemoOrder[];
  settlements: Settlement[];
  session: string | null;
  commission: number;
}

const KEY = 'alcierre-demo-v1';
const NEW_ORDER_EVENT = 'alcierre:new-order';
const AUTH_EVENT = 'alcierre:auth';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const round2 = (n: number) => Math.round(n * 100) / 100;
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function seed(): DB {
  const user = (email: string, full_name: string, role: Profile['role']): DemoUser => ({
    id: uuid(), email, full_name, role, disabled: false, created_at: ago(60 * 24 * 7), password: 'demo1234',
  });
  const cliente = user('cliente@demo.com', 'Ana Cliente', 'customer');
  const negocio = user('negocio@demo.com', 'Luis Panadero', 'business');
  const admin = user('admin@demo.com', 'Admin Al Cierre', 'admin');
  const owners = [user('sazon@demo.com', 'Marta Ruiz', 'business'), user('verde@demo.com', 'Pedro Gil', 'business'),
    user('cafe@demo.com', 'Sofía León', 'business'), user('dulce@demo.com', 'Iván Mora', 'business')];

  const biz = (owner: DemoUser, b: Partial<Business>): Business => ({
    id: uuid(), owner_id: owner.id, description: '', status: 'approved', created_at: ago(60 * 24 * 5),
    name: '', category: 'restaurante', address: '', phone: '', pickup_start: '20:00', pickup_end: '22:00', ...b,
  });
  const panaderia = biz(negocio, { name: 'Panadería La Espiga', category: 'panaderia', address: 'Av. Juárez 120, Centro',
    phone: '55 1234 5678', pickup_start: '19:00', pickup_end: '21:00', description: 'Pan artesanal horneado cada mañana.' });
  const sazon = biz(owners[0], { name: 'Fonda El Sazón', category: 'restaurante', address: 'Calle Morelos 45, Col. Roma',
    phone: '55 2345 6789', pickup_start: '21:00', pickup_end: '22:30', description: 'Comida casera del día.' });
  const verde = biz(owners[1], { name: 'Frutería Verde Vivo', category: 'fruteria', address: 'Mercado Juárez, local 12',
    phone: '55 3456 7890', pickup_start: '17:00', pickup_end: '19:00' });
  const cafe = biz(owners[2], { name: 'Café Tostado', category: 'cafeteria', address: 'Av. Reforma 300, Local 3',
    phone: '55 4567 8901', pickup_start: '18:30', pickup_end: '20:30' });
  const dulce = biz(owners[3], { name: 'Pastelería Dulce Hogar', category: 'pasteleria', address: 'Insurgentes Sur 800',
    phone: '55 5678 9012', status: 'pending', created_at: ago(90) });

  const offer = (b: Business, o: Partial<Offer>): Offer => ({
    id: uuid(), business_id: b.id, category: b.category, description: '', active: true, disabled_by_admin: false,
    created_at: ago(Math.floor(Math.random() * 300)), title: '', original_price: 100, price: 40, stock: 5, ...o,
  });
  const offers = [
    offer(panaderia, { title: 'Bolsa sorpresa de pan dulce', description: 'Conchas, cuernitos y pan del día (6–8 piezas).', original_price: 160, price: 59, stock: 5 }),
    offer(panaderia, { title: 'Pan de caja artesanal', description: 'Dos hogazas de masa madre.', original_price: 140, price: 55, stock: 3 }),
    offer(sazon, { title: 'Comida corrida del día', description: 'Sopa, guisado, arroz y agua fresca.', original_price: 120, price: 45, stock: 8 }),
    offer(sazon, { title: 'Paquete familiar de guisados', description: '1 kg de guisos variados para 3–4 personas.', original_price: 280, price: 110, stock: 2 }),
    offer(verde, { title: 'Caja de fruta imperfecta', description: '3 kg de fruta de temporada con detalles estéticos.', original_price: 150, price: 50, stock: 6 }),
    offer(cafe, { title: 'Combo café + panqué', description: 'Café de grano para llevar y panqué del día.', original_price: 95, price: 35, stock: 4 }),
    offer(dulce, { title: 'Rebanadas de pastel', description: '4 rebanadas surtidas.', original_price: 220, price: 80, stock: 3 }),
  ];

  const db: DB = {
    users: [cliente, negocio, admin, ...owners],
    businesses: [panaderia, sazon, verde, cafe, dulce],
    offers, orders: [], settlements: [], session: null, commission: 0.15,
  };

  // Historial para que el panel de transacciones no aparezca vacío.
  const past = (o: Offer, qty: number, status: Order['status'], minAgo: number, code: string) => {
    const total = round2(o.price * qty);
    const commission = round2(total * db.commission);
    db.orders.push({
      id: uuid(), customer_id: cliente.id, customer_name: cliente.full_name, business_id: o.business_id, status,
      total, commission, payout: round2(total - commission), settlement_id: null, created_at: ago(minAgo),
      paid_at: ago(minAgo), picked_up_at: status === 'picked_up' ? ago(minAgo - 30) : null,
      cancelled_at: status === 'cancelled' ? ago(minAgo - 10) : null, code,
      items: [{ id: uuid(), offer_id: o.id, title: o.title, unit_price: o.price, quantity: qty }],
    });
  };
  past(offers[0], 2, 'picked_up', 60 * 26, '482913');
  past(offers[2], 1, 'picked_up', 60 * 50, '193847');
  past(offers[4], 1, 'picked_up', 60 * 28, '774120');
  past(offers[1], 1, 'pending', 45, '305618');
  return db;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* almacenamiento no disponible */
  }
  const db = seed();
  save(db);
  return db;
}

function save(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignorar */
  }
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
  window.location.href = '/';
}

export function createDemoApi(): Api & { demoPay(orderId: string, paid: boolean): Promise<void> } {
  const me = (db: DB) => db.users.find((u) => u.id === db.session && !u.disabled) ?? null;
  const requireMe = (db: DB) => {
    const u = me(db);
    if (!u) throw new Error('Inicia sesión para continuar');
    return u;
  };
  const strip = ({ password: _p, ...p }: DemoUser): Profile => p;
  const bizOf = (db: DB, id: string) => db.businesses.find((b) => b.id === id)!;
  const myBiz = (db: DB) => {
    const u = requireMe(db);
    const b = db.businesses.find((x) => x.owner_id === u.id);
    if (!b) throw new Error('Primero registra tu negocio');
    return b;
  };
  const publicOffer = (db: DB, o: Offer) =>
    o.active && !o.disabled_by_admin && bizOf(db, o.business_id)?.status === 'approved';
  const withBiz = (db: DB, o: Offer) => ({ ...o, business: bizOf(db, o.business_id) });
  const toOrder = (db: DB, o: DemoOrder, includeCode = false): Order => ({
    ...o,
    business: bizOf(db, o.business_id),
    code: includeCode ? o.code : undefined,
  });
  const byDate = <T extends { created_at: string }>(a: T, b: T) => b.created_at.localeCompare(a.created_at);
  const emitAuth = () => window.dispatchEvent(new Event(AUTH_EVENT));
  const restock = (db: DB, o: DemoOrder) =>
    o.items.forEach((i) => {
      const off = db.offers.find((x) => x.id === i.offer_id);
      if (off) off.stock += i.quantity;
    });

  return {
    mode: 'demo',

    async currentProfile() {
      const u = load().users.find((x) => x.id === load().session);
      return u ? strip(u) : null;
    },
    onAuthChange(cb) {
      window.addEventListener(AUTH_EVENT, cb);
      return () => window.removeEventListener(AUTH_EVENT, cb);
    },
    async signIn(email, password) {
      await wait();
      const db = load();
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u || u.password !== password) throw new Error('Correo o contraseña incorrectos');
      if (u.disabled) throw new Error('Tu cuenta está deshabilitada. Contacta a soporte.');
      db.session = u.id;
      save(db);
      emitAuth();
    },
    async signUp({ email, password, fullName, role }) {
      await wait();
      const db = load();
      if (db.users.some((x) => x.email.toLowerCase() === email.trim().toLowerCase()))
        throw new Error('Ese correo ya está registrado');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      const u: DemoUser = {
        id: uuid(), email: email.trim(), full_name: fullName, role, disabled: false, created_at: now(), password,
      };
      db.users.push(u);
      db.session = u.id;
      save(db);
      emitAuth();
      return { needsConfirmation: false };
    },
    async signOut() {
      const db = load();
      db.session = null;
      save(db);
      emitAuth();
    },
    async updateName(fullName) {
      const db = load();
      requireMe(db).full_name = fullName;
      save(db);
      emitAuth();
    },

    async listOffers() {
      await wait(80);
      const db = load();
      return db.offers.filter((o) => publicOffer(db, o) && o.stock > 0).sort(byDate).map((o) => withBiz(db, o));
    },
    async listBusinesses() {
      const db = load();
      return db.businesses.filter((b) => b.status === 'approved').sort((a, b) => a.name.localeCompare(b.name));
    },
    async getBusiness(id) {
      const db = load();
      const business = db.businesses.find((b) => b.id === id);
      if (!business) return null;
      const u = me(db);
      if (business.status !== 'approved' && u?.id !== business.owner_id && u?.role !== 'admin') return null;
      const offers = db.offers.filter((o) => o.business_id === id && publicOffer(db, o)).sort(byDate);
      return { business, offers: offers.map((o) => withBiz(db, o)) };
    },

    async checkout(items) {
      await wait(300);
      const db = load();
      const u = requireMe(db);
      if (items.length === 0) throw new Error('El carrito está vacío');
      const businessId = items[0].offer.business_id;
      const orderItems: OrderItem[] = [];
      // Validar todo antes de tocar el stock (equivale a la transacción SQL).
      for (const it of items) {
        const off = db.offers.find((o) => o.id === it.offer.id);
        if (!off || !publicOffer(db, off) || off.business_id !== businessId || off.stock < it.quantity)
          throw new Error(`"${it.offer.title}" ya no tiene unidades suficientes`);
      }
      for (const it of items) {
        const off = db.offers.find((o) => o.id === it.offer.id)!;
        off.stock -= it.quantity;
        orderItems.push({ id: uuid(), offer_id: off.id, title: off.title, unit_price: off.price, quantity: it.quantity });
      }
      const total = round2(orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0));
      const commission = round2(total * db.commission);
      const order: DemoOrder = {
        id: uuid(), customer_id: u.id, customer_name: u.full_name, business_id: businessId,
        status: 'awaiting_payment', total, commission, payout: round2(total - commission), settlement_id: null,
        created_at: now(), paid_at: null, picked_up_at: null, cancelled_at: null, items: orderItems, code: null,
      };
      db.orders.push(order);
      save(db);
      return { orderId: order.id, redirectUrl: `/pago-demo/${order.id}` };
    },
    async demoPay(orderId, paid) {
      await wait(600);
      const db = load();
      const o = db.orders.find((x) => x.id === orderId && x.customer_id === requireMe(db).id);
      if (!o || o.status !== 'awaiting_payment') return;
      if (paid) {
        const taken = new Set(db.orders.filter((x) => x.business_id === o.business_id).map((x) => x.code));
        let code = '';
        do code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
        while (taken.has(code));
        o.status = 'pending';
        o.paid_at = now();
        o.code = code;
      } else {
        o.status = 'cancelled';
        o.cancelled_at = now();
        restock(db, o);
      }
      save(db);
      if (paid) {
        window.dispatchEvent(new CustomEvent(NEW_ORDER_EVENT, { detail: o.business_id }));
        console.info(`[demo] Correo de confirmación enviado a ${requireMe(db).email} con el código ${o.code}`);
      }
    },
    async listMyOrders() {
      const db = load();
      const u = requireMe(db);
      return db.orders
        .filter((o) => o.customer_id === u.id && o.status !== 'awaiting_payment')
        .sort(byDate)
        .map((o) => toOrder(db, o));
    },
    async getMyOrder(id) {
      const db = load();
      const u = requireMe(db);
      const o = db.orders.find((x) => x.id === id && x.customer_id === u.id);
      return o ? toOrder(db, o, true) : null;
    },

    async getMyBusiness() {
      const db = load();
      const u = requireMe(db);
      return db.businesses.find((b) => b.owner_id === u.id) ?? null;
    },
    async saveMyBusiness(input) {
      await wait();
      const db = load();
      const u = requireMe(db);
      let b = db.businesses.find((x) => x.owner_id === u.id);
      if (b) Object.assign(b, input);
      else {
        b = { ...input, id: uuid(), owner_id: u.id, status: 'pending', created_at: now() };
        db.businesses.push(b);
      }
      save(db);
      return b;
    },
    async listMyOffers() {
      const db = load();
      const b = myBiz(db);
      return db.offers.filter((o) => o.business_id === b.id).sort(byDate);
    },
    async saveOffer({ id, ...input }) {
      await wait();
      const db = load();
      const b = myBiz(db);
      if (input.price >= input.original_price) throw new Error('El precio de rescate debe ser menor al original');
      if (id) {
        const o = db.offers.find((x) => x.id === id && x.business_id === b.id);
        if (!o) throw new Error('Oferta no encontrada');
        Object.assign(o, input);
        save(db);
        return o;
      }
      const o: Offer = { ...input, id: uuid(), business_id: b.id, active: true, disabled_by_admin: false, created_at: now() };
      db.offers.push(o);
      save(db);
      return o;
    },
    async setOfferActive(id, active) {
      const db = load();
      const b = myBiz(db);
      const o = db.offers.find((x) => x.id === id && x.business_id === b.id);
      if (o) o.active = active;
      save(db);
    },
    async listBusinessOrders() {
      const db = load();
      const b = myBiz(db);
      return db.orders
        .filter((o) => o.business_id === b.id && o.status !== 'awaiting_payment')
        .sort(byDate)
        .map((o) => toOrder(db, o));
    },
    async verifyPickup(code) {
      await wait(300);
      const db = load();
      const b = myBiz(db);
      const o = db.orders.find((x) => x.business_id === b.id && x.code === code.trim() && x.status === 'pending');
      if (!o) throw new Error('Código no válido o el pedido ya fue entregado/cancelado');
      o.status = 'picked_up';
      o.picked_up_at = now();
      save(db);
      return toOrder(db, o);
    },
    async cancelOrder(orderId) {
      const db = load();
      const u = requireMe(db);
      const o = db.orders.find((x) => x.id === orderId && x.status === 'pending');
      if (!o || (bizOf(db, o.business_id).owner_id !== u.id && u.role !== 'admin'))
        throw new Error('No se puede cancelar este pedido');
      o.status = 'cancelled';
      o.cancelled_at = now();
      restock(db, o);
      save(db);
    },
    subscribeIncomingOrders(businessId, cb) {
      const local = (e: Event) => (e as CustomEvent).detail === businessId && cb();
      // Otra pestaña (p. ej. el cliente comprando) modifica el storage.
      let known = load().orders.filter((o) => o.business_id === businessId && o.status === 'pending').length;
      const remote = (e: StorageEvent) => {
        if (e.key !== KEY) return;
        const n = load().orders.filter((o) => o.business_id === businessId && o.status === 'pending').length;
        if (n > known) cb();
        known = n;
      };
      window.addEventListener(NEW_ORDER_EVENT, local);
      window.addEventListener('storage', remote);
      return () => {
        window.removeEventListener(NEW_ORDER_EVENT, local);
        window.removeEventListener('storage', remote);
      };
    },

    async adminListBusinesses() {
      return load().businesses.sort(byDate);
    },
    async adminSetBusinessStatus(id, status) {
      const db = load();
      const b = db.businesses.find((x) => x.id === id);
      if (b) b.status = status;
      save(db);
    },
    async adminListOffers() {
      const db = load();
      return db.offers.sort(byDate).map((o) => withBiz(db, o));
    },
    async adminSetOfferDisabled(id, disabled) {
      const db = load();
      const o = db.offers.find((x) => x.id === id);
      if (o) o.disabled_by_admin = disabled;
      save(db);
    },
    async adminListUsers() {
      return load().users.sort(byDate).map(strip);
    },
    async adminSetUserDisabled(id, disabled) {
      const db = load();
      if (id === db.session) throw new Error('No puedes deshabilitar tu propia cuenta');
      const u = db.users.find((x) => x.id === id);
      if (u) u.disabled = disabled;
      save(db);
    },
    async adminListOrders() {
      const db = load();
      return db.orders.filter((o) => o.status !== 'awaiting_payment').sort(byDate).map((o) => toOrder(db, o));
    },
    async adminListSettlements() {
      return load().settlements.sort(byDate);
    },
    async adminCreateSettlement(businessId) {
      const db = load();
      const pending = db.orders.filter(
        (o) => o.business_id === businessId && o.status === 'picked_up' && !o.settlement_id,
      );
      if (pending.length === 0) throw new Error('No hay ventas pendientes de liquidar');
      const s: Settlement = {
        id: uuid(), business_id: businessId, amount: round2(pending.reduce((a, o) => a + o.payout, 0)),
        orders_count: pending.length, status: 'pending', created_at: now(), paid_at: null,
      };
      db.settlements.push(s);
      pending.forEach((o) => (o.settlement_id = s.id));
      save(db);
    },
    async adminMarkSettlementPaid(id) {
      const db = load();
      const s = db.settlements.find((x) => x.id === id);
      if (s) {
        s.status = 'paid';
        s.paid_at = now();
      }
      save(db);
    },
    async getCommissionRate() {
      return load().commission;
    },
  };
}
