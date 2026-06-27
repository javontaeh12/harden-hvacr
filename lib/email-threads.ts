import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function generateToken(): string {
  return `HARDEN-${nanoid(8)}`;
}

export async function createThread(
  agent: string,
  requestId: string | null,
  context: Record<string, unknown>
): Promise<string> {
  const supabase = createServiceClient();
  const token = generateToken();

  await supabase.from('email_threads').insert({
    token,
    agent,
    request_id: requestId,
    context,
    status: 'awaiting_reply',
  } as Record<string, unknown>);

  return token;
}

export async function findThreadByToken(token: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('email_threads')
    .select('*')
    .eq('token', token)
    .single();
  return data;
}

export async function resolveThread(threadId: string) {
  const supabase = createServiceClient();
  await supabase
    .from('email_threads')
    .update({ status: 'resolved' } as Record<string, unknown>)
    .eq('id', threadId);
}

export function buildSubjectWithToken(subject: string, token: string): string {
  return `${subject} [${token}]`;
}

export function extractTokenFromSubject(subject: string): string | null {
  const match = subject.match(/\[HARDEN-([A-Za-z0-9_-]{8})\]/);
  return match ? `HARDEN-${match[1]}` : null;
}
