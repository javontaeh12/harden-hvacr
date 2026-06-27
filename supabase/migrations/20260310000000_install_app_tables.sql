-- HVAC Install App: Equipment catalog, load calcs, proposals, duct design, documents
-- Run this migration in Supabase SQL Editor

-- ============================================
-- TABLE 1: EQUIPMENT CATALOG (group-scoped)
-- ============================================

CREATE TABLE public.equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'condenser', 'air_handler', 'furnace', 'coil', 'heat_pump',
    'mini_split', 'package_unit', 'thermostat', 'line_set',
    'disconnect', 'whip', 'pad', 'filter_drier', 'refrigerant',
    'accessory', 'other'
  )),
  brand TEXT,
  model_number TEXT,
  description TEXT,
  tonnage NUMERIC(4,1),
  seer_rating NUMERIC(4,1),
  hspf NUMERIC(4,1),
  btu_cooling INTEGER,
  btu_heating INTEGER,
  voltage TEXT,
  phase TEXT DEFAULT 'single',
  refrigerant_type TEXT,
  dimensions JSONB DEFAULT '{}',
  weight_lbs NUMERIC(8,1),
  wholesale_cost NUMERIC(10,2),
  retail_price NUMERIC(10,2),
  tier TEXT CHECK (tier IN ('good', 'better', 'best')),
  is_active BOOLEAN DEFAULT true,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 2: INSTALL PRICE BOOK (group-scoped)
-- ============================================

CREATE TABLE public.install_price_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'labor', 'permit', 'material_markup', 'accessory',
    'disposal', 'crane', 'misc', 'financing_fee'
  )),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'each',
  unit_cost NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 3: INSTALL PROJECTS (group-scoped)
-- ============================================

