import api from '../modules/api/client.js';
import store from '../modules/store/store.js';
import { showToast } from '../components/Toast.js';

export async function renderDashboardPage() {
    const el = document.createElement('div');
    el.className = 'dashboard-page animate-fade-up';

    el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Good ${getGreeting()} 👋</h1>
      <p class="page-subtitle">Your ADHD Focus Dashboard</p>
    </div>
    <div id="stats-row" class="grid-4" style="margin-bottom:var(--space-8)">
      ${[1, 2, 3, 4].map(() => `<div class="card stat-skeleton pulse"></div>`).join('')}
    </div>
    <div class="dashboard-main">
      <div class="tasks-panel">
        <div class="panel-header">
          <h2 class="panel-title">Tasks</h2>
          <button id="add-task-btn" class="btn btn-primary btn-sm">+ Add Task</button>
        </div>
        <div id="task-list" class="task-list">
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>Loading tasks…</h3>
          </div>
        </div>
      </div>
      <div class="quick-panel">
        <div class="card quick-session-card">
          <h3 class="quick-title">⚡ Quick Focus</h3>
          <p class="quick-desc">Start a 25-minute focus session right now</p>
          <a href="#/session" class="btn btn-primary" style="width:100%;margin-top:var(--space-4)">Start Session</a>
        </div>
        <div id="active-session-card"></div>
      </div>
    </div>
    <!-- Add Task Modal -->
    <div id="task-modal" class="modal-overlay" style="display:none">
      <div class="modal-box animate-scale-in">
        <div class="modal-header">
          <h3>New Task</h3>
          <button class="modal-close">×</button>
        </div>
        <form id="task-form" class="modal-form">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input id="task-title" class="form-input" placeholder="What needs to be done?" required />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="task-desc" class="form-input" rows="2" placeholder="Details…" style="resize:vertical"></textarea>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="task-priority" class="form-select">
                <option value="high">🔴 High</option>
                <option value="medium" selected>🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Est. Minutes</label>
              <input id="task-minutes" class="form-input" type="number" min="5" max="120" value="25" />
            </div>
          </div>
          <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-4)">
            <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  `;

    injectDashboardStyles();

    // Load data
    loadStats(el);
    loadTasks(el);
    checkActiveSession(el);

    // Modal handlers
    const modal = el.querySelector('#task-modal');
    el.querySelector('#add-task-btn').addEventListener('click', () => { modal.style.display = 'flex'; });
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    el.querySelector('#task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            await api.tasks.create({
                title: el.querySelector('#task-title').value,
                description: el.querySelector('#task-desc').value,
                priority: el.querySelector('#task-priority').value,
                estimated_minutes: Number(el.querySelector('#task-minutes').value),
            });
            closeModal(modal);
            showToast('Task created! 🎯', 'success');
            e.target.reset();
            loadTasks(el);
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
        }
    });

    return el;
}

function closeModal(modal) {
    modal.style.display = 'none';
}

async function loadStats(el) {
    try {
        const s = await api.analytics.summary();
        el.querySelector('#stats-row').innerHTML = `
      ${statCard('🔥', s.streak_days ?? 0, 'Day Streak')}
      ${statCard('⚡', s.total_sessions ?? 0, 'Sessions Done')}
      ${statCard('🎯', `${Math.round(s.avg_focus_score ?? 0)}%`, 'Avg Focus Score')}
      ${statCard('⏱', `${Math.round((s.total_minutes ?? 0) / 60 * 10) / 10}h`, 'Focus Time')}
    `;
    } catch {
        el.querySelector('#stats-row').innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Could not load stats</div>`;
    }
}

function statCard(icon, value, label) {
    return `
    <div class="card stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

async function loadTasks(el) {
    try {
        const tasks = await api.tasks.list();
        store.set('tasks', tasks);
        const listEl = el.querySelector('#task-list');
        if (!tasks.length) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><h3>No tasks yet</h3><p>Add your first task!</p></div>`;
            return;
        }
        listEl.innerHTML = tasks.map(t => taskCardHTML(t)).join('');

        // Status toggle
        listEl.querySelectorAll('.task-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                const next = btn.dataset.next;
                try {
                    await api.tasks.update(id, { status: next });
                    loadTasks(el);
                } catch (err) { showToast(err.message, 'error'); }
            });
        });

        // Delete
        listEl.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.id);
                if (!confirm('Delete this task?')) return;
                await api.tasks.delete(id);
                showToast('Task deleted', 'info');
                loadTasks(el);
            });
        });
    } catch (err) {
        el.querySelector('#task-list').innerHTML = `<div class="empty-state"><p>Failed to load tasks</p></div>`;
    }
}

