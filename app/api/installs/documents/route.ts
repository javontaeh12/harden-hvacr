import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { InstallRoom, InstallEquipmentOption, InstallDuctSegment, InstallMaterial, DocType } from '@/lib/installs/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_id = searchParams.get('project_id');
    const doc_type = searchParams.get('doc_type');

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('install_documents')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });

    if (doc_type) query = query.eq('doc_type', doc_type);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

/**
 * POST /api/installs/documents
 * Body: { project_id, action: 'auto_generate', doc_type } — auto-generates document content
 * Body: { project_id, doc_type, title, content } — creates manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, action, doc_type } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    if (action === 'auto_generate') {
      // Fetch project data
      const { data: project, error: projErr } = await supabase
        .from('install_projects')
        .select('*, customers(full_name, phone, address, email)')
        .eq('id', project_id)
        .single();
      if (projErr || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const { data: rooms } = await supabase
        .from('install_rooms')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order');

      const { data: equipmentOptions } = await supabase
        .from('install_equipment_options')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order');

      const { data: ductSegments } = await supabase
        .from('install_duct_segments')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order');

      const { data: materials } = await supabase
        .from('install_materials')
        .select('*')
        .eq('project_id', project_id)
        .order('sort_order');

      const recommended = (equipmentOptions as InstallEquipmentOption[] || []).find(o => o.is_recommended)
        || (equipmentOptions as InstallEquipmentOption[] || [])[0];

      const typesToGenerate: DocType[] = doc_type ? [doc_type] : ['scope_of_work', 'install_checklist', 'parts_list'];
      const results = [];

      for (const type of typesToGenerate) {
        const content = generateDocContent(
          type,
          project,
          (rooms || []) as InstallRoom[],
          recommended || null,
          (ductSegments || []) as InstallDuctSegment[],
          (materials || []) as InstallMaterial[],
        );

        // Delete existing doc of same type for this project
        await supabase
          .from('install_documents')
          .delete()
          .eq('project_id', project_id)
          .eq('doc_type', type);

        const { data: saved, error: insertErr } = await supabase
          .from('install_documents')
          .insert({
            project_id,
            doc_type: type,
            title: content.title,
            content: content.body,
            status: 'draft',
            created_by: user.id,
          } as Record<string, unknown>)
          .select()
          .single();

        if (insertErr) throw insertErr;
        results.push(saved);
      }

      return NextResponse.json(results);
    }

    // Manual creation
    if (!body.doc_type || !body.title) {
      return NextResponse.json({ error: 'doc_type and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_documents')
      .insert({
        project_id,
        doc_type: body.doc_type,
        title: body.title,
        content: body.content ?? {},
        status: body.status ?? 'draft',
        created_by: user.id,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('install_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Documents PUT error:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('install_documents').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

// ---- Document Content Generators ----

interface ProjectData {
  project_name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  building_type: string;
  system_type: string;
  stories: number;
  total_sqft: number | null;
  customers?: { full_name: string; phone: string; address: string; email: string | null } | null;
}

function generateDocContent(
  docType: DocType,
  project: ProjectData,
  rooms: InstallRoom[],
  equipment: InstallEquipmentOption | null,
  ducts: InstallDuctSegment[],
  materials: InstallMaterial[],
): { title: string; body: Record<string, unknown> } {
  switch (docType) {
    case 'scope_of_work':
      return generateScopeOfWork(project, rooms, equipment, ducts);
    case 'install_checklist':
      return generateInstallChecklist(project, equipment);
    case 'parts_list':
      return generatePartsList(materials, equipment);
    default:
      return { title: 'Document', body: {} };
  }
}

function generateScopeOfWork(
  project: ProjectData,
  rooms: InstallRoom[],
  equipment: InstallEquipmentOption | null,
  ducts: InstallDuctSegment[],
): { title: string; body: Record<string, unknown> } {
  const customerName = project.customers?.full_name ?? 'Customer';
  const fullAddress = [project.address, project.city, project.state, project.zip].filter(Boolean).join(', ');

  const equipmentList: string[] = [];
  if (equipment?.condenser_model) equipmentList.push(`Condenser: ${equipment.condenser_model}`);
  if (equipment?.air_handler_model) equipmentList.push(`Air Handler: ${equipment.air_handler_model}`);
  if (equipment?.furnace_model) equipmentList.push(`Furnace: ${equipment.furnace_model}`);
  if (equipment?.thermostat_model) equipmentList.push(`Thermostat: ${equipment.thermostat_model}`);

  const supplyBranches = ducts.filter(d => d.segment_type === 'supply_branch');
  const returnDrops = ducts.filter(d => d.segment_type === 'return_drop');

  const workItems = [
    'Remove and dispose of existing HVAC equipment',
    'Install new outdoor condenser unit on concrete pad',
    'Install new indoor air handler/furnace',
    'Connect refrigerant line set',
    'Install new thermostat and thermostat wire',
    'Connect electrical: disconnect, whip, and power wiring',
    'Install condensate drain line with safety float switch',
    `Install/modify ${supplyBranches.length} supply runs and ${returnDrops.length} return drops`,
    'Seal all duct connections with mastic and tape',
    'Perform vacuum, pressure test, and charge system',
    'Commission system: verify airflow, temperature split, and operation',
    'Clean work area and haul away old equipment',
  ];

  const exclusions = [
    'Structural modifications (framing, roofing, etc.)',
    'Electrical panel upgrades (if needed, quoted separately)',
    'Asbestos or mold remediation',
    'Permit fees (included separately in pricing)',
    'Drywall or painting repairs beyond immediate work area',
  ];

  return {
    title: `Scope of Work — ${project.project_name}`,
    body: {
      customerName,
      address: fullAddress,
      projectType: project.system_type,
      buildingType: project.building_type,
      stories: project.stories,
      totalSqft: project.total_sqft,
      roomCount: rooms.length,
      equipmentList,
      specs: {
        tonnage: equipment?.tonnage,
        seer: equipment?.seer,
        hspf: equipment?.hspf,
        warranty: equipment?.warranty_years,
      },
      workItems,
      exclusions,
      ductSummary: {
        supplyBranches: supplyBranches.length,
        returnDrops: returnDrops.length,
        totalDuctFt: ducts.reduce((s, d) => s + (d.length_ft || 0), 0),
      },
    },
  };
}

function generateInstallChecklist(
  project: ProjectData,
  equipment: InstallEquipmentOption | null,
): { title: string; body: Record<string, unknown> } {
  const sections = [
    {
      name: 'Pre-Install',
      items: [
        { task: 'Confirm customer is home or access is available', checked: false },
        { task: 'Verify all equipment and materials are on truck', checked: false },
        { task: 'Lay drop cloths and protect flooring', checked: false },
        { task: 'Turn off power at breaker', checked: false },
        { task: 'Recover refrigerant from old system', checked: false },
      ],
    },
    {
      name: 'Removal',
      items: [
        { task: 'Disconnect and remove old condenser', checked: false },
        { task: 'Disconnect and remove old air handler/furnace', checked: false },
        { task: 'Remove old thermostat and wire (if replacing)', checked: false },
        { task: 'Remove old disconnect (if replacing)', checked: false },
        { task: 'Cap or remove old line set', checked: false },
      ],
    },
    {
      name: 'Rough-In',
      items: [
        { task: 'Set concrete pad for condenser', checked: false },
        { task: 'Run new line set (if needed)', checked: false },
        { task: 'Run thermostat wire', checked: false },
        { task: 'Install new disconnect and whip', checked: false },
        { task: 'Modify ductwork as needed', checked: false },
        { task: 'Install drain line and safety pan', checked: false },
      ],
    },
    {
      name: 'Equipment Set',
      items: [
        { task: `Set condenser: ${equipment?.condenser_model || 'TBD'}`, checked: false },
        { task: `Set air handler: ${equipment?.air_handler_model || 'TBD'}`, checked: false },
        { task: 'Level and secure all equipment', checked: false },
        { task: 'Connect line set to condenser and coil', checked: false },
        { task: 'Braze all refrigerant connections', checked: false },
        { task: 'Connect condensate drain', checked: false },
        { task: 'Connect electrical to condenser and air handler', checked: false },
        { task: 'Install thermostat', checked: false },
      ],
    },
    {
      name: 'Connections & Sealing',
      items: [
        { task: 'Connect supply plenum', checked: false },
        { task: 'Connect return plenum', checked: false },
        { task: 'Seal all duct connections with mastic', checked: false },
        { task: 'Tape and insulate exposed ductwork', checked: false },
        { task: 'Install filter', checked: false },
      ],
    },
    {
      name: 'Startup & Commissioning',
      items: [
        { task: 'Pull vacuum (500 microns or below)', checked: false },
        { task: 'Pressure test (hold for 15 min)', checked: false },
        { task: 'Release refrigerant charge', checked: false },
        { task: 'Check subcooling and superheat', checked: false },
        { task: 'Verify supply/return temperature split (16-22°F cooling)', checked: false },
        { task: 'Check amp draw on compressor and blower', checked: false },
        { task: 'Test all modes: cool, heat, fan, auto', checked: false },
        { task: 'Program thermostat with customer', checked: false },
      ],
    },
    {
      name: 'Cleanup & Handoff',
      items: [
        { task: 'Remove all debris and old equipment', checked: false },
        { task: 'Clean work area', checked: false },
        { task: 'Walk customer through new system operation', checked: false },
        { task: 'Review maintenance schedule and filter replacement', checked: false },
        { task: 'Leave warranty documentation', checked: false },
        { task: 'Collect customer signature on completion form', checked: false },
      ],
    },
  ];

  return {
    title: `Install Checklist — ${project.project_name}`,
    body: {
      address: project.address,
      sections,
    },
  };
}

function generatePartsList(
  materials: InstallMaterial[],
  equipment: InstallEquipmentOption | null,
): { title: string; body: Record<string, unknown> } {
  const grouped: Record<string, { name: string; quantity: number; unit: string }[]> = {};

  for (const m of materials) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
    });
  }

  return {
    title: 'Parts List',
    body: {
      equipmentTier: equipment?.tier ?? 'N/A',
      equipmentTonnage: equipment?.tonnage,
      categories: grouped,
      totalItems: materials.length,
    },
  };
}
