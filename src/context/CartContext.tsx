import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem, OfferWithBusiness } from '../lib/types';

interface CartState {
  items: CartItem[];
  count: number;
  total: number;
  /** Devuelve false si el carrito tiene productos de otro comercio. */
  add(offer: OfferWithBusiness, qty?: number): boolean;
  replaceWith(offer: OfferWithBusiness): void;
  setQty(offerId: string, qty: number): void;
  clear(): void;
}

const CartContext = createContext<CartState | null>(null);
const KEY = 'alcierre-cart';

function initial(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(initial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignorar */
    }
  }, [items]);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.quantity * i.offer.price, 0),
      add(offer, qty = 1) {
        // Un pedido = un comercio = un punto de recolección.
        if (items.length > 0 && items[0].offer.business_id !== offer.business_id) return false;
        setItems((prev) => {
          const found = prev.find((i) => i.offer.id === offer.id);
          if (found)
            return prev.map((i) =>
              i.offer.id === offer.id ? { ...i, quantity: Math.min(i.quantity + qty, offer.stock) } : i,
            );
          return [...prev, { offer, quantity: Math.min(qty, offer.stock) }];
        });
        return true;
      },
      replaceWith(offer) {
        setItems([{ offer, quantity: 1 }]);
      },
      setQty(offerId, qty) {
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.offer.id !== offerId)
            : prev.map((i) => (i.offer.id === offerId ? { ...i, quantity: Math.min(qty, i.offer.stock) } : i)),
        );
      },
      clear() {
        setItems([]);
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fuera de CartProvider');
  return ctx;
}
