-- Add manager role to profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'manager', 'tech'));

-- Document groups table
CREATE TABLE public.document_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id TEXT UNIQUE NOT NULL, -- shareable group code
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.document_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_document_groups_group_id ON public.document_groups(group_id);
CREATE INDEX idx_documents_group_id ON public.documents(group_id);

-- Enable RLS
ALTER TABLE public.document_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document groups policies (anyone with the group_id can access)
CREATE POLICY "Approved users can view document groups"
  ON public.document_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Approved users can create document groups"
  ON public.document_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Admins and managers can delete document groups"
  ON public.document_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager') AND status = 'approved'));

-- Documents policies
CREATE POLICY "Approved users can view documents"
  ON public.documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Approved users can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

CREATE POLICY "Users can delete own documents or admins/managers can delete any"
  ON public.documents FOR DELETE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager') AND status = 'approved')
  );

-- Update inventory policy for managers
DROP POLICY IF EXISTS "Approved users can view inventory" ON public.inventory_items;
CREATE POLICY "Approved users can view inventory"
  ON public.inventory_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved'));

-- Managers can view all inventory (like admins)
DROP POLICY IF EXISTS "Managers can view all inventory" ON public.inventory_items;
CREATE POLICY "Managers can view all inventory"
  ON public.inventory_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager') AND status = 'approved'));
