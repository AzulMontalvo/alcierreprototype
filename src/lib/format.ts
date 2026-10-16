import type { BusinessStatus, Category, OrderStatus } from './types';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const money = (n: number) => currency.format(n);

export const discountPct = (original: number, price: number) =>
  Math.round(((original - price) / original) * 100);

export const hhmm = (t: string) => t.slice(0, 5);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'restaurante', label: 'Restaurante', emoji: '🍲' },
  { id: 'panaderia', label: 'Panadería', emoji: '🥐' },
  { id: 'fruteria', label: 'Frutería', emoji: '🍎' },
  { id: 'cafeteria', label: 'Cafetería', emoji: '☕' },
  { id: 'pasteleria', label: 'Pastelería', emoji: '🍰' },
  { id: 'supermercado', label: 'Súper', emoji: '🛒' },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.id === c) ?? CATEGORIES[0];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Esperando pago',
  pending: 'Pendiente',
  picked_up: 'Recogido',
  cancelled: 'Cancelado',
};

export const BUSINESS_STATUS_LABEL: Record<BusinessStatus, string> = {
  pending: 'Por aprobar',
  approved: 'Aprobado',
  suspended: 'Suspendido',
};

/** ¿La ventana de recolección sigue abierta hoy? */
export function pickupOpen(end: string) {
  const [h, m] = end.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() < h * 60 + m;
}

export function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Ocurrió un error inesperado';
}
