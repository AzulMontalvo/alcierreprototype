import type {
  Business,
  BusinessInput,
  BusinessStatus,
  CartItem,
  CheckoutResult,
  Offer,
  OfferInput,
  OfferWithBusiness,
  Order,
  Profile,
  Settlement,
} from '../types';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'business';
}

/**
 * Contrato único de datos. Hay dos implementaciones:
 * - supabaseApi: producción (Supabase + Stripe vía Edge Functions)
 * - demoApi: localStorage, para probar sin backend
 */
export interface Api {
  mode: 'supabase' | 'demo';

  // Autenticación
  currentProfile(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  updateName(fullName: string): Promise<void>;

  // Catálogo público
  listOffers(): Promise<OfferWithBusiness[]>;
  listBusinesses(): Promise<Business[]>;
  getBusiness(id: string): Promise<{ business: Business; offers: OfferWithBusiness[] } | null>;

  // Cliente
  checkout(items: CartItem[]): Promise<CheckoutResult>;
  listMyOrders(): Promise<Order[]>;
  getMyOrder(id: string): Promise<Order | null>;

  // Comercio
  getMyBusiness(): Promise<Business | null>;
  saveMyBusiness(input: BusinessInput): Promise<Business>;
  listMyOffers(): Promise<Offer[]>;
  saveOffer(input: OfferInput): Promise<Offer>;
  setOfferActive(id: string, active: boolean): Promise<void>;
  listBusinessOrders(): Promise<Order[]>;
  verifyPickup(code: string): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  /** Llama a cb cuando entra un pedido pagado nuevo. */
  subscribeIncomingOrders(businessId: string, cb: () => void): () => void;

  // Administración
  adminListBusinesses(): Promise<Business[]>;
  adminSetBusinessStatus(id: string, status: BusinessStatus): Promise<void>;
  adminListOffers(): Promise<OfferWithBusiness[]>;
  adminSetOfferDisabled(id: string, disabled: boolean): Promise<void>;
  adminListUsers(): Promise<Profile[]>;
  adminSetUserDisabled(id: string, disabled: boolean): Promise<void>;
  adminListOrders(): Promise<Order[]>;
  adminListSettlements(): Promise<Settlement[]>;
  adminCreateSettlement(businessId: string): Promise<void>;
  adminMarkSettlementPaid(id: string): Promise<void>;
  getCommissionRate(): Promise<number>;
}