function taskCardHTML(t) {
    const statusMap = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const statusLabel = { todo: '○ To Do', in_progress: '◉ In Progress', done: '✓ Done' };
    return `
    <div class="task-card task-card--${t.priority} ${t.status === 'done' ? 'task-done' : ''}">
      <div class="task-left">
        <button class="task-status-btn" data-id="${t.id}" data-next="${statusMap[t.status]}" title="Change status">${statusLabel[t.status]}</button>
        <div>
          <div class="task-title">${t.title}</div>
          ${t.description ? `<div class="task-desc">${t.description}</div>` : ''}
        </div>
      </div>
      <div class="task-right">
        <span class="badge badge-${t.priority}">${t.priority}</span>
        <span class="task-time">⏱ ${t.estimated_minutes}m</span>
        <button class="task-delete-btn btn-icon" data-id="${t.id}" title="Delete">🗑</button>
      </div>
    </div>
  `;
}

async function checkActiveSession(el) {
    try {
        const session = await api.sessions.active();
        if (session?.id) {
            store.set('currentSession', session);
            el.querySelector('#active-session-card').innerHTML = `
        <div class="card" style="border-color:var(--primary);background:rgba(99,102,241,0.08)">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
            <span class="animate-pulse">🔴</span>
            <strong>Active Session</strong>
          </div>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-4)">Session #${session.id} is running</p>
          <a href="#/session" class="btn btn-primary btn-sm">Rejoin Session</a>
        </div>
      `;
        }
    } catch { }
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
}

function injectDashboardStyles() {
    if (document.getElementById('dashboard-styles')) return;
    const s = document.createElement('style');
    s.id = 'dashboard-styles';
    s.textContent = `
    .dashboard-page { padding: var(--space-8); }
    .stat-skeleton { height: 120px; background: var(--bg-card); animation: pulse 1.5s ease-in-out infinite; }
    .stat-card { text-align: center; cursor: default; }
    .stat-icon { font-size: 1.75rem; margin-bottom: var(--space-2); }
    .stat-value { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }
    .stat-label { font-size: var(--text-xs); color: var(--text-secondary); margin-top: var(--space-1); }
    .dashboard-main { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-6); }
    @media (max-width: 1024px) { .dashboard-main { grid-template-columns: 1fr; } }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    .panel-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
    .task-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .task-card {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--glass-bg); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: var(--space-4);
      transition: all var(--transition-base);
      border-left: 4px solid transparent;
    }
    .task-card--high   { border-left-color: var(--priority-high); }
    .task-card--medium { border-left-color: var(--priority-medium); }
    .task-card--low    { border-left-color: var(--priority-low); }
    .task-card:hover { background: var(--bg-card-hover); transform: translateX(2px); }
    .task-done { opacity: 0.5; }
    .task-done .task-title { text-decoration: line-through; }
    .task-left { display: flex; align-items: center; gap: var(--space-3); flex: 1; min-width: 0; }
    .task-right { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
    .task-status-btn {
      font-size: var(--text-xs); color: var(--text-secondary); padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      white-space: nowrap; transition: all var(--transition-fast); cursor: pointer; background: none;
    }
    .task-status-btn:hover { border-color: var(--primary); color: var(--primary-light); }
    .task-title { font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-desc { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; }
    .task-time { font-size: var(--text-xs); color: var(--text-muted); }
    .task-delete-btn { background: none; font-size: 1rem; opacity: 0.4; transition: opacity var(--transition-fast); cursor: pointer; }
    .task-delete-btn:hover { opacity: 1; }
    .quick-panel { display: flex; flex-direction: column; gap: var(--space-4); }
    .quick-session-card { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(34,211,238,0.05)); border-color: rgba(99,102,241,0.3); }
    .quick-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-2); }
    .quick-desc { color: var(--text-secondary); font-size: var(--text-sm); }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000; padding: var(--space-4);
    }
    .modal-box {
      background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-xl);
      padding: var(--space-8); width: 100%; max-width: 480px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); }
    .modal-header h3 { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
    .modal-close { background: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; transition: color var(--transition-fast); }
    .modal-close:hover { color: var(--text-primary); }
    .modal-form { display: flex; flex-direction: column; gap: var(--space-4); }
  `;
    document.head.appendChild(s);
}
