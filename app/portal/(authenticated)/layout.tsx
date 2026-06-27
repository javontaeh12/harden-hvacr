import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortalAuthProvider } from '@/components/PortalAuthProvider';
import PortalShell from '@/components/PortalShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/login');
  }

  // Use service role to look up customer by email (bypasses RLS)
  const serviceSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Find customer by email
  const { data: customer } = await serviceSupabase
    .from('customers')
    .select('*')
    .eq('email', user.email!)
    .single();

  if (!customer) {
    redirect('/portal/login?error=not_member');
  }

  // Check for active membership contract
  const { data: membership } = await serviceSupabase
    .from('contracts')
    .select('id, start_date, status')
    .eq('customer_id', customer.id)
    .eq('type', 'membership')
    .in('status', ['active', 'signed'])
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  // Get rewards balance
  const { data: rewards } = await serviceSupabase
    .from('customer_rewards')
    .select('balance, lifetime_earned')
    .eq('customer_id', customer.id)
    .single();

  const memberSince = membership?.start_date || customer.created_at;

  return (
    <PortalAuthProvider
      customer={customer}
      rewards={rewards || { balance: 0, lifetime_earned: 0 }}
      memberSince={memberSince}
    >
      <PortalShell>{children}</PortalShell>
    </PortalAuthProvider>
  );
}
