import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  runStrategyPipeline,
  runContentPipeline,
  runCreativePipeline,
  runVariantPipeline,
  runPreparePipeline,
  runTriggerCheck,
} from '@/lib/agents/marketing/orchestrator';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authSupabase = await createServerSupabaseClient();
    const { data: user } = await authSupabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { step } = await request.json();
    const supabase = createServiceClient();

    let result: Record<string, unknown>;

    switch (step) {
      case 'strategy':
        result = await runStrategyPipeline(supabase);
        break;
      case 'content':
        result = await runContentPipeline(supabase);
        break;
      case 'creative':
        result = await runCreativePipeline(supabase);
        break;
      case 'variants':
        result = await runVariantPipeline(supabase);
        break;
      case 'prepare':
        result = await runPreparePipeline(supabase);
        break;
      case 'triggers':
        result = await runTriggerCheck(supabase);
        break;
      default:
        return NextResponse.json({ error: 'Invalid step. Use: strategy, content, creative, variants, prepare, triggers' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, step, result });
  } catch (error) {
    console.error('Pipeline manual run error:', error);
    return NextResponse.json({ error: 'Pipeline execution failed' }, { status: 500 });
  }
}
