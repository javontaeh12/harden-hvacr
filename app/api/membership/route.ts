import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, contact, address } = body;

    if (!name || !contact) {
      return NextResponse.json(
        { ok: false, error: 'Name and contact info are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('priority_memberships')
      .insert({
        name,
        contact,
        address: address || null,
        status: 'pending',
      } as Record<string, unknown>)
      .select('id')
      .single();

    if (error) {
      console.error('Membership insert error:', error);
      return NextResponse.json(
        { ok: false, error: 'Failed to submit membership request.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, membershipId: data.id });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
