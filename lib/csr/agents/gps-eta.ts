import { createServiceClient } from '../utils';

export interface ETAResult {
  tech_id: string;
  tech_name: string;
  customer_name: string | null;
  customer_phone: string;
  customer_address: string;
  distance_text: string;
  duration_text: string;
  duration_seconds: number;
  eta_time: string;
  outbound_call_triggered: boolean;
  vapi_call_id: string | null;
}

export async function calculateETA(
  techLat: number,
  techLng: number,
  customerAddress: string,
): Promise<{ distance_text: string; duration_text: string; duration_seconds: number }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { distance_text: '~15 mi', duration_text: '~25 mins', duration_seconds: 1500 };
  }

  const origin = `${techLat},${techLng}`;
  const destination = encodeURIComponent(customerAddress);
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=imperial&key=${apiKey}`;

  try {
    const res = await fetch(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      return { distance_text: 'Unknown', duration_text: '~30 mins', duration_seconds: 1800 };
    }

    const element = data.rows[0].elements[0];
    if (element.status !== 'OK') {
      return { distance_text: 'Unknown', duration_text: '~30 mins', duration_seconds: 1800 };
    }

    return {
      distance_text: element.distance.text,
      duration_text: element.duration.text,
      duration_seconds: element.duration.value,
    };
  } catch (err) {
    console.error('[gps-eta] Distance Matrix fetch failed:', err);
    return { distance_text: 'Unknown', duration_text: '~30 mins', duration_seconds: 1800 };
  }
}

export async function triggerEnRouteCall(
  customerPhone: string,
  customerName: string | null,
  techName: string,
  etaDuration: string,
  etaTime: string,
  bookingId: string,
): Promise<{ success: boolean; vapi_call_id: string | null }> {
  if (!process.env.VAPI_API_KEY) {
    return { success: false, vapi_call_id: null };
  }

  const greeting = customerName
    ? `Hi ${customerName}, this is an automated call from Harden HVAC and Refrigeration.`
    : `Hi, this is an automated call from Harden HVAC and Refrigeration.`;

  const message = `${greeting} Your technician ${techName} is now on the way and should arrive in approximately ${etaDuration}. That puts the estimated arrival at around ${etaTime}. Please make sure someone is available to let the technician in. If you need to reschedule, please call us back at 9 5 6, 6 6 9, 9 0 9 3. Thank you and have a great day!`;

  try {
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || undefined,
        customer: {
          number: customerPhone,
          name: customerName || undefined,
        },
        assistant: {
          model: {
            provider: 'openai',
            model: 'gpt-5-mini',
            messages: [
              {
                role: 'system',
                content: 'You are calling a customer on behalf of Harden HVAC & Refrigeration to notify them their technician is en route. Deliver the message, answer brief questions about the arrival, and end the call politely. Do not schedule or reschedule appointments — direct them to call the office.',
              },
            ],
          },
          firstMessage: message,
          voice: { provider: 'vapi', voiceId: 'Elliot' },
          endCallFunctionEnabled: true,
          endCallMessage: 'Thank you! We look forward to helping you. Goodbye!',
          maxDurationSeconds: 120,
        },
        name: `ETA-Notify-${bookingId}`,
      }),
    });

    if (!res.ok) {
      console.error('[gps-eta] Vapi outbound call failed:', res.status, await res.text());
      return { success: false, vapi_call_id: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    return { success: true, vapi_call_id: data.id || null };
  } catch (err) {
    console.error('[gps-eta] Vapi outbound call error:', err);
    return { success: false, vapi_call_id: null };
  }
}

export async function dispatchEnRoute(
  bookingId: string,
  techId: string,
  techLat: number,
  techLng: number,
): Promise<ETAResult> {
  const supabase = createServiceClient();

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error(`Booking ${bookingId} not found: ${bookingErr?.message}`);
  }

  const { data: tech } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', techId)
    .single();

  const techName = tech?.full_name || 'Your technician';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = booking as any;
  const customerPhone = b.contact || b.phone || '';
  const customerName = b.name || b.customer_name || null;
  const customerAddress = b.address || b.location || 'Tallahassee, FL';

  if (!customerPhone) {
    throw new Error(`No customer phone on booking ${bookingId}`);
  }

  const eta = await calculateETA(techLat, techLng, customerAddress);

  const now = new Date();
  const arrivalTime = new Date(now.getTime() + eta.duration_seconds * 1000);
  const etaTime = arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  });

  const callResult = await triggerEnRouteCall(customerPhone, customerName, techName, eta.duration_text, etaTime, bookingId);

  await supabase.from('bookings').update({ status: 'en_route' } as Record<string, unknown>).eq('id', bookingId);

  await supabase.from('agent_logs').insert({
    agent: 'csr_gps_eta',
    action: 'en_route_dispatch',
    request_id: null,
    details: {
      booking_id: bookingId, tech_id: techId, tech_name: techName,
      customer_phone: customerPhone, distance: eta.distance_text,
      duration: eta.duration_text, eta_time: etaTime,
      outbound_call: callResult.success, vapi_call_id: callResult.vapi_call_id,
    },
  } as Record<string, unknown>);

  // Discord notification (fire-and-forget)
  if (process.env.DISCORD_BOT_TOKEN_DISPATCH && process.env.DISCORD_CHANNEL_DISPATCH) {
    fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_DISPATCH}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN_DISPATCH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [{
          title: `Tech En Route — ${techName}`,
          color: 0x0ea5e9,
          fields: [
            { name: 'Customer', value: customerName || 'Unknown', inline: true },
            { name: 'Phone', value: customerPhone, inline: true },
            { name: 'ETA', value: `${eta.duration_text} (${etaTime})`, inline: true },
            { name: 'Distance', value: eta.distance_text, inline: true },
            { name: 'Address', value: customerAddress.slice(0, 256) },
            { name: 'Auto-Call', value: callResult.success ? 'Customer notified' : 'Call not sent', inline: true },
          ],
          footer: { text: `Booking: ${bookingId}` },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(err => console.error('[gps-eta] Discord en-route post failed:', err));
  }

  return {
    tech_id: techId, tech_name: techName,
    customer_name: customerName, customer_phone: customerPhone,
    customer_address: customerAddress,
    distance_text: eta.distance_text, duration_text: eta.duration_text,
    duration_seconds: eta.duration_seconds, eta_time: etaTime,
    outbound_call_triggered: callResult.success,
    vapi_call_id: callResult.vapi_call_id,
  };
}
