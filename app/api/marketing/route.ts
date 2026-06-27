import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const group_id = searchParams.get('group_id');
    const type = searchParams.get('type'); // promotions, referrals, stats

    if (type === 'stats' && group_id) {
      const [customersResult, referralsResult, promotionsResult] = await Promise.all([
        supabase.from('customers').select('id, created_at').eq('group_id', group_id),
        supabase.from('referrals').select('*').eq('group_id', group_id),
        supabase.from('promotions').select('*').eq('group_id', group_id).eq('active', true),
      ]);

      const customers = customersResult.data || [];
      const referrals = referralsResult.data || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const newThisMonth = customers.filter(c => c.created_at >= monthStart).length;
      const converted = referrals.filter(r => r.status === 'converted').length;
      const referralRevenue = referrals
        .filter(r => r.status === 'converted')
        .reduce((sum, r) => sum + (r.reward_amount || 0), 0);

      return NextResponse.json({
        totalCustomers: customers.length,
        newThisMonth,
        totalReferrals: referrals.length,
        convertedReferrals: converted,
        referralRevenue,
        activePromotions: (promotionsResult.data || []).length,
      });
    }

    if (type === 'promotions') {
      let query = supabase.from('promotions').select('*').order('created_at', { ascending: false });
      if (group_id) query = query.eq('group_id', group_id);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'referrals') {
      let query = supabase.from('referrals').select('*, customers:referrer_id(full_name)').order('created_at', { ascending: false });
      if (group_id) query = query.eq('group_id', group_id);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Type parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Marketing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'promotion') {
      const { data: result, error } = await supabase
        .from('promotions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Type parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Marketing POST error:', error);
    return NextResponse.json({ error: 'Failed to create marketing item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, type, ...updates } = body;

    if (type === 'promotion') {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Type parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Marketing PUT error:', error);
    return NextResponse.json({ error: 'Failed to update marketing item' }, { status: 500 });
  }
}
