import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBouncieConfigured, getVehicles, getTrips } from '@/lib/bouncie';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/truck/bouncie?type=vehicles|trips|diagnostics&imei=...&start=...&end=...
export async function GET(request: NextRequest) {
  try {
    if (!isBouncieConfigured()) {
      return NextResponse.json({ error: 'Bouncie not configured', configured: false }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'vehicles';
    const supabase = createServiceClient();

    if (type === 'vehicles') {
      // Return cached vehicles from DB, with option to include live data
      const { data: cached } = await supabase
        .from('bouncie_vehicles')
        .select('*')
        .order('nickname', { ascending: true });

      return NextResponse.json({
        vehicles: cached || [],
        configured: true,
      });
    }

    if (type === 'trips') {
      const imei = searchParams.get('imei');
      if (!imei) {
        return NextResponse.json({ error: 'imei parameter required' }, { status: 400 });
      }

      const start = searchParams.get('start');
      const end = searchParams.get('end');

      // If date range provided, return from DB cache
      if (start && end) {
        const { data: cached } = await supabase
          .from('bouncie_trips')
          .select('*')
          .eq('bouncie_vehicle_id', imei)
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: false });

        return NextResponse.json({
          trips: cached || [],
          configured: true,
        });
      }

      // Default: last 7 days
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: cached } = await supabase
        .from('bouncie_trips')
        .select('*')
        .eq('bouncie_vehicle_id', imei)
        .gte('start_time', startDate)
        .order('start_time', { ascending: false });

      return NextResponse.json({
        trips: cached || [],
        configured: true,
      });
    }

    if (type === 'diagnostics') {
      const imei = searchParams.get('imei');
      let diagQuery = supabase
        .from('bouncie_diagnostics')
        .select('*')
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });

      if (imei) {
        diagQuery = diagQuery.eq('bouncie_vehicle_id', imei);
      }

      const { data: cached } = await diagQuery;

      return NextResponse.json({
        diagnostics: cached || [],
        configured: true,
      });
    }

    if (type === 'summary') {
      const imei = searchParams.get('imei');
      if (!imei) {
        return NextResponse.json({ error: 'imei parameter required' }, { status: 400 });
      }

      // Get vehicle info
      const { data: vehicle } = await supabase
        .from('bouncie_vehicles')
        .select('*')
        .eq('bouncie_id', imei)
        .single();

      // Get trips this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthTrips } = await supabase
        .from('bouncie_trips')
        .select('distance_miles, fuel_used_gallons, duration_minutes, hard_brakes, rapid_accels')
        .eq('bouncie_vehicle_id', imei)
        .gte('start_time', monthStart.toISOString());

      const totalMiles = (monthTrips || []).reduce((s, t) => s + (t.distance_miles || 0), 0);
      const totalFuel = (monthTrips || []).reduce((s, t) => s + (t.fuel_used_gallons || 0), 0);
      const totalMinutes = (monthTrips || []).reduce((s, t) => s + (t.duration_minutes || 0), 0);
      const totalBrakes = (monthTrips || []).reduce((s, t) => s + (t.hard_brakes || 0), 0);
      const totalAccels = (monthTrips || []).reduce((s, t) => s + (t.rapid_accels || 0), 0);
      const avgMpg = totalFuel > 0 ? totalMiles / totalFuel : 0;

      // Active DTCs
      const { count: dtcCount } = await supabase
        .from('bouncie_diagnostics')
        .select('id', { count: 'exact', head: true })
        .eq('bouncie_vehicle_id', imei)
        .is('resolved_at', null);

      // Extract last_seen from raw_data if column is null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = vehicle?.raw_data as any;
      const lastSeen = vehicle?.last_location_at || rawData?.stats?.lastUpdated || null;

      return NextResponse.json({
        vehicle: vehicle ? { ...vehicle, last_location_at: lastSeen } : null,
        summary: {
          total_miles: Math.round(totalMiles * 10) / 10,
          total_fuel_gallons: Math.round(totalFuel * 10) / 10,
          avg_mpg: Math.round(avgMpg * 10) / 10,
          total_drive_hours: Math.round(totalMinutes / 6) / 10,
          trip_count: (monthTrips || []).length,
          hard_brakes: totalBrakes,
          rapid_accels: totalAccels,
          active_dtcs: dtcCount || 0,
        },
        configured: true,
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Bouncie API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch Bouncie data';
    return NextResponse.json({ error: message, configured: isBouncieConfigured() }, { status: 500 });
  }
}
