-- ============================================================
-- RSVP & Food Sign-up Feature Migration
-- Apply via: Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- ── 1. Add RSVP columns to events table ──────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS rsvp_enabled          boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_mode             text      NOT NULL DEFAULT 'rsvp_only',
  -- rsvp_mode: 'rsvp_only' | 'food_only' | 'rsvp_and_food'
  ADD COLUMN IF NOT EXISTS rsvp_deadline         timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_attendance_limit integer,
  ADD COLUMN IF NOT EXISTS rsvp_collect_email    boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_collect_phone    boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rsvp_headcount_mode   text      NOT NULL DEFAULT 'headcount',
  -- headcount_mode: 'headcount' | 'names' | 'both'
  ADD COLUMN IF NOT EXISTS rsvp_allow_maybe      boolean   NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rsvp_event_date       timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_end_time         timestamptz,
  ADD COLUMN IF NOT EXISTS rsvp_timezone         text      NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS rsvp_location         text,
  ADD COLUMN IF NOT EXISTS rsvp_description      text,
  ADD COLUMN IF NOT EXISTS rsvp_host_display_name text,
  ADD COLUMN IF NOT EXISTS food_enabled          boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_heading          text      NOT NULL DEFAULT 'Food Sign-up',
  ADD COLUMN IF NOT EXISTS food_allow_suggestions boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS food_show_contributors boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rsvp_status           text      NOT NULL DEFAULT 'draft';
  -- rsvp_status: 'draft' | 'published' | 'closed'

-- ── 2. RSVP responses ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_name      text        NOT NULL,
  response        text        NOT NULL CHECK (response IN ('going','maybe','not_going')),
  party_size      integer     NOT NULL DEFAULT 1 CHECK (party_size >= 1 AND party_size <= 20),
  guest_names     text,       -- additional guest names (newline-separated)
  note            text,
  edit_token      text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Contact details in a separate table (never publicly readable)
CREATE TABLE IF NOT EXISTS rsvp_contacts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     uuid        NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
  email           text,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Food items (host-defined) ─────────────────────────────
CREATE TABLE IF NOT EXISTS food_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  category        text,
  notes           text,
  spots_total     integer,    -- null = unlimited
  unit            text        NOT NULL DEFAULT 'serving',
  sort_order      integer     NOT NULL DEFAULT 0,
  is_suggestion   boolean     NOT NULL DEFAULT false,  -- guest-suggested item
  suggested_by    text,       -- guest name if is_suggestion
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Food claims (guest sign-ups) ──────────────────────────
CREATE TABLE IF NOT EXISTS food_claims (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id    uuid        NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_name      text        NOT NULL,
  quantity        integer     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  description     text,       -- "my famous mac & cheese"
  note            text,
  edit_token      text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS rsvp_responses_event_id_idx ON rsvp_responses(event_id);
CREATE INDEX IF NOT EXISTS rsvp_responses_edit_token_idx ON rsvp_responses(edit_token);
CREATE INDEX IF NOT EXISTS food_items_event_id_idx ON food_items(event_id);
CREATE INDEX IF NOT EXISTS food_claims_food_item_id_idx ON food_claims(food_item_id);
CREATE INDEX IF NOT EXISTS food_claims_event_id_idx ON food_claims(event_id);
CREATE INDEX IF NOT EXISTS food_claims_edit_token_idx ON food_claims(edit_token);

-- ── 6. Updated-at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rsvp_responses_updated_at ON rsvp_responses;
CREATE TRIGGER rsvp_responses_updated_at
  BEFORE UPDATE ON rsvp_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS food_claims_updated_at ON food_claims;
CREATE TRIGGER food_claims_updated_at
  BEFORE UPDATE ON food_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Row-Level Security ─────────────────────────────────────

-- rsvp_responses: hosts see their own events; guests insert/update via edit_token
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "host_select_rsvp" ON rsvp_responses
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE host_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "host_update_rsvp" ON rsvp_responses
  FOR UPDATE USING (
    event_id IN (SELECT id FROM events WHERE host_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "host_delete_rsvp" ON rsvp_responses
  FOR DELETE USING (
    event_id IN (SELECT id FROM events WHERE host_id = auth.uid())
  );

-- Guests can insert when event is published and not closed/past deadline
CREATE POLICY IF NOT EXISTS "guest_insert_rsvp" ON rsvp_responses
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events
      WHERE rsvp_enabled = true
        AND rsvp_status = 'published'
        AND (rsvp_deadline IS NULL OR rsvp_deadline > now())
        AND (rsvp_attendance_limit IS NULL OR (
          SELECT COALESCE(SUM(party_size),0) FROM rsvp_responses r2
          WHERE r2.event_id = rsvp_responses.event_id AND r2.response = 'going'
        ) < rsvp_attendance_limit)
    )
  );

-- Guests can read non-contact fields (for edit page)
CREATE POLICY IF NOT EXISTS "guest_select_own_rsvp" ON rsvp_responses
  FOR SELECT USING (true);  -- filtered by edit_token in app queries

-- rsvp_contacts: only host can read; guest inserts with their own response
ALTER TABLE rsvp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "host_select_contacts" ON rsvp_contacts
  FOR SELECT USING (
    response_id IN (
      SELECT r.id FROM rsvp_responses r
      JOIN events e ON e.id = r.event_id
      WHERE e.host_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "guest_insert_contacts" ON rsvp_contacts
  FOR INSERT WITH CHECK (true);

-- food_items: hosts manage; guests read published events
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "host_all_food_items" ON food_items
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE host_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "guest_read_food_items" ON food_items
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE rsvp_enabled = true AND rsvp_status = 'published')
  );

CREATE POLICY IF NOT EXISTS "guest_insert_suggestion" ON food_items
  FOR INSERT WITH CHECK (
    is_suggestion = true AND
    event_id IN (
      SELECT id FROM events
      WHERE food_enabled = true AND rsvp_status = 'published' AND food_allow_suggestions = true
    )
  );

-- food_claims: hosts see all; guests insert/update via edit_token
ALTER TABLE food_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "host_all_food_claims" ON food_claims
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE host_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "guest_insert_claim" ON food_claims
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE food_enabled = true AND rsvp_status = 'published'
    )
  );

CREATE POLICY IF NOT EXISTS "guest_read_claims" ON food_claims
  FOR SELECT USING (true);

-- ── 8. Helper: atomic food claim (prevents overbooking) ───────
CREATE OR REPLACE FUNCTION claim_food_item(
  p_food_item_id uuid,
  p_event_id     uuid,
  p_guest_name   text,
  p_quantity     integer,
  p_description  text,
  p_note         text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item       food_items%ROWTYPE;
  v_claimed    integer;
  v_claim_id   uuid;
  v_token      text;
BEGIN
  -- Lock the food item row
  SELECT * INTO v_item FROM food_items WHERE id = p_food_item_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Check capacity if limited
  IF v_item.spots_total IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_claimed
    FROM food_claims WHERE food_item_id = p_food_item_id;

    IF v_claimed + p_quantity > v_item.spots_total THEN
      RETURN json_build_object('success', false, 'error', 'No spots remaining');
    END IF;
  END IF;

  -- Insert claim
  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO food_claims (food_item_id, event_id, guest_name, quantity, description, note, edit_token)
  VALUES (p_food_item_id, p_event_id, p_guest_name, p_quantity, p_description, p_note, v_token)
  RETURNING id INTO v_claim_id;

  RETURN json_build_object('success', true, 'claim_id', v_claim_id, 'edit_token', v_token);
END;
$$;
