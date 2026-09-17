export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  pin: string;
  is_active: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
  display_name: string;
  created_at: string;
}

export type StoredAdmin = Omit<Admin, 'password'>;

export interface Delivery {
  id: string;
  order_number: string;
  bill_no: string | null;
  customer_name: string;
  customer_phone: string | null;
  address: string;
  landmark: string | null;
  bill_amount: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  flat_house_no: string | null;
  packets_count: number;
  address_id?: string | null;
}

export type PaymentMethod = 'cash' | 'upi' | 'credit';

export interface Settlement {
  id: string;
  delivery_id: string;
  delivery_boy_id: string | null;
  payment_method: PaymentMethod;
  amount_collected: number;
  upi_screenshot_path: string | null;
  pod_photo_path: string;
  created_at: string;
}

export interface DeliveryWithSettlement extends Delivery {
  settlement: Settlement | null;
  delivery_boy_name: string | null;
}

export type PunchType = 'punch_in' | 'punch_out';

export interface Attendance {
  id: string;
  delivery_boy_id: string;
  punch_type: PunchType;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export interface AttendanceWithBoy extends Attendance {
  delivery_boy_name: string;
}

export interface Address {
  id: string;
  flat_house_no: string;
  customer_name: string;
  phone: string;
  full_address: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}
