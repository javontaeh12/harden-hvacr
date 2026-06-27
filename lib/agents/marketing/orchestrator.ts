import { SupabaseClient } from '@supabase/supabase-js';
import { generateWeeklyStrategy, getSeason, getSeasonalServices } from './strategist';
import { generateContentPlan } from './planner';
import { generateCopy, generateVariant } from './copywriter';
import { generateCreativeBrief } from './creative-director';
import { generateImagePrompt } from './image-prompter';
import { validateContent } from './validator';
import { analyzeCampaignPerformance } from './analytics';
import { MarketingCampaign, MarketingContent, PipelineContext } from './types';

async function buildContext(supabase: SupabaseClient): Promise<PipelineContext> {
  const now = new Date();
  // Calculate Monday of current week
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const weekStart = monday.toISOString().split('T')[0];

  const season = getSeason(now);
  const services = getSeasonalServices(season);

  // Check active promotions
  const { data: promos } = await supabase
    .from('promotions')
    .select('name')
    .eq('active', true);

  return {
    week_start: weekStart,
    season,
    services_in_demand: services,
    recent_weather: '', // Future: integrate weather API
    active_promotions: (promos || []).map((p: Record<string, unknown>) => p.name as string),
  };
}

// Monday: Generate campaign strategy
export async function runStrategyPipeline(supabase: SupabaseClient): Promise<{
  campaigns: MarketingCampaign[];
  cost: number;
}> {
  const context = await buildContext(supabase);
  const result = await generateWeeklyStrategy(context);

  const campaigns: MarketingCampaign[] = [];
  const totalCost = result.cost;

  for (const c of result.campaigns) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name: c.name,
        description: c.description,
        status: 'draft',
        campaign_type: c.campaign_type,
        target_services: c.target_services,
        target_platforms: c.target_platforms,
        target_audience: c.target_audience,
        start_date: c.start_date,
        end_date: c.end_date,
        budget: c.budget,
        ai_cost: result.cost / result.campaigns.length,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) {
      console.error('Failed to insert campaign:', error);
      continue;
    }
    campaigns.push(data as MarketingCampaign);
  }

  // Log to agent_logs
  await supabase.from('agent_logs').insert({
    agent: 'marketing_strategy',
    action: 'weekly_strategy',
    details: {
      week_start: context.week_start,
      season: context.season,
      campaigns_created: campaigns.length,
      rationale: result.rationale,
      cost: totalCost,
    },
  } as Record<string, unknown>);

  return { campaigns, cost: totalCost };
}

// Tuesday: Generate content calendar + draft copy
export async function runContentPipeline(supabase: SupabaseClient): Promise<{
  contentCount: number;
  cost: number;
}> {
  const context = await buildContext(supabase);

  // Get this week's draft campaigns
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .in('status', ['draft', 'active'])
    .gte('created_at', context.week_start);

  if (!campaigns || campaigns.length === 0) {
    return { contentCount: 0, cost: 0 };
  }

  const plan = await generateContentPlan(campaigns as MarketingCampaign[], context.week_start);
  let totalCost = plan.cost;
  let contentCount = 0;

  for (const entry of plan.entries) {
    // Find the matching campaign
    const campaign = (campaigns as MarketingCampaign[]).find(c => c.id === entry.campaign_id);
    if (!campaign) continue;

    // Calculate the actual scheduled date
    const weekStartDate = new Date(context.week_start);
    const scheduledDate = new Date(weekStartDate);
    scheduledDate.setDate(weekStartDate.getDate() + entry.day_of_week - (weekStartDate.getDay() || 7));
    const dateStr = scheduledDate.toISOString().split('T')[0];

    // Insert content item
    const { data: content, error } = await supabase
      .from('marketing_content')
      .insert({
        campaign_id: entry.campaign_id,
        content_type: entry.content_type,
        platform: entry.platform,
        scheduled_date: dateStr,
        scheduled_time: entry.scheduled_time,
        status: 'draft',
        variant_label: 'A',
      } as Record<string, unknown>)
      .select()
      .single();

    if (error || !content) continue;

    // Generate copy
    const copyResult = await generateCopy(content as MarketingContent, campaign);
    totalCost += copyResult.cost;

    // Update content with copy
    await supabase
      .from('marketing_content')
      .update({
        headline: copyResult.headline,
        body_copy: copyResult.body_copy,
        cta: copyResult.cta,
        hashtags: copyResult.hashtags,
        ai_cost: copyResult.cost,
      } as Record<string, unknown>)
      .eq('id', content.id);

    // Insert calendar entry
    await supabase
      .from('marketing_calendar')
      .insert({
        week_start: context.week_start,
        campaign_id: entry.campaign_id,
        day_of_week: entry.day_of_week,
        platform: entry.platform,
        content_id: content.id,
        slot_label: entry.slot_label,
        notes: entry.notes,
      } as Record<string, unknown>);

    contentCount++;
  }

  await supabase.from('agent_logs').insert({
    agent: 'marketing_content',
    action: 'content_pipeline',
    details: {
      week_start: context.week_start,
      content_created: contentCount,
      cost: totalCost,
    },
  } as Record<string, unknown>);

  return { contentCount, cost: totalCost };
}

