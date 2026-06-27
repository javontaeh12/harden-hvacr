import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');
    const type = searchParams.get('type'); // 'transactions', 'redemptions', 'tech_points', 'tech_badges'

    if (type === 'tech_points') {
      let query = supabase.from('tech_points').select('*').order('created_at', { ascending: false });
      if (group_id) query = query.eq('group_id', group_id);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'tech_badges') {
      let query = supabase.from('tech_badges').select('*');
      if (group_id) query = query.eq('group_id', group_id);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'redemptions') {
      let query = supabase.from('reward_redemptions').select('*, customers(full_name)').order('created_at', { ascending: false });
      if (group_id) query = query.eq('group_id', group_id);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Default: transactions
    let query = supabase.from('reward_transactions').select('*, customers(full_name)').order('created_at', { ascending: false });
    if (group_id) query = query.eq('group_id', group_id);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Rewards GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, ...data } = body;

    const tableName = table || 'reward_transactions';
    const { data: result, error } = await supabase.from(tableName).insert(data).select().single();
    if (error) throw error;

    // If adding points to customer, update their balance
    if (tableName === 'reward_transactions' && data.type === 'earned') {
      try {
        await supabase.rpc('increment_reward_balance', {
          cust_id: data.customer_id,
          pts: data.points,
        });
      } catch {
        // Fallback: manual update if RPC doesn't exist
        await supabase.from('customer_rewards')
          .update({ balance: data.points })
          .eq('customer_id', data.customer_id);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rewards POST error:', error);
    return NextResponse.json({ error: 'Failed to create reward entry' }, { status: 500 });
  }
}
