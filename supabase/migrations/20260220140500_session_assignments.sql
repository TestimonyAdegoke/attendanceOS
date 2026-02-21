-- Session attendee assignment

CREATE TABLE IF NOT EXISTS session_people (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_session_people_session_id ON session_people(session_id);
CREATE INDEX IF NOT EXISTS idx_session_people_person_id ON session_people(person_id);

CREATE TABLE IF NOT EXISTS session_groups (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_session_groups_session_id ON session_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_session_groups_group_id ON session_groups(group_id);
