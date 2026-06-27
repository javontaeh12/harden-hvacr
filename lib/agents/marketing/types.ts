// Marketing system types

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignType = 'seasonal' | 'weather_reactive' | 'promotion' | 'awareness' | 'retention' | 'referral';
export type ContentType = 'post' | 'ad' | 'story' | 'reel_script' | 'email' | 'blog';
export type Platform = 'facebook' | 'instagram' | 'google_ads' | 'email' | 'website';
export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type TriggerType = 'weather' | 'seasonal' | 'performance' | 'manual';

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  campaign_type: CampaignType;
  target_services: string[];
  target_platforms: string[];
  target_audience: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  performance_data: Record<string, unknown>;
  ai_cost: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingContent {
  id: string;
  campaign_id: string;
  content_type: ContentType;
  platform: Platform;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: ContentStatus;
  headline: string | null;
  body_copy: string | null;
  cta: string | null;
  hashtags: string[];
  image_prompt: string | null;
  image_url: string | null;
  creative_brief: Record<string, unknown>;
  ad_targeting: Record<string, unknown>;
  variant_label: string | null;
  parent_content_id: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  ai_cost: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingCalendarEntry {
  id: string;
  week_start: string;
  campaign_id: string;
  day_of_week: number;
  platform: string;
  content_id: string | null;
  slot_label: string | null;
  notes: string | null;
  created_at: string;
}

export interface MarketingTrigger {
  id: string;
  trigger_type: TriggerType;
  name: string;
  conditions: Record<string, unknown>;
  campaign_template: Record<string, unknown>;
  is_active: boolean;
  last_fired_at: string | null;
  cooldown_hours: number;
  created_at: string;
}

// AI pipeline types

export interface StrategyResult {
  campaigns: {
    name: string;
    description: string;
    campaign_type: CampaignType;
    target_services: string[];
    target_platforms: Platform[];
    target_audience: string;
    start_date: string;
    end_date: string;
    budget: number;
  }[];
  rationale: string;
  cost: number;
}

export interface ContentPlan {
  entries: {
    campaign_id: string;
    day_of_week: number;
    platform: Platform;
    content_type: ContentType;
    slot_label: string;
    scheduled_time: string;
    notes: string;
  }[];
  cost: number;
}

export interface CopyResult {
  content_id: string;
  headline: string;
  body_copy: string;
  cta: string;
  hashtags: string[];
  cost: number;
}

export interface CreativeBrief {
  content_id: string;
  visual_concept: string;
  layout: string;
  color_palette: string[];
  mood: string;
  key_elements: string[];
  cost: number;
}

export interface ImagePromptResult {
  content_id: string;
  prompt: string;
  style_notes: string;
  cost: number;
}

export interface ValidationResult {
  content_id: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  cost: number;
}

export interface AnalyticsResult {
  campaign_id: string;
  summary: string;
  recommendations: string[];
  score: number;
  cost: number;
}

export interface PipelineContext {
  week_start: string; // YYYY-MM-DD (Monday)
  season: string;
  services_in_demand: string[];
  recent_weather: string;
  active_promotions: string[];
}

export const BRAND_RULES = {
  company_name: 'Harden HVAC & Refrigeration',
  service_area: 'Tallahassee and Quincy, FL',
  colors: { primary: '#1e40af', secondary: '#dc2626' },
  tone: 'Professional, trustworthy, experienced',
  never: [
    'Never fabricate credentials, testimonials, prices, or warranties',
    'Never mention locations outside Tallahassee/Quincy FL service area',
    'Never promise emergency/same-day service unless explicitly configured',
    'Never abbreviate company name differently than "Harden HVAC & Refrigeration"',
  ],
  platform_limits: {
    facebook: { post: 500, ad: 125 },
    instagram: { post: 2200, story: 100, ad: 125 },
    google_ads: { headline: 30, description: 90 },
  } as Record<string, Record<string, number>>,
};