CREATE TABLE public.install_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  project_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'survey', 'designing', 'proposal_sent',
    'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled'
  )),
  project_type TEXT NOT NULL DEFAULT 'replacement' CHECK (project_type IN (
    'replacement', 'new_construction', 'add_on', 'conversion'
  )),
  system_type TEXT NOT NULL DEFAULT 'split' CHECK (system_type IN (
    'split', 'package', 'mini_split', 'dual_fuel', 'heat_pump', 'furnace_only'
  )),
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  building_type TEXT NOT NULL DEFAULT 'single_family' CHECK (building_type IN (
    'single_family', 'townhome', 'duplex', 'condo',
    'mobile_home', 'apartment', 'small_commercial'
  )),
  stories INTEGER DEFAULT 1,
  year_built INTEGER,
  total_sqft INTEGER,
  conditioned_sqft INTEGER,
  design_cooling_temp NUMERIC(5,1),
  design_heating_temp NUMERIC(5,1),
  indoor_cooling_temp NUMERIC(5,1) DEFAULT 75,
  indoor_heating_temp NUMERIC(5,1) DEFAULT 70,
  elevation_ft INTEGER,
  humidity_zone TEXT CHECK (humidity_zone IN ('dry', 'moderate', 'humid', 'very_humid')),
  climate_zone TEXT,
  existing_equipment JSONB DEFAULT '{}',
  current_mode TEXT NOT NULL DEFAULT 'sales' CHECK (current_mode IN ('sales', 'design', 'production')),
  notes TEXT,
  group_id UUID NOT NULL REFERENCES public.organization_groups(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 4: INSTALL ROOMS
-- ============================================

CREATE TABLE public.install_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_level INTEGER DEFAULT 1,
  length_ft NUMERIC(6,1),
  width_ft NUMERIC(6,1),
  ceiling_height_ft NUMERIC(4,1) DEFAULT 8,
  sqft NUMERIC(8,1),
  orientation TEXT CHECK (orientation IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW')),
  ceiling_r_value NUMERIC(5,1) DEFAULT 30,
  floor_type TEXT NOT NULL DEFAULT 'slab' CHECK (floor_type IN (
    'slab', 'crawlspace', 'basement', 'over_garage', 'second_floor'
  )),
  floor_r_value NUMERIC(5,1) DEFAULT 0,
  occupants INTEGER DEFAULT 2,
  has_kitchen BOOLEAN DEFAULT false,
  has_fireplace BOOLEAN DEFAULT false,
  appliance_btuh INTEGER DEFAULT 0,
  cooling_btuh NUMERIC(10,1),
  heating_btuh NUMERIC(10,1),
  cooling_cfm NUMERIC(8,1),
  heating_cfm NUMERIC(8,1),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 5: INSTALL SURFACES
-- ============================================

CREATE TABLE public.install_surfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.install_rooms(id) ON DELETE CASCADE,
  surface_type TEXT NOT NULL CHECK (surface_type IN ('wall', 'ceiling', 'floor')),
  orientation TEXT,
  gross_area_sqft NUMERIC(8,1),
  net_area_sqft NUMERIC(8,1),
  r_value NUMERIC(5,1),
  construction TEXT,
  is_exterior BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 6: INSTALL OPENINGS
-- ============================================

CREATE TABLE public.install_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.install_rooms(id) ON DELETE CASCADE,
  surface_id UUID REFERENCES public.install_surfaces(id) ON DELETE SET NULL,
  opening_type TEXT NOT NULL CHECK (opening_type IN ('window', 'door', 'skylight')),
  quantity INTEGER DEFAULT 1,
  width_in NUMERIC(6,1),
  height_in NUMERIC(6,1),
  area_sqft NUMERIC(6,1),
  u_factor NUMERIC(5,3) DEFAULT 0.35,
  shgc NUMERIC(4,2) DEFAULT 0.25,
  orientation TEXT,
  has_overhang BOOLEAN DEFAULT false,
  frame_type TEXT NOT NULL DEFAULT 'vinyl' CHECK (frame_type IN (
    'vinyl', 'wood', 'aluminum', 'fiberglass', 'steel'
  )),
  glass_type TEXT NOT NULL DEFAULT 'double_low_e' CHECK (glass_type IN (
    'single', 'double', 'double_low_e', 'triple', 'triple_low_e'
  )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 7: INSTALL LOADS
-- ============================================

CREATE TABLE public.install_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.install_rooms(id) ON DELETE CASCADE,
  load_type TEXT NOT NULL CHECK (load_type IN ('room', 'total')),
  -- Cooling loads
  sensible_wall NUMERIC(10,1) DEFAULT 0,
  sensible_ceiling NUMERIC(10,1) DEFAULT 0,
  sensible_floor NUMERIC(10,1) DEFAULT 0,
  sensible_window_conduction NUMERIC(10,1) DEFAULT 0,
  sensible_window_solar NUMERIC(10,1) DEFAULT 0,
  sensible_door NUMERIC(10,1) DEFAULT 0,
  sensible_infiltration NUMERIC(10,1) DEFAULT 0,
  sensible_internal NUMERIC(10,1) DEFAULT 0,
  sensible_duct NUMERIC(10,1) DEFAULT 0,
  total_sensible_cooling NUMERIC(10,1) DEFAULT 0,
  total_latent_cooling NUMERIC(10,1) DEFAULT 0,
  total_cooling NUMERIC(10,1) DEFAULT 0,
  -- Heating loads
  heating_wall NUMERIC(10,1) DEFAULT 0,
  heating_ceiling NUMERIC(10,1) DEFAULT 0,
  heating_floor NUMERIC(10,1) DEFAULT 0,
  heating_window NUMERIC(10,1) DEFAULT 0,
  heating_door NUMERIC(10,1) DEFAULT 0,
  heating_infiltration NUMERIC(10,1) DEFAULT 0,
  heating_duct NUMERIC(10,1) DEFAULT 0,
  total_heating NUMERIC(10,1) DEFAULT 0,
  -- Airflow & sizing
  cooling_cfm NUMERIC(8,1),
  heating_cfm NUMERIC(8,1),
  tonnage_required NUMERIC(4,1),
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 8: INSTALL EQUIPMENT OPTIONS
-- ============================================

CREATE TABLE public.install_equipment_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  tier TEXT CHECK (tier IN ('good', 'better', 'best')),
  label TEXT,
  -- Equipment references
  condenser_id UUID REFERENCES public.equipment_catalog(id),
  air_handler_id UUID REFERENCES public.equipment_catalog(id),
  furnace_id UUID REFERENCES public.equipment_catalog(id),
  coil_id UUID REFERENCES public.equipment_catalog(id),
  thermostat_id UUID REFERENCES public.equipment_catalog(id),
  -- Denormalized model/price for proposal snapshots
  condenser_model TEXT,
  condenser_price NUMERIC(10,2),
  air_handler_model TEXT,
  air_handler_price NUMERIC(10,2),
  furnace_model TEXT,
  furnace_price NUMERIC(10,2),
  coil_model TEXT,
  coil_price NUMERIC(10,2),
  thermostat_model TEXT,
  thermostat_price NUMERIC(10,2),
  accessories JSONB DEFAULT '[]',
  -- Totals
  equipment_total NUMERIC(10,2) DEFAULT 0,
  labor_total NUMERIC(10,2) DEFAULT 0,
  material_total NUMERIC(10,2) DEFAULT 0,
  permit_fee NUMERIC(10,2) DEFAULT 0,
  disposal_fee NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  -- Specs
  tonnage NUMERIC(4,1),
  seer NUMERIC(4,1),
  hspf NUMERIC(4,1),
  warranty_years INTEGER,
  estimated_annual_savings NUMERIC(8,2),
  is_recommended BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 9: INSTALL DUCT SEGMENTS
-- ============================================

CREATE TABLE public.install_duct_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.install_rooms(id) ON DELETE SET NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN (
    'supply_trunk', 'supply_branch', 'return_trunk', 'return_drop'
  )),
  shape TEXT NOT NULL DEFAULT 'round' CHECK (shape IN ('round', 'rectangular', 'flex')),
  diameter_in NUMERIC(5,1),
  width_in NUMERIC(5,1),
  height_in NUMERIC(5,1),
  length_ft NUMERIC(6,1),
  cfm NUMERIC(8,1),
  friction_rate NUMERIC(6,3),
  velocity_fpm NUMERIC(8,1),
  insulation_r NUMERIC(4,1) DEFAULT 6,
  material TEXT NOT NULL DEFAULT 'galvanized' CHECK (material IN (
    'galvanized', 'flex', 'ductboard', 'fiberglass_lined'
  )),
  register_type TEXT,
  register_size TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 10: INSTALL MATERIALS
-- ============================================

CREATE TABLE public.install_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'equipment', 'ductwork', 'electrical', 'refrigerant',
    'fittings', 'supports', 'insulation', 'misc', 'disposal'
  )),
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(8,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  unit_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  source TEXT,
  equipment_option_tier TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 11: INSTALL PROPOSALS
-- ============================================

CREATE TABLE public.install_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'
  )),
  selected_tier TEXT,
  cover_title TEXT DEFAULT 'HVAC System Proposal',
  cover_subtitle TEXT,
  intro_message TEXT,
  closing_message TEXT,
  company_terms TEXT,
  show_financing BOOLEAN DEFAULT false,
  financing_provider TEXT,
  financing_term_months INTEGER,
  financing_apr NUMERIC(5,2),
  financing_monthly NUMERIC(10,2),
  valid_until DATE,
  share_token TEXT,
  accepted_at TIMESTAMPTZ,
  customer_signature_url TEXT,
  customer_name_signed TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TABLE 12: INSTALL DOCUMENTS