// Wednesday: Generate creative briefs + image prompts
export async function runCreativePipeline(supabase: SupabaseClient): Promise<{
  briefsGenerated: number;
  cost: number;
}> {
  const context = await buildContext(supabase);

  // Get this week's draft content that has copy but no creative brief
  const { data: contentItems } = await supabase
    .from('marketing_content')
    .select('*, marketing_campaigns(*)')
    .eq('status', 'draft')
    .not('body_copy', 'is', null)
    .gte('created_at', context.week_start);

  if (!contentItems || contentItems.length === 0) {
    return { briefsGenerated: 0, cost: 0 };
  }

  let totalCost = 0;
  let briefsGenerated = 0;

  for (const item of contentItems) {
    const content = item as MarketingContent & { marketing_campaigns: MarketingCampaign };
    const campaign = content.marketing_campaigns;
    if (!campaign) continue;

    // Skip if already has creative brief
    const brief = content.creative_brief as Record<string, unknown>;
    if (brief && brief.visual_concept) continue;

    // Generate creative brief
    const creativeBrief = await generateCreativeBrief(content, campaign);
    totalCost += creativeBrief.cost;

    // Generate image prompt
    const updatedContent = {
      ...content,
      creative_brief: {
        visual_concept: creativeBrief.visual_concept,
        layout: creativeBrief.layout,
        color_palette: creativeBrief.color_palette,
        mood: creativeBrief.mood,
        key_elements: creativeBrief.key_elements,
      },
    };
    const imagePrompt = await generateImagePrompt(updatedContent);
    totalCost += imagePrompt.cost;

    // Update content with creative brief + image prompt
    await supabase
      .from('marketing_content')
      .update({
        creative_brief: updatedContent.creative_brief,
        image_prompt: imagePrompt.prompt,
        ai_cost: (content.ai_cost || 0) + creativeBrief.cost + imagePrompt.cost,
      } as Record<string, unknown>)
      .eq('id', content.id);

    briefsGenerated++;
  }

  await supabase.from('agent_logs').insert({
    agent: 'marketing_creative',
    action: 'creative_pipeline',
    details: {
      week_start: context.week_start,
      briefs_generated: briefsGenerated,
      cost: totalCost,
    },
  } as Record<string, unknown>);

  return { briefsGenerated, cost: totalCost };
}

// Thursday: Generate A/B variants
export async function runVariantPipeline(supabase: SupabaseClient): Promise<{
  variantsCreated: number;
  cost: number;
}> {
  const context = await buildContext(supabase);

  // Get this week's content that is variant A (original) and has no B variant yet
  const { data: contentItems } = await supabase
    .from('marketing_content')
    .select('*, marketing_campaigns(*)')
    .eq('status', 'draft')
    .eq('variant_label', 'A')
    .not('body_copy', 'is', null)
    .gte('created_at', context.week_start);

  if (!contentItems || contentItems.length === 0) {
    return { variantsCreated: 0, cost: 0 };
  }

  let totalCost = 0;
  let variantsCreated = 0;

  for (const item of contentItems) {
    const content = item as MarketingContent & { marketing_campaigns: MarketingCampaign };
    const campaign = content.marketing_campaigns;
    if (!campaign) continue;

    // Check if B variant already exists
    const { count } = await supabase
      .from('marketing_content')
      .select('*', { count: 'exact', head: true })
      .eq('parent_content_id', content.id)
      .eq('variant_label', 'B');

    if (count && count > 0) continue;

    // Generate B variant
    const variant = await generateVariant(content, campaign, 'B');
    totalCost += variant.cost;

    // Insert variant content
    await supabase
      .from('marketing_content')
      .insert({
        campaign_id: content.campaign_id,
        content_type: content.content_type,
        platform: content.platform,
        scheduled_date: content.scheduled_date,
        scheduled_time: content.scheduled_time,
        status: 'draft',
        headline: variant.headline,
        body_copy: variant.body_copy,
        cta: variant.cta,
        hashtags: variant.hashtags,
        image_prompt: content.image_prompt,
        creative_brief: content.creative_brief,
        variant_label: 'B',
        parent_content_id: content.id,
        ai_cost: variant.cost,
      } as Record<string, unknown>);

    variantsCreated++;
  }

  await supabase.from('agent_logs').insert({
    agent: 'marketing_variants',
    action: 'variant_pipeline',
    details: {
      week_start: context.week_start,
      variants_created: variantsCreated,
      cost: totalCost,
    },
  } as Record<string, unknown>);

  return { variantsCreated, cost: totalCost };
}

