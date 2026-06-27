import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isBouncieConfigured, getVehicles, getTrips, getDiagnostics, type BouncieVehicle, type BouncieTrip } from '@/lib/bouncie';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/truck/bouncie/sync — Pull latest data from Bouncie API into our DB
export async function POST(request: NextRequest) {
  try {
    if (!isBouncieConfigured()) {
      return NextResponse.json({ error: 'Bouncie not configured' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const syncType = body.type || 'all'; // vehicles, trips, diagnostics, all
    const supabase = createServiceClient();
    const results: Record<string, unknown> = {};

    // 1. Sync vehicles
    if (syncType === 'all' || syncType === 'vehicles') {
      try {
        const vehicles = await getVehicles();
        let synced = 0;

        for (const v of vehicles) {
          const vehicleData = {
            bouncie_id: v.imei,
            vin: v.vin || null,
            year: v.model?.year || null,
            make: v.model?.make || null,
            model: v.model?.name || null,
            nickname: v.nickName || null,
            odometer: v.stats?.odometer || null,
            fuel_level: v.stats?.fuelLevel || null,
            battery_voltage: v.stats?.battery?.voltage || (v as Record<string, unknown>).batteryVoltage as number || null,
            last_lat: v.stats?.location?.lat || null,
            last_lng: v.stats?.location?.lon || null,
            last_location_at: (v.stats as Record<string, unknown>)?.lastUpdated as string || v.stats?.location?.timestamp || null,
            raw_data: v,
            synced_at: new Date().toISOString(),
          };

          await supabase
            .from('bouncie_vehicles')
            .upsert(vehicleData as Record<string, unknown>, { onConflict: 'bouncie_id' });
          synced++;
        }

        // Log sync
        for (const v of vehicles) {
          await supabase.from('bouncie_sync_log').insert({
            bouncie_vehicle_id: v.imei,
            sync_type: 'vehicles',
            record_count: 1,
          } as Record<string, unknown>);
        }

        results.vehicles = { synced, total: vehicles.length };
      } catch (err) {
        results.vehicles = { error: err instanceof Error ? err.message : 'Failed' };
      }
    }

    // 2. Sync trips (last 7 days by default)
    if (syncType === 'all' || syncType === 'trips') {
      try {
        const { data: vehicles } = await supabase
          .from('bouncie_vehicles')
          .select('bouncie_id');

        const endDate = new Date().toISOString();
        const startDate = body.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let totalTrips = 0;

        for (const vehicle of (vehicles || [])) {
          try {
            const trips = await getTrips(vehicle.bouncie_id, startDate, endDate);

            for (const trip of trips) {
              const tripData = {
                bouncie_vehicle_id: vehicle.bouncie_id,
                trip_id: trip.transactionId || null,
                start_time: trip.startTime,
                end_time: trip.endTime || null,
                start_lat: trip.startLocation?.lat || null,
                start_lng: trip.startLocation?.lon || null,
                start_address: trip.startLocation?.address || null,
                end_lat: trip.endLocation?.lat || null,
                end_lng: trip.endLocation?.lon || null,
                end_address: trip.endLocation?.address || null,
                distance_miles: trip.distance || null,
                duration_minutes: trip.endTime && trip.startTime
                  ? (new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 60000
                  : null,
                idle_minutes: trip.idleTime ? trip.idleTime / 60 : null,
                max_speed_mph: trip.maxSpeed || null,
                avg_speed_mph: trip.averageSpeed || null,
                fuel_used_gallons: trip.fuelConsumed || null,
                mpg: trip.mpg || null,
                hard_brakes: trip.hardBrakes || 0,
                rapid_accels: trip.hardAccelerations || 0,
                raw_data: trip,
                synced_at: new Date().toISOString(),
              };

              if (trip.transactionId) {
                await supabase
                  .from('bouncie_trips')
                  .upsert(tripData as Record<string, unknown>, { onConflict: 'trip_id' });
              } else {
                await supabase
                  .from('bouncie_trips')
                  .insert(tripData as Record<string, unknown>);
              }
              totalTrips++;
            }

            await supabase.from('bouncie_sync_log').insert({
              bouncie_vehicle_id: vehicle.bouncie_id,
              sync_type: 'trips',
              record_count: trips.length,
            } as Record<string, unknown>);
          } catch (tripErr) {
            console.error(`Trip sync error for ${vehicle.bouncie_id}:`, tripErr);
          }
        }

        results.trips = { synced: totalTrips };
      } catch (err) {
        results.trips = { error: err instanceof Error ? err.message : 'Failed' };
      }
    }

    // 3. Sync diagnostics
    if (syncType === 'all' || syncType === 'diagnostics') {
      try {
        const { data: vehicles } = await supabase
          .from('bouncie_vehicles')
          .select('bouncie_id');

        let totalDtcs = 0;

        for (const vehicle of (vehicles || [])) {
          try {
            const diag = await getDiagnostics(vehicle.bouncie_id);

            // Handle different possible response formats
            const dtcList = Array.isArray(diag) ? diag : (diag as Record<string, unknown>).dtcs as Record<string, unknown>[] || [];

            for (const dtc of dtcList) {
              const dtcRecord = dtc as Record<string, unknown>;
              await supabase.from('bouncie_diagnostics').insert({
                bouncie_vehicle_id: vehicle.bouncie_id,
                code: dtcRecord.code || 'UNKNOWN',
                description: dtcRecord.description || null,
                severity: dtcRecord.severity || 'info',
                raw_data: dtc,
              } as Record<string, unknown>);
              totalDtcs++;
            }

            await supabase.from('bouncie_sync_log').insert({
              bouncie_vehicle_id: vehicle.bouncie_id,
              sync_type: 'diagnostics',
              record_count: dtcList.length,
            } as Record<string, unknown>);
          } catch (diagErr) {
            console.error(`Diagnostics sync error for ${vehicle.bouncie_id}:`, diagErr);
          }
        }

        results.diagnostics = { synced: totalDtcs };
      } catch (err) {
        results.diagnostics = { error: err instanceof Error ? err.message : 'Failed' };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Bouncie sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
