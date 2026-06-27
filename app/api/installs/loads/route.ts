import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { computeProjectLoads, distributeAirflow, recommendTonnage } from '@/lib/installs/load-calc';
import type { DesignConditions, InstallRoom, InstallSurface, InstallOpening } from '@/lib/installs/types';

/**
 * GET /api/installs/loads?project_id=xxx
 * Returns existing stored loads for a project.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_loads')
      .select('*')
      .eq('project_id', project_id)
      .order('load_type', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Install loads GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
  }
}

/**
 * POST /api/installs/loads
 * Body: { project_id: string }
 *
 * Calculates loads from project data + room envelopes, persists results,
 * updates room CFM values, and returns everything.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Fetch project
    const { data: project, error: projErr } = await supabase
      .from('install_projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch rooms with surfaces and openings
    const { data: rooms, error: roomsErr } = await supabase
      .from('install_rooms')
      .select('*, install_surfaces(*), install_openings(*)')
      .eq('project_id', project_id)
      .order('sort_order', { ascending: true });

    if (roomsErr) throw roomsErr;
    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ error: 'No rooms found. Add rooms before calculating loads.' }, { status: 400 });
    }

    // Build design conditions from project
    const design: DesignConditions = {
      outdoorCoolingTemp: project.design_cooling_temp ?? 95,
      outdoorHeatingTemp: project.design_heating_temp ?? 30,
      indoorCoolingTemp: project.indoor_cooling_temp ?? 75,
      indoorHeatingTemp: project.indoor_heating_temp ?? 70,
      elevationFt: project.elevation_ft ?? 0,
      humidityZone: project.humidity_zone ?? 'moderate',
      dailyRange: 'medium',
      latitude: project.lat ?? 30,
    };

    // Determine duct location from existing equipment info or default
    const existingEquip = project.existing_equipment as Record<string, unknown> | null;
    const ahLocation = (existingEquip?.ah_location as string) ?? 'attic_insulated';
    const ductLocation = ahLocation.includes('attic') ? 'attic_insulated'
      : ahLocation.includes('crawl') ? 'crawlspace_insulated'
      : ahLocation.includes('garage') ? 'garage'
      : ahLocation.includes('basement') ? 'conditioned_space'
      : 'attic_insulated';

    // Build room envelope data
    const roomsWithEnvelopes = rooms.map((r: InstallRoom & { install_surfaces: InstallSurface[]; install_openings: InstallOpening[] }) => ({
      room: r as InstallRoom,
      surfaces: (r.install_surfaces || []) as InstallSurface[],
      openings: (r.install_openings || []) as InstallOpening[],
    }));

    // Compute loads
    const { coolingLoads, heatingLoads, totals } = computeProjectLoads(
      roomsWithEnvelopes,
      design,
      ductLocation,
      project.year_built,
    );

    // Distribute airflow
    const airflow = distributeAirflow(coolingLoads, totals.coolingCFM);
    const recommendedTons = recommendTonnage(totals.tonnageRequired);

    // Delete existing loads for this project
    await supabase.from('install_loads').delete().eq('project_id', project_id);

    // Insert room-level loads
    const loadRows: Record<string, unknown>[] = [];
    for (let i = 0; i < coolingLoads.length; i++) {
      const cl = coolingLoads[i];
      const hl = heatingLoads[i];
      const roomAirflow = airflow.get(cl.roomId);

      loadRows.push({
        project_id,
        room_id: cl.roomId,
        load_type: 'room',
        sensible_wall: cl.sensibleWall,
        sensible_ceiling: cl.sensibleCeiling,
        sensible_floor: cl.sensibleFloor,
        sensible_window_conduction: cl.sensibleWindowConduction,
        sensible_window_solar: cl.sensibleWindowSolar,
        sensible_door: cl.sensibleDoor,
        sensible_infiltration: cl.sensibleInfiltration,
        sensible_internal: cl.sensibleInternal,
        sensible_duct: cl.sensibleDuct,
        total_sensible_cooling: cl.totalSensibleCooling,
        total_latent_cooling: cl.totalLatentCooling,
        total_cooling: cl.totalCooling,
        heating_wall: hl.heatingWall,
        heating_ceiling: hl.heatingCeiling,
        heating_floor: hl.heatingFloor,
        heating_window: hl.heatingWindow,
        heating_door: hl.heatingDoor,
        heating_infiltration: hl.heatingInfiltration,
        heating_duct: hl.heatingDuct,
        total_heating: hl.totalHeating,
        cooling_cfm: roomAirflow?.coolingCfm ?? 0,
        heating_cfm: roomAirflow?.heatingCfm ?? 0,
        tonnage_required: 0,
      });
    }

    // Insert total row
    loadRows.push({
      project_id,
      room_id: null,
      load_type: 'total',
      sensible_wall: coolingLoads.reduce((s, l) => s + l.sensibleWall, 0),
      sensible_ceiling: coolingLoads.reduce((s, l) => s + l.sensibleCeiling, 0),
      sensible_floor: coolingLoads.reduce((s, l) => s + l.sensibleFloor, 0),
      sensible_window_conduction: coolingLoads.reduce((s, l) => s + l.sensibleWindowConduction, 0),
      sensible_window_solar: coolingLoads.reduce((s, l) => s + l.sensibleWindowSolar, 0),
      sensible_door: coolingLoads.reduce((s, l) => s + l.sensibleDoor, 0),
      sensible_infiltration: coolingLoads.reduce((s, l) => s + l.sensibleInfiltration, 0),
      sensible_internal: coolingLoads.reduce((s, l) => s + l.sensibleInternal, 0),
      sensible_duct: coolingLoads.reduce((s, l) => s + l.sensibleDuct, 0),
      total_sensible_cooling: totals.totalSensibleCooling,
      total_latent_cooling: totals.totalLatentCooling,
      total_cooling: totals.totalCooling,
      heating_wall: heatingLoads.reduce((s, l) => s + l.heatingWall, 0),
      heating_ceiling: heatingLoads.reduce((s, l) => s + l.heatingCeiling, 0),
      heating_floor: heatingLoads.reduce((s, l) => s + l.heatingFloor, 0),
      heating_window: heatingLoads.reduce((s, l) => s + l.heatingWindow, 0),
      heating_door: heatingLoads.reduce((s, l) => s + l.heatingDoor, 0),
      heating_infiltration: heatingLoads.reduce((s, l) => s + l.heatingInfiltration, 0),
      heating_duct: heatingLoads.reduce((s, l) => s + l.heatingDuct, 0),
      total_heating: totals.totalHeating,
      cooling_cfm: totals.coolingCFM,
      heating_cfm: totals.heatingCFM,
      tonnage_required: totals.tonnageRequired,
    });

    const { data: savedLoads, error: insertErr } = await supabase
      .from('install_loads')
      .insert(loadRows)
      .select();

    if (insertErr) throw insertErr;

    // Update room records with computed CFM and BTU values
    for (const cl of coolingLoads) {
      const hl = heatingLoads.find(h => h.roomId === cl.roomId);
      const roomAirflow = airflow.get(cl.roomId);
      if (roomAirflow) {
        await supabase
          .from('install_rooms')
          .update({
            cooling_btuh: cl.totalCooling,
            heating_btuh: hl?.totalHeating ?? 0,
            cooling_cfm: roomAirflow.coolingCfm,
            heating_cfm: roomAirflow.heatingCfm,
          })
          .eq('id', cl.roomId);
      }
    }

    return NextResponse.json({
      loads: savedLoads,
      totals,
      recommendedTonnage: recommendedTons,
      roomAirflow: Object.fromEntries(airflow),
    });
  } catch (error) {
    console.error('Install loads POST error:', error);
    return NextResponse.json({ error: 'Failed to calculate loads' }, { status: 500 });
  }
}