// Friday: Validate + prepare for review
export async function runPreparePipeline(supabase: SupabaseClient): Promise<{
  validated: number;
  passed: number;
  failed: number;
  cost: number;
}> {
  const context = await buildContext(supabase);

  // Get all draft content from this week
  const { data: contentItems } = await supabase
    .from('marketing_content')
    .select('*')
    .eq('status', 'draft')
    .not('body_copy', 'is', null)
    .gte('created_at', context.week_start);

  if (!contentItems || contentItems.length === 0) {
    return { validated: 0, passed: 0, failed: 0, cost: 0 };
  }

  let totalCost = 0;
  let passed = 0;
  let failed = 0;

  for (const item of contentItems) {
    const content = item as MarketingContent;
    const result = await validateContent(content);
    totalCost += result.cost;

    if (result.passed) {
      // Move to pending_review
      await supabase
        .from('marketing_content')
        .update({
          status: 'pending_review',
          ai_cost: (content.ai_cost || 0) + result.cost,
        } as Record<string, unknown>)
        .eq('id', content.id);
      passed++;
    } else {
      // Keep as draft with issues noted
      await supabase
        .from('marketing_content')
        .update({
          rejection_reason: `Validation failed: ${result.issues.join('; ')}`,
          ai_cost: (content.ai_cost || 0) + result.cost,
        } as Record<string, unknown>)
        .eq('id', content.id);
      failed++;
    }
  }

  // Run analytics on each campaign
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .in('status', ['draft', 'active'])
    .gte('created_at', context.week_start);

  for (const campaign of campaigns || []) {
    const { data: campContent } = await supabase
      .from('marketing_content')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (campContent && campContent.length > 0) {
      const analytics = await analyzeCampaignPerformance(
        campaign as MarketingCampaign,
        campContent as MarketingContent[]
      );
      totalCost += analytics.cost;

      // Update campaign with performance data and set active
      await supabase
        .from('marketing_campaigns')
        .update({
          status: 'active',
          performance_data: {
            score: analytics.score,
            summary: analytics.summary,
            recommendations: analytics.recommendations,
          },
          ai_cost: (campaign.ai_cost || 0) + analytics.cost,
        } as Record<string, unknown>)
        .eq('id', campaign.id);
    }
  }

  await supabase.from('agent_logs').insert({
    agent: 'marketing_prepare',
    action: 'prepare_pipeline',
    details: {
      week_start: context.week_start,
      validated: contentItems.length,
      passed,
      failed,
      cost: totalCost,
    },
  } as Record<string, unknown>);

  return { validated: contentItems.length, passed, failed, cost: totalCost };
}

// Daily: Check triggers (weather/seasonal)
export async function runTriggerCheck(supabase: SupabaseClient): Promise<{
  triggered: number;
  cost: number;
}> {
  const { data: triggers } = await supabase
    .from('marketing_triggers')
    .select('*')
    .eq('is_active', true);

  if (!triggers || triggers.length === 0) {
    return { triggered: 0, cost: 0 };
  }

  const now = new Date();
  let triggered = 0;

  for (const trigger of triggers) {
    // Check cooldown
    if (trigger.last_fired_at) {
      const lastFired = new Date(trigger.last_fired_at);
      const hoursSince = (now.getTime() - lastFired.getTime()) / (1000 * 60 * 60);
      if (hoursSince < (trigger.cooldown_hours || 48)) continue;
    }

    const conditions = trigger.conditions as Record<string, unknown>;
    let shouldFire = false;

    // Seasonal triggers
    if (trigger.trigger_type === 'seasonal') {
      const season = getSeason(now);
      if (conditions.season === season) shouldFire = true;
    }

    // Manual triggers always fire (once past cooldown)
    if (trigger.trigger_type === 'manual') {
      shouldFire = true;
    }

    if (shouldFire) {
      const template = trigger.campaign_template as Record<string, unknown>;

      // Create campaign from template
      await supabase
        .from('marketing_campaigns')
        .insert({
          name: template.name || `Triggered: ${trigger.name}`,
          description: template.description || `Auto-generated from trigger: ${trigger.name}`,
          status: 'draft',
          campaign_type: (template.campaign_type as string) || trigger.trigger_type,
          target_services: (template.target_services as string[]) || [],
          target_platforms: (template.target_platforms as string[]) || ['facebook', 'instagram'],
          target_audience: (template.target_audience as string) || '',
          budget: (template.budget as number) || 10,
        } as Record<string, unknown>);

      // Update trigger last_fired_at
      await supabase
        .from('marketing_triggers')
        .update({ last_fired_at: now.toISOString() } as Record<string, unknown>)
        .eq('id', trigger.id);

      triggered++;
    }
  }

  if (triggered > 0) {
    await supabase.from('agent_logs').insert({
      agent: 'marketing_triggers',
      action: 'trigger_check',
      details: { triggered, checked: triggers.length },
    } as Record<string, unknown>);
  }

  return { triggered, cost: 0 };
}
