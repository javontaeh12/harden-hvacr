import { createServiceClient } from '../utils';

export interface CallerProfile {
  customer_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  equipment: Record<string, unknown>[];
  past_bookings: Record<string, unknown>[];
  communications: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
  rewards_balance: number;
  is_known: boolean;
}

export async function identifyCaller(phone: string): Promise<CallerProfile> {
  const supabase = createServiceClient();
  const empty: CallerProfile = {
    customer_id: null, name: null, email: null, phone,
    address: null, equipment: [], past_bookings: [],
    communications: [], contracts: [], rewards_balance: 0,
    is_known: false,
  };

  if (!phone) return empty;

  // Normalize phone: strip everything except digits
  const digits = phone.replace(/\D/g, '');
  const variants = [phone, digits, `+1${digits}`, `+${digits}`];

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .or(variants.map(v => `phone.eq.${v}`).join(','));

  if (error) {
    console.error('[caller-identity] Customer lookup failed:', error);
    return empty;
  }

  if (!customers?.length) return empty;

  const customer = customers[0];
  const customerId = customer.id;

  const [bookingsRes, commsRes, contractsRes, rewardsRes] = await Promise.all([
    supabase.from('bookings')
      .select('*')
      .or(`contact.eq.${phone},name.eq.${customer.full_name || ''}`)
      .order('start_time', { ascending: false })
      .limit(10),
    supabase.from('customer_communications')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('contracts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active'),
    supabase.from('customer_rewards')
      .select('points_balance')
      .eq('customer_id', customerId)
      .maybeSingle(),
  ]);

  return {
    customer_id: customerId,
    name: customer.full_name || customer.name || null,
    email: customer.email || null,
    phone,
    address: customer.address || null,
    equipment: customer.equipment_info ? [customer.equipment_info] : [],
    past_bookings: bookingsRes.data || [],
    communications: commsRes.data || [],
    contracts: contractsRes.data || [],
    rewards_balance: rewardsRes.data?.points_balance || 0,
    is_known: true,
  };
}