-- ============================================

CREATE TABLE public.install_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.install_projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'scope_of_work', 'install_checklist', 'parts_list',
    'equipment_spec', 'permit_application', 'inspection_report'
  )),
  title TEXT,
  content JSONB DEFAULT '{}',
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'signed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- equipment_catalog
CREATE INDEX idx_equipment_catalog_group ON public.equipment_catalog(group_id);
CREATE INDEX idx_equipment_catalog_category ON public.equipment_catalog(category);
CREATE INDEX idx_equipment_catalog_tier ON public.equipment_catalog(tier);
CREATE INDEX idx_equipment_catalog_brand ON public.equipment_catalog(brand);
CREATE INDEX idx_equipment_catalog_active ON public.equipment_catalog(is_active);

-- install_price_book
CREATE INDEX idx_install_price_book_group ON public.install_price_book(group_id);
CREATE INDEX idx_install_price_book_category ON public.install_price_book(category);
CREATE INDEX idx_install_price_book_active ON public.install_price_book(is_active);

-- install_projects
CREATE INDEX idx_install_projects_group ON public.install_projects(group_id);
CREATE INDEX idx_install_projects_customer ON public.install_projects(customer_id);
CREATE INDEX idx_install_projects_created_by ON public.install_projects(created_by);
CREATE INDEX idx_install_projects_assigned_to ON public.install_projects(assigned_to);
CREATE INDEX idx_install_projects_status ON public.install_projects(status);

-- install_rooms
CREATE INDEX idx_install_rooms_project ON public.install_rooms(project_id);

-- install_surfaces
CREATE INDEX idx_install_surfaces_room ON public.install_surfaces(room_id);

-- install_openings
CREATE INDEX idx_install_openings_room ON public.install_openings(room_id);
CREATE INDEX idx_install_openings_surface ON public.install_openings(surface_id);

-- install_loads
CREATE INDEX idx_install_loads_project ON public.install_loads(project_id);
CREATE INDEX idx_install_loads_room ON public.install_loads(room_id);
CREATE INDEX idx_install_loads_type ON public.install_loads(load_type);

-- install_equipment_options
CREATE INDEX idx_install_equipment_options_project ON public.install_equipment_options(project_id);
CREATE INDEX idx_install_equipment_options_tier ON public.install_equipment_options(tier);
CREATE INDEX idx_install_equipment_options_condenser ON public.install_equipment_options(condenser_id);
CREATE INDEX idx_install_equipment_options_air_handler ON public.install_equipment_options(air_handler_id);
CREATE INDEX idx_install_equipment_options_furnace ON public.install_equipment_options(furnace_id);
CREATE INDEX idx_install_equipment_options_coil ON public.install_equipment_options(coil_id);
CREATE INDEX idx_install_equipment_options_thermostat ON public.install_equipment_options(thermostat_id);

