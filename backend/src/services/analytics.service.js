const { queryAll, queryOne } = require('../db');
const { getSessionStats } = require('../models/motionEvent.model');
// Note: queryAll and queryOne are used by getUserSummary and getRecentSessions directly below

function computeFocusScore(session_id) {
  const stats = getSessionStats(session_id);
  if (!stats || !stats.total_frames) return 0;
  const presenceRatio = (stats.detected_frames || 0) / stats.total_frames;
  const confidence = stats.avg_confidence ?? 0.5;
  return Math.min(100, Math.max(0, Math.round(presenceRatio * confidence * 100)));
}

function getUserSummary(uid) {
  const totals = queryOne(`
    SELECT
      COUNT(*) as total_sessions,
      ROUND(AVG(focus_score), 1) as avg_focus_score,
      CAST(ROUND(SUM((julianday(COALESCE(ended_at, datetime('now'))) - julianday(started_at)) * 1440)) AS INTEGER) as total_minutes,
      SUM(distraction_count) as total_distractions
    FROM sessions WHERE uid = ? AND status = 'completed'
  `, [uid]);

  const taskStats = queryOne(`
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks
    FROM tasks WHERE uid = ?
  `, [uid]);

  const days = queryAll(`
    SELECT DISTINCT date(started_at) as day
    FROM sessions WHERE uid = ? AND status = 'completed'
    ORDER BY day DESC LIMIT 30
  `, [uid]).map(r => r.day);

  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (days[i] === expected) streak++;
    else break;
  }

  return {
    total_sessions: totals?.total_sessions ?? 0,
    avg_focus_score: totals?.avg_focus_score ?? 0,
    total_minutes: totals?.total_minutes ?? 0,
    total_distractions: totals?.total_distractions ?? 0,
    total_tasks: taskStats?.total_tasks ?? 0,
    completed_tasks: taskStats?.completed_tasks ?? 0,
    streak_days: streak,
  };
}

function getRecentSessions(uid, limit = 14) {
  return queryAll(`
    SELECT
      s.*,
      t.title as task_title,
      CAST(ROUND((julianday(COALESCE(s.ended_at, datetime('now'))) - julianday(s.started_at)) * 1440) AS INTEGER) as actual_minutes
    FROM sessions s
    LEFT JOIN tasks t ON s.task_id = t.id
    WHERE s.uid = ? AND s.status = 'completed'
    ORDER BY s.started_at DESC
    LIMIT ?
  `, [uid, limit]);
}

module.exports = { computeFocusScore, getUserSummary, getRecentSessions };
