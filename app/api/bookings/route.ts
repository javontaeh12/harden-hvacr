import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/csr/integrations/google-calendar';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's profile to verify group access
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const group_id = searchParams.get('group_id');

    // Verify user belongs to the requested group
    const profileGroup = profile?.group_id;
    const requestedGroup = group_id;
    if (requestedGroup && requestedGroup !== profileGroup) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let query = supabase.from('bookings').select('*').order('start_time', { ascending: false });

    if (group_id) query = query.eq('group_id', group_id);
    if (status) query = query.eq('status', status);
    if (search) query = query.or(`name.ilike.%${search}%,contact.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's profile to verify group access
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single();

    const body = await request.json();

    // Verify user belongs to the requested group
    const profileGroup = profile?.group_id;
    const requestedGroup = body.group_id;
    if (requestedGroup && requestedGroup !== profileGroup) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    // After successful insert, sync to Google Calendar
    try {
      const startDate = data.start_time.split('T')[0]; // YYYY-MM-DD
      const startHour = new Date(data.start_time).getHours();
      const timeFrame = startHour < 12 ? '8 AM - 12 PM' : '12 PM - 5 PM';

      const eventId = await createCalendarEvent({
        summary: `${data.service_type} - ${data.name}`,
        description: data.notes || data.service_type,
        startDate,
        timeFrame,
        customerName: data.name,
        customerPhone: data.contact || '',
      });

      if (eventId) {
        await supabase
          .from('bookings')
          .update({ google_event_id: eventId })
          .eq('id', data.id);
        data.google_event_id = eventId;
      }
    } catch (calErr) {
      console.error('Google Calendar sync failed (non-blocking):', calErr);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bookings POST error:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    // Fetch the existing booking to check for old google_event_id and start_time
    const { data: oldBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If start_time changed, delete old calendar event and create a new one
    if (updates.start_time && oldBooking && updates.start_time !== oldBooking.start_time) {
      try {
        // Delete old event if it exists
        if (oldBooking.google_event_id) {
          await deleteCalendarEvent(oldBooking.google_event_id);
        }

        // Create new event with updated time
        const startDate = data.start_time.split('T')[0];
        const startHour = new Date(data.start_time).getHours();
        const timeFrame = startHour < 12 ? '8 AM - 12 PM' : '12 PM - 5 PM';

        const eventId = await createCalendarEvent({
          summary: `${data.service_type} - ${data.name}`,
          description: data.notes || data.service_type,
          startDate,
          timeFrame,
          customerName: data.name,
          customerPhone: data.contact || '',
        });

        if (eventId) {
          await supabase
            .from('bookings')
            .update({ google_event_id: eventId })
            .eq('id', data.id);
          data.google_event_id = eventId;
        }
      } catch (calErr) {
        console.error('Google Calendar sync failed on update (non-blocking):', calErr);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bookings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookings DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