-- install_duct_segments
CREATE INDEX idx_install_duct_segments_project ON public.install_duct_segments(project_id);
CREATE INDEX idx_install_duct_segments_room ON public.install_duct_segments(room_id);

-- install_materials
CREATE INDEX idx_install_materials_project ON public.install_materials(project_id);
CREATE INDEX idx_install_materials_category ON public.install_materials(category);

-- install_proposals
CREATE INDEX idx_install_proposals_project ON public.install_proposals(project_id);
CREATE INDEX idx_install_proposals_status ON public.install_proposals(status);
CREATE INDEX idx_install_proposals_share_token ON public.install_proposals(share_token);

-- install_documents
CREATE INDEX idx_install_documents_project ON public.install_documents(project_id);
CREATE INDEX idx_install_documents_doc_type ON public.install_documents(doc_type);
CREATE INDEX idx_install_documents_created_by ON public.install_documents(created_by);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_price_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_surfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_equipment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_duct_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.install_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- ---- equipment_catalog (group-scoped) ----
CREATE POLICY "Members can view group equipment catalog"
  ON public.equipment_catalog
  FOR SELECT
  USING (group_id = public.get_user_group_id());

CREATE POLICY "Admins can manage group equipment catalog"
  ON public.equipment_catalog
  FOR ALL
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- ---- install_price_book (group-scoped) ----
CREATE POLICY "Members can view group install price book"
  ON public.install_price_book
  FOR SELECT
  USING (group_id = public.get_user_group_id());

CREATE POLICY "Admins can manage group install price book"
  ON public.install_price_book
  FOR ALL
  USING (public.is_admin() AND group_id = public.get_user_group_id());

-- ---- install_projects (group-scoped) ----
CREATE POLICY "Members can view group install projects"
  ON public.install_projects
  FOR SELECT
  USING (group_id = public.get_user_group_id());

CREATE POLICY "Members can manage group install projects"
  ON public.install_projects
  FOR ALL
  USING (public.is_approved() AND group_id = public.get_user_group_id());

-- ---- install_rooms (via project join) ----
CREATE POLICY "Members can view install rooms"
  ON public.install_rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install rooms"
  ON public.install_rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_surfaces (via room -> project join) ----
CREATE POLICY "Members can view install surfaces"
  ON public.install_surfaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_rooms r
      JOIN public.install_projects p ON p.id = r.project_id
      WHERE r.id = room_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install surfaces"
  ON public.install_surfaces
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_rooms r
      JOIN public.install_projects p ON p.id = r.project_id
      WHERE r.id = room_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_openings (via room -> project join) ----
CREATE POLICY "Members can view install openings"
  ON public.install_openings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_rooms r
      JOIN public.install_projects p ON p.id = r.project_id
      WHERE r.id = room_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install openings"
  ON public.install_openings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_rooms r
      JOIN public.install_projects p ON p.id = r.project_id
      WHERE r.id = room_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_loads (via project join) ----
CREATE POLICY "Members can view install loads"
  ON public.install_loads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install loads"
  ON public.install_loads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_equipment_options (via project join) ----
CREATE POLICY "Members can view install equipment options"
  ON public.install_equipment_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install equipment options"
  ON public.install_equipment_options
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_duct_segments (via project join) ----
CREATE POLICY "Members can view install duct segments"
  ON public.install_duct_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install duct segments"
  ON public.install_duct_segments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_materials (via project join) ----
CREATE POLICY "Members can view install materials"
  ON public.install_materials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install materials"
  ON public.install_materials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ---- install_proposals (via project join + public share_token access) ----
CREATE POLICY "Members can view install proposals"
  ON public.install_proposals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install proposals"
  ON public.install_proposals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- Public proposal view via share_token (no auth required)
CREATE POLICY "Anyone can view proposals by share token"
  ON public.install_proposals
  FOR SELECT
  USING (share_token IS NOT NULL AND share_token != '');

-- ---- install_documents (via project join) ----
CREATE POLICY "Members can view install documents"
  ON public.install_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

CREATE POLICY "Members can manage install documents"
  ON public.install_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.install_projects p
      WHERE p.id = project_id AND p.group_id = public.get_user_group_id()
    )
  );

-- ============================================
-- UPDATED_AT TRIGGERS
-- Uses existing update_updated_at_column() function
-- ============================================

CREATE TRIGGER update_equipment_catalog_updated_at
  BEFORE UPDATE ON public.equipment_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_install_projects_updated_at
  BEFORE UPDATE ON public.install_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_install_proposals_updated_at
  BEFORE UPDATE ON public.install_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_install_documents_updated_at
  BEFORE UPDATE ON public.install_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
