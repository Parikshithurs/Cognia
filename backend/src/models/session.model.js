const { queryAll, queryOne, execute } = require('../db');

function startSession(uid, { task_id = null, duration_minutes = 25, type = 'focus' } = {}) {
    // Abandon any existing active sessions
    execute(`UPDATE sessions SET status = 'abandoned', ended_at = datetime('now') WHERE uid = ? AND status = 'active'`, [uid]);

    const { lastInsertRowid } = execute(`
    INSERT INTO sessions (uid, task_id, duration_minutes, type, status)
    VALUES (?, ?, ?, ?, 'active')
  `, [uid, task_id, duration_minutes, type]);

    return getSessionById(lastInsertRowid);
}

function getSessionById(id) {
    return queryOne('SELECT * FROM sessions WHERE id = ?', [id]);
}

function getActiveSession(uid) {
    return queryOne("SELECT * FROM sessions WHERE uid = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1", [uid]);
}

function getSessionsByUser(uid, limit = 50) {
    return queryAll(`
    SELECT s.*, t.title as task_title
    FROM sessions s
    LEFT JOIN tasks t ON s.task_id = t.id
    WHERE s.uid = ?
    ORDER BY s.started_at DESC
    LIMIT ?
  `, [uid, limit]);
}

function endSession(id, uid, { focus_score = 0, distraction_count = 0 } = {}) {
    execute(`
    UPDATE sessions
    SET status = 'completed', ended_at = datetime('now'), focus_score = ?, distraction_count = ?
    WHERE id = ? AND uid = ? AND status IN ('active', 'paused')
  `, [focus_score, distraction_count, id, uid]);
    return getSessionById(id);
}

function pauseSession(id, uid) {
    execute("UPDATE sessions SET status = 'paused' WHERE id = ? AND uid = ?", [id, uid]);
    return getSessionById(id);
}

function resumeSession(id, uid) {
    execute("UPDATE sessions SET status = 'active' WHERE id = ? AND uid = ?", [id, uid]);
    return getSessionById(id);
}

module.exports = {
    startSession, getSessionById, getActiveSession,
    getSessionsByUser, endSession, pauseSession, resumeSession
};
