import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/truck/bouncie/webhook — Receives real-time events from Bouncie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    // Bouncie sends various event types
    const eventType = body.type || body.eventType || 'unknown';
    const imei = body.imei || body.vehicleId;

    console.log(`Bouncie webhook: ${eventType} for ${imei}`);

    switch (eventType) {
      case 'trip.start':
      case 'tripStart': {
        // Trip started — update vehicle location
        if (imei && body.location) {
          await supabase
            .from('bouncie_vehicles')
            .update({
              last_lat: body.location.lat,
              last_lng: body.location.lon || body.location.lng,
              last_location_at: new Date().toISOString(),
              synced_at: new Date().toISOString(),
            } as Record<string, unknown>)
            .eq('bouncie_id', imei);
        }
        break;
      }

      case 'trip.end':
      case 'tripEnd': {
        // Trip ended — store trip data and update vehicle
        if (imei) {
          const tripData = {
            bouncie_vehicle_id: imei,
            trip_id: body.transactionId || null,
            start_time: body.startTime || body.start?.time,
            end_time: body.endTime || body.end?.time || new Date().toISOString(),
            start_lat: body.startLocation?.lat || body.start?.location?.lat || null,
            start_lng: body.startLocation?.lon || body.start?.location?.lon || null,
            end_lat: body.endLocation?.lat || body.end?.location?.lat || null,
            end_lng: body.endLocation?.lon || body.end?.location?.lon || null,
            distance_miles: body.distance || null,
            max_speed_mph: body.maxSpeed || null,
            avg_speed_mph: body.averageSpeed || null,
            hard_brakes: body.hardBrakes || 0,
            rapid_accels: body.hardAccelerations || 0,
            raw_data: body,
          };

          // Upsert if we have a transaction ID, otherwise insert
          if (body.transactionId) {
            await supabase
              .from('bouncie_trips')
              .upsert(tripData as Record<string, unknown>, { onConflict: 'trip_id' });
          } else {
            await supabase
              .from('bouncie_trips')
              .insert(tripData as Record<string, unknown>);
          }

          // Update vehicle with latest location and odometer
          const vehicleUpdate: Record<string, unknown> = {
            last_lat: body.endLocation?.lat || body.end?.location?.lat,
            last_lng: body.endLocation?.lon || body.end?.location?.lon,
            last_location_at: new Date().toISOString(),
            synced_at: new Date().toISOString(),
          };
          if (body.odometer) vehicleUpdate.odometer = body.odometer;

          await supabase
            .from('bouncie_vehicles')
            .update(vehicleUpdate)
            .eq('bouncie_id', imei);
        }
        break;
      }

      case 'mil':
      case 'dtc':
      case 'checkEngine': {
        // Diagnostic trouble code
        if (imei && body.code) {
          await supabase.from('bouncie_diagnostics').insert({
            bouncie_vehicle_id: imei,
            code: body.code,
            description: body.description || null,
            severity: body.mil?.milOn ? 'critical' : 'warning',
            raw_data: body,
          } as Record<string, unknown>);
        }
        break;
      }

      case 'location': {
        // Real-time location update
        if (imei && (body.lat || body.location?.lat)) {
          await supabase
            .from('bouncie_vehicles')
            .update({
              last_lat: body.lat || body.location?.lat,
              last_lng: body.lon || body.lng || body.location?.lon || body.location?.lng,
              last_location_at: new Date().toISOString(),
            } as Record<string, unknown>)
            .eq('bouncie_id', imei);
        }
        break;
      }

      default:
        console.log('Unhandled Bouncie webhook event:', eventType, JSON.stringify(body).slice(0, 500));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Bouncie webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
