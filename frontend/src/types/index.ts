export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_phone_number?: string;
  is_active: boolean;
  plan: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  category_id?: string;
  category_name?: string;
  category_emoji?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  is_featured: boolean;
  preparation_time_min: number;
  tags: string[];
  display_order: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  display_order: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  address?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "delivered"
    | "cancelled";
  type: "delivery" | "pickup";
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address?: string;
  notes?: string;
  estimated_time_min?: number;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  modifiers: unknown[];
  line_total: number;
  notes?: string;
}

export interface OrderStats {
  total_orders: string;
  pending: string;
  confirmed: string;
  preparing: string;
  ready: string;
  delivered: string;
  cancelled: string;
  revenue_today: string;
  revenue_month: string;
}

export interface RestaurantConfig {
  restaurant_name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  welcome_message: string;
  goodbye_message: string;
  timezone: string;
  currency: string;
  currency_symbol: string;
  is_accepting_orders: boolean;
  min_order_amount: number;
  delivery_fee: number;
  max_delivery_distance_km: number;
  chatbot_personality: string;
}
