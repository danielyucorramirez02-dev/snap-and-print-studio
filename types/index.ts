export type UserRole = "owner" | "staff";

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type PaymentMethod = "cash" | "gcash" | "bank";

export type ExpenseCategory = "supplies" | "utilities" | "equipment" | "other";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  inclusions: string[];
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  booking_date: string;
  booking_time: string;
  package_id: string;
  total_amount: number;
  downpayment_amount: number;
  downpayment_paid: boolean;
  balance: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  booking_token: string;
  notes: string | null;
  receipt_url: string | null;
  session_folder: string | null;
  reminder_sent: boolean;
  created_by: string | null;
  created_at: string;
  // joined
  service?: Service;
}

export interface PaymentHistory {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  selling_price: number;
  low_stock_threshold: number;
  supplier: string | null;
  last_restocked: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  recorded_by: string;
  created_at: string;
}
