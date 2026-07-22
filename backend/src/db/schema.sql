-- Cognia Database Schema
-- No users table — Firebase Auth manages users (uid is the foreign key)

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,                          -- Firebase user uid
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
  estimated_minutes INTEGER DEFAULT 25,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed','abandoned')),
  type TEXT DEFAULT 'focus' CHECK(type IN ('focus','break')),
  duration_minutes INTEGER DEFAULT 25,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  focus_score REAL DEFAULT 0,               -- 0-100, computed on end
  distraction_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS motion_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  face_detected INTEGER NOT NULL DEFAULT 1, -- 0 = absent, 1 = present
  face_x REAL,                              -- normalized 0-1 horizontal position
  face_y REAL,                              -- normalized 0-1 vertical position
  confidence REAL,                          -- detection confidence 0-1
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_uid ON tasks(uid);
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid);
CREATE INDEX IF NOT EXISTS idx_motion_session ON motion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_motion_uid_time ON motion_events(uid, timestamp);
