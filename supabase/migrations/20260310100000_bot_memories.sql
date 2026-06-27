-- Bot memories table: persistent memory for each AI bot
CREATE TABLE IF NOT EXISTS bot_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  bot text NOT NULL, -- manager, marketing, security, finance, tech
  content text NOT NULL, -- the memory content
  category text NOT NULL DEFAULT 'general', -- general, preference, decision, insight, process
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bot_memories_group_bot ON bot_memories(group_id, bot);
CREATE INDEX idx_bot_memories_category ON bot_memories(category);

-- RLS
ALTER TABLE bot_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their group bot memories"
  ON bot_memories FOR SELECT
  USING (group_id = get_user_group_id());

CREATE POLICY "Users can insert bot memories"
  ON bot_memories FOR INSERT
  WITH CHECK (group_id = get_user_group_id());

CREATE POLICY "Users can update their group bot memories"
  ON bot_memories FOR UPDATE
  USING (group_id = get_user_group_id());

CREATE POLICY "Users can delete their group bot memories"
  ON bot_memories FOR DELETE
  USING (group_id = get_user_group_id());

-- Updated at trigger
CREATE TRIGGER set_bot_memories_updated_at
  BEFORE UPDATE ON bot_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
