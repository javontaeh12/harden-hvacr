import { NextRequest, NextResponse } from 'next/server';
import { calculateETA, triggerEnRouteCall } from '@/lib/csr/agents/gps-eta';
import { createServiceClient } from '@/lib/csr/utils';

/**
 * POST /api/csr/dispatch-notify — Direct en-route customer notification
 * Replaces the Railway /api/dispatch/notify endpoint
 * Body: { customer_phone, customer_name?, customer_address?, tech_name, tech_lat, tech_lng, work_order_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const { customer_phone, customer_name, customer_address, tech_name, tech_lat, tech_lng, work_order_id } = await request.json();

    if (!customer_phone) {
      return NextResponse.json({ error: 'customer_phone is required' }, { status: 400 });
    }
    if (typeof tech_lat !== 'number' || typeof tech_lng !== 'number') {
      return NextResponse.json({ error: 'tech_lat and tech_lng must be numbers' }, { status: 400 });
    }

    const address = customer_address || 'Tallahassee, FL';

    // Calculate ETA
    const eta = await calculateETA(tech_lat, tech_lng, address);

    const now = new Date();
    const arrivalTime = new Date(now.getTime() + eta.duration_seconds * 1000);
    const etaTime = arrivalTime.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
    });

    // Trigger outbound call
    const callResult = await triggerEnRouteCall(
      customer_phone,
      customer_name || null,
      tech_name || 'Your technician',
      eta.duration_text,
      etaTime,
      work_order_id || 'direct-notify',
    );

    // Log to DB
    const supabase = createServiceClient();
    await supabase.from('agent_logs').insert({
      agent: 'csr_gps_eta',
      action: 'en_route_notify_direct',
      request_id: null,
      details: {
        work_order_id, customer_phone, customer_name,
        customer_address: address, tech_name,
        distance: eta.distance_text, duration: eta.duration_text,
        eta_time: etaTime, outbound_call: callResult.success,
        vapi_call_id: callResult.vapi_call_id,
      },
    } as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      distance_text: eta.distance_text,
      duration_text: eta.duration_text,
      duration_seconds: eta.duration_seconds,
      eta_time: etaTime,
      outbound_call_triggered: callResult.success,
      vapi_call_id: callResult.vapi_call_id,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[dispatch-notify] Error:', errMsg);
    return NextResponse.json({ error: 'Dispatch failed', detail: errMsg }, { status: 500 });
  }
}
