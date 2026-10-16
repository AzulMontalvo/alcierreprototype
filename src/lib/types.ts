export type Role = 'customer' | 'business' | 'admin';
export type BusinessStatus = 'pending' | 'approved' | 'suspended';
export type Category = 'restaurante' | 'panaderia' | 'fruteria' | 'cafeteria' | 'pasteleria' | 'supermercado';
export type OrderStatus = 'awaiting_payment' | 'pending' | 'picked_up' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  disabled: boolean;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: Category;
  address: string;
  phone: string;
  pickup_start: string; // "HH:MM"
  pickup_end: string;
  description: string;
  status: BusinessStatus;
  created_at: string;
}

export type BusinessInput = Pick<
  Business,
  'name' | 'category' | 'address' | 'phone' | 'pickup_start' | 'pickup_end' | 'description'
>;

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: Category;
  original_price: number;
  price: number;
  stock: number;
  active: boolean;
  disabled_by_admin: boolean;
  created_at: string;
}

export type OfferInput = Pick<Offer, 'title' | 'description' | 'category' | 'original_price' | 'price' | 'stock'> & {
  id?: string;
};

export interface OfferWithBusiness extends Offer {
  business: Business;
}

export interface OrderItem {
  id: string;
  offer_id: string;
  title: string;
  unit_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer_id: string;
  business_id: string;
  status: OrderStatus;
  total: number;
  commission: number;
  payout: number;
  settlement_id: string | null;
  created_at: string;
  paid_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  items: OrderItem[];
  business: Business;
  customer_name?: string;
  /** Solo presente para el cliente dueño del pedido. */
  code?: string | null;
}

export interface Settlement {
  id: string;
  business_id: string;
  amount: number;
  orders_count: number;
  status: 'pending' | 'paid';
  created_at: string;
  paid_at: string | null;
}

export interface CartItem {
  offer: OfferWithBusiness;
  quantity: number;
}

export interface CheckoutResult {
  orderId: string;
  /** URL externa de la pasarela (Stripe). En modo demo es una ruta interna. */
  redirectUrl: string;
}
