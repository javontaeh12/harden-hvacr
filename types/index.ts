export type UserRole = 'admin' | 'manager' | 'tech';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'pending' | 'ordered' | 'received';

export interface OrganizationGroup {
  id: string;
  name: string;
  group_code: string;
  owner_id: string | null;
  created_at: string;
}

export interface GroupStockPart {
  id: string;
  group_id: string;
  item: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  van_id: string | null;
  group_id: string | null;
  created_at: string;
}

export interface Van {
  id: string;
  name: string;
  van_number: string;
  license_plate: string | null;
  assigned_tech_id: string | null;
  group_id: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  van_id: string;
  name: string;
  description: string | null;
  part_number: string | null;
  quantity: number;
  min_quantity: number;
  cost: number | null;
  vendor: string | null;
  location: string | null;
  category: string | null;
  group_id: string;
  updated_at: string;
  created_at: string;
}

export interface OrderItem {
  item_id: string;
  name: string;
  part_number: string | null;
  quantity_needed: number;
  vendor: string | null;
  cost: number | null;
}

export interface Order {
  id: string;
  created_by: string | null;
  items: OrderItem[];
  status: OrderStatus;
  group_id: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CustomPart {
  id: string;
  item: string;
  description: string;
  category: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
}

export interface DocumentGroup {
  id: string;
  doc_group_code: string;
  name: string;
  created_by: string | null;
  group_id: string;
  created_at: string;
}

export interface Document {
  id: string;
  group_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

// CRM Types
export interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  created_by: string | null;
  group_id: string;
  created_at: string;
}

export interface CustomerTag {
  id: string;
  customer_id: string;
  tag: string;
  group_id: string;
  created_at: string;
}

export interface CustomerEquipment {
  id: string;
  customer_id: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  last_service: string | null;
  notes: string | null;
  group_id: string;
  created_at: string;
}

export interface CustomerCommunication {
  id: string;
  customer_id: string;
  type: 'call' | 'text' | 'email' | 'in_person';
  summary: string;
  created_by: string | null;
  group_id: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  customer_id: string;
  due_date: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  assigned_to: string | null;
  group_id: string;
  created_at: string;
}

// Work Order Types
export type WorkOrderStatus = 'assigned' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  assigned_tech_id: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string | null;
  notes: string | null;
  scheduled_date?: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number; inventory_item_id?: string }>;
  signature_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  group_id: string;
  created_at: string;
  payment?: { id: string; amount: number; method: string; status: string; created_at: string } | null;
  quote?: { id: string; line_items: Array<{ description: string; amount: number }>; total: number; status: string } | null;
  customers?: { full_name: string; phone: string | null; address: string | null; email?: string | null } | null;
  profiles?: { full_name: string | null } | null;
}

