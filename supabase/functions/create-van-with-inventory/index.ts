import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create a client with the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for DB operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is an approved admin
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, status, group_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || profile.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Only approved admins can create vans" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { van_number, group_id } = await req.json();

    if (!van_number || typeof van_number !== "string" || van_number.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "van_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use group_id from request body, falling back to user's profile group_id
    const effectiveGroupId = group_id || profile.group_id;

    if (!effectiveGroupId) {
      return new Response(
        JSON.stringify({ error: "group_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify group_id matches user's group
    if (effectiveGroupId !== profile.group_id) {
      return new Response(
        JSON.stringify({ error: "Cannot create van in another group" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedVanNumber = van_number.trim();

    // Create the van with group_id
    const { data: van, error: vanError } = await adminClient
      .from("vans")
      .insert({
        name: `Van ${trimmedVanNumber}`,
        van_number: trimmedVanNumber,
        group_id: effectiveGroupId,
      } as Record<string, unknown>)
      .select()
      .single();

    if (vanError) {
      const message = vanError.code === "23505"
        ? `Van number "${trimmedVanNumber}" already exists`
        : vanError.message;
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch group's stock parts instead of using hardcoded PARTS_DATABASE
    const { data: groupParts, error: partsError } = await adminClient
      .from("group_stock_parts")
      .select("item, description, category")
      .eq("group_id", effectiveGroupId);

    if (partsError) {
      console.error("Error fetching group stock parts:", partsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch group stock parts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!groupParts || groupParts.length === 0) {
      return new Response(
        JSON.stringify({
          van,
          parts_count: 0,
          total_parts: 0,
          warning: "No stock parts defined for this group. Add parts in Stock Parts management.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch-insert all group parts with quantity 0
    const inventoryRows = groupParts.map((part) => ({
      van_id: van.id,
      name: part.description || part.item,
      description: part.description,
      part_number: part.item,
      quantity: 0,
      min_quantity: 1,
      cost: null,
      vendor: null,
      category: part.category || "Misc",
      group_id: effectiveGroupId,
    }));

    // Insert in batches of 100
    let insertedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < inventoryRows.length; i += batchSize) {
      const batch = inventoryRows.slice(i, i + batchSize);
      const { error: insertError } = await adminClient
        .from("inventory_items")
        .insert(batch as Record<string, unknown>[]);

      if (insertError) {
        console.error(`Batch insert error at offset ${i}:`, insertError);
        // Continue with remaining batches
      } else {
        insertedCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        van,
        parts_count: insertedCount,
        total_parts: groupParts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
