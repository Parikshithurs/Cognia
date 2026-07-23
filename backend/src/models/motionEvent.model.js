const { queryAll, queryOne, execute } = require('../db');

function insertEvents(session_id, uid, events) {
  for (const e of events) {
    execute(`
      INSERT INTO motion_events (session_id, uid, face_detected, face_x, face_y, confidence, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      session_id, uid,
      e.face_detected ? 1 : 0,
      e.face_x ?? null,
      e.face_y ?? null,
      e.confidence ?? null,
      e.timestamp ?? new Date().toISOString()
    ]);
  }
  return events.length;
}

function getEventsBySession(session_id) {
  return queryAll('SELECT * FROM motion_events WHERE session_id = ? ORDER BY timestamp ASC', [session_id]);
}

function getSessionStats(session_id) {
  return queryOne(`
    SELECT
      COUNT(*) as total_frames,
      SUM(face_detected) as detected_frames,
      AVG(confidence) as avg_confidence
    FROM motion_events WHERE session_id = ?
  `, [session_id]);
}

module.exports = { insertEvents, getEventsBySession, getSessionStats };