export interface WorkOrderPhoto {
  id: string;
  work_order_id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

// Quote Types
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface QuoteLineItem {
  description: string;
  type: 'part' | 'labor' | 'flat_fee';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  status: QuoteStatus;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  default_items: QuoteLineItem[];
  group_id: string;
  created_at: string;
}

// Contract Types
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'cancelled';
export type ContractType = 'maintenance' | 'membership' | 'service_agreement' | 'warranty';

export interface Contract {
  id: string;
  customer_id: string | null;
  type: ContractType;
  title: string;
  terms: Record<string, unknown>;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: ContractStatus;
  total_value: number;
  signed_url: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

// System Report Types
export interface SystemReport {
  id: string;
  work_order_id: string | null;
  customer_id: string | null;
  equipment_id: string | null;
  ratings: Record<string, number>;
  recommendations: Array<{ item: string; priority: string; estimated_cost: number }>;
  photos: Array<{ url: string; caption: string }>;
  notes: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
  customer_equipment?: { equipment_type: string; make: string | null; model: string | null } | null;
}

// Rewards Types
export interface RewardTransaction {
  id: string;
  customer_id: string;
  type: 'earned' | 'redeemed' | 'adjusted' | 'referral' | 'review';
  points: number;
  description: string | null;
  group_id: string;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  customer_id: string;
  points_used: number;
  reward_type: string;
  description: string | null;
  group_id: string;
  created_at: string;
}

export interface TechPoint {
  id: string;
  tech_id: string;
  type: 'job_completed' | 'five_star' | 'upsell' | 'bonus' | 'adjusted';
  points: number;
  description: string | null;
  work_order_id: string | null;
  group_id: string;
  created_at: string;
}

export interface TechBadge {
  id: string;
  tech_id: string;
  badge_type: string;
  group_id: string;
  earned_at: string;
}

// Service Report Types
export type ServiceReportStatus = 'draft' | 'in_progress' | 'completed' | 'sent';

export interface RepairLineItem {
  description: string;
  type: 'part' | 'labor' | 'flat_fee';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface RepairOption {
  label: string; // A, B, C...
  name: string;
  line_items: RepairLineItem[];
  subtotal: number;
  benefits: string[];
  timeline: string;
  is_recommended: boolean;
}

export interface UpgradeItem {
  name: string;
  price: number;
  priority: 'low' | 'medium' | 'high';
  benefits: string[];
}

// Service Unit (multi-unit support)
export interface ServiceUnit {
  id: string;
  equipment_info: {
    equipment_type: string;
    make: string;
    model: string;
    serial_number: string;
    location: string;
    age: string;
    tonnage: string;
    refrigerant_type: string;
    condition: string;
    tag_data?: Record<string, unknown>;
  };
  warranty_info: {
    has_warranty: boolean;
    warranty_type: string;
    provider: string;
    expiration: string;
    coverage: string;
    notes: string;
  };
  problem_found: string;
  secondary_problems: string[];
  problem_details: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    symptoms: string[];
    areas_affected: string[];
  };
  health_ratings: Record<string, number>;
  health_notes: Record<string, string>;
  health_extras: Record<string, Record<string, unknown>>;
  equipment_id?: string;
}

// Quote Option Types (for new service report builder)
export interface QuoteOptionItem {
  description: string;
  category: 'part' | 'service' | 'membership' | 'upgrade';
  quantity: number;
  unit_price: number;
  total: number;
  unit_index?: number;
}

export interface QuoteOption {
  label: string;
  name: string;
  items: QuoteOptionItem[];
  subtotal: number;
  is_recommended: boolean;
}

export interface ServiceReport {
  id: string;
  customer_id: string | null;
  equipment_id: string | null;
  created_by: string | null;
  group_id: string;
  status: ServiceReportStatus;
  equipment_info: {
    equipment_type: string;
    make: string;
    model: string;
    serial_number: string;
    location: string;
    age: string;
    tonnage: string;
    refrigerant_type: string;
    condition: string;
  };
  warranty_info: {
    has_warranty: boolean;
    warranty_type: string;
    provider: string;
    expiration: string;
    coverage: string;
    notes: string;
  };
  problem_found: string;
  problem_details: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    symptoms: string[];
    area_affected: string;
  };
  system_impact: string;
  impact_details: {
    efficiency: number;
    safety: number;
    comfort: number;
    lifespan: number;
    energy_cost: number;
  };
  repair_options: RepairOption[];
  upgrades: UpgradeItem[];
  tech_notes: string | null;
  customer_name: string | null;
  customer_address: string | null;
  service_date: string;
  report_url: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  customers?: { full_name: string; phone: string | null; address: string | null } | null;
}

export interface ServiceReportMedia {
  id: string;
  service_report_id: string;
  type: 'photo' | 'video';
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      organization_groups: {
        Row: OrganizationGroup;
        Insert: Omit<OrganizationGroup, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<OrganizationGroup>;
      };
      group_stock_parts: {
        Row: GroupStockPart;
        Insert: Omit<GroupStockPart, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<GroupStockPart>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Profile>;
      };
      vans: {
        Row: Van;
        Insert: Omit<Van, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Van>;
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<InventoryItem>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Order>;
      };
      custom_parts: {
        Row: CustomPart;
        Insert: Omit<CustomPart, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<CustomPart>;
      };
      document_groups: {
        Row: DocumentGroup;
        Insert: Omit<DocumentGroup, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<DocumentGroup>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Document>;
      };
    };
  };
}
