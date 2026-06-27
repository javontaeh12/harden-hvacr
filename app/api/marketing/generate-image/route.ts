import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { openai } from '@/lib/openai';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 120;

// Platform-optimized DALL-E sizes
function getDalleSize(platform: string, contentType: string): '1024x1024' | '1792x1024' | '1024x1792' {
  if (platform === 'instagram' && contentType === 'story') return '1024x1792';
  if (platform === 'instagram') return '1024x1024';
  return '1792x1024';
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authSupabase = await createServerSupabaseClient();
    const { data: user } = await authSupabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content_id } = await request.json();
    if (!content_id) return NextResponse.json({ error: 'content_id required' }, { status: 400 });

    const supabase = createServiceClient();

    // Get the content item
    const { data: content, error: fetchErr } = await supabase
      .from('marketing_content')
      .select('*')
      .eq('id', content_id)
      .single();

    if (fetchErr || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (!content.image_prompt) {
      return NextResponse.json({ error: 'No image prompt on this content. Run the Creative pipeline first.' }, { status: 400 });
    }

    const size = getDalleSize(content.platform, content.content_type);

    // Generate the complete ad flyer with DALL-E 3 HD
    // The prompt already includes headline text, CTA, and branding instructions
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: content.image_prompt,
      n: 1,
      size,
      quality: 'hd',
      style: 'natural',
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed — no URL returned' }, { status: 500 });
    }

    // Download the image
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const imgData = new Uint8Array(imgBuffer);

    // Upload to Supabase Storage
    const bucketName = 'marketing-images';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const fileName = `ad-${content_id}-${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(fileName, imgData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      await supabase
        .from('marketing_content')
        .update({ image_url: imageUrl } as Record<string, unknown>)
        .eq('id', content_id);
      return NextResponse.json({ ok: true, image_url: imageUrl, storage: false });
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    const permanentUrl = publicUrl.publicUrl;

    // Update content with final ad URL
    await supabase
      .from('marketing_content')
      .update({ image_url: permanentUrl } as Record<string, unknown>)
      .eq('id', content_id);

    return NextResponse.json({ ok: true, image_url: permanentUrl, storage: true });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Image generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
