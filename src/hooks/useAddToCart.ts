import { useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { OfferWithBusiness } from '../lib/types';

/** Añade al carrito; si es de otro comercio, ofrece reemplazar el carrito. */
export function useAddToCart() {
  const cart = useCart();
  const toast = useToast();
  return useCallback(
    (offer: OfferWithBusiness) => {
      if (cart.add(offer)) {
        toast(`Añadido: ${offer.title}`, 'success');
        return;
      }
      const ok = confirm(
        `Tu carrito tiene productos de otro comercio. Cada pedido se recoge en un solo local.\n\n¿Vaciar el carrito y añadir "${offer.title}"?`,
      );
      if (ok) {
        cart.replaceWith(offer);
        toast(`Añadido: ${offer.title}`, 'success');
      }
    },
    [cart, toast],
  );
}
