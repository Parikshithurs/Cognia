const { queryAll, queryOne, execute } = require('../db');

function getTasksByUser(uid) {
    return queryAll(`
    SELECT * FROM tasks WHERE uid = ? ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC
  `, [uid]);
}

function getTaskById(id, uid) {
    return queryOne('SELECT * FROM tasks WHERE id = ? AND uid = ?', [id, uid]);
}

function createTask(uid, { title, description = '', priority = 'medium', estimated_minutes = 25 }) {
    const { lastInsertRowid } = execute(`
    INSERT INTO tasks (uid, title, description, priority, estimated_minutes)
    VALUES (?, ?, ?, ?, ?)
  `, [uid, title, description, priority, estimated_minutes]);
    return getTaskById(lastInsertRowid, uid);
}

function updateTask(id, uid, fields) {
    const allowed = ['title', 'description', 'priority', 'status', 'estimated_minutes'];
    const toUpdate = Object.keys(fields).filter(k => allowed.includes(k));
    if (!toUpdate.length) return getTaskById(id, uid);

    const sets = toUpdate.map(k => `${k} = ?`).join(', ');
    const values = toUpdate.map(k => fields[k]);
    execute(`UPDATE tasks SET ${sets}, updated_at = datetime('now') WHERE id = ? AND uid = ?`, [...values, id, uid]);
    return getTaskById(id, uid);
}

function deleteTask(id, uid) {
    const { changes } = execute('DELETE FROM tasks WHERE id = ? AND uid = ?', [id, uid]);
    return changes > 0;
}

module.exports = { getTasksByUser, getTaskById, createTask, updateTask, deleteTask };
