/**
 * Vapi outbound call utilities for reschedule notifications
 */
export async function placeRescheduleCall(
  customerPhone: string,
  customerName: string | null,
  newDate: string,
  newTimeFrame: string,
): Promise<{ success: boolean; vapi_call_id: string | null }> {
  if (!process.env.VAPI_API_KEY) {
    return { success: false, vapi_call_id: null };
  }

  const greeting = customerName
    ? `Hi ${customerName}, this is an automated call from Harden HVAC and Refrigeration.`
    : `Hi, this is an automated call from Harden HVAC and Refrigeration.`;

  const dateFormatted = new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const message = `${greeting} We're calling to let you know your appointment has been rescheduled to ${dateFormatted} during the ${newTimeFrame} window. If this doesn't work for you, please call us back at 9 5 6, 6 6 9, 9 0 9 3 to find a better time. Thank you for choosing Harden HVAC!`;

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
            messages: [{
              role: 'system',
              content: 'You are calling a customer on behalf of Harden HVAC & Refrigeration to notify them about a rescheduled appointment. Confirm the new date and time, answer brief questions, and end politely. Direct them to call the office for further changes.',
            }],
          },
          firstMessage: message,
          voice: { provider: 'vapi', voiceId: 'Elliot' },
          endCallFunctionEnabled: true,
          endCallMessage: 'Thank you! We look forward to helping you. Goodbye!',
          maxDurationSeconds: 120,
        },
        name: `Reschedule-Notify-${Date.now()}`,
      }),
    });

    if (!res.ok) {
      console.error('[vapi-outbound] Reschedule call failed:', res.status);
      return { success: false, vapi_call_id: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    return { success: true, vapi_call_id: data.id || null };
  } catch (err) {
    console.error('[vapi-outbound] Reschedule call error:', err);
    return { success: false, vapi_call_id: null };
  }
}
