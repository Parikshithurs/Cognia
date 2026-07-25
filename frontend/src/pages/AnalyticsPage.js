import api from '../modules/api/client.js';

export async function renderAnalyticsPage() {
    const el = document.createElement('div');
    el.className = 'analytics-page animate-fade-up';

    el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">📊 Analytics</h1>
      <p class="page-subtitle">Your focus patterns and progress over time</p>
    </div>
    <div id="analytics-content">
      <div class="loading-row">
        ${[1, 2, 3, 4].map(() => `<div class="card stat-skeleton pulse" style="height:100px"></div>`).join('')}
      </div>
    </div>
  `;

    injectAnalyticsStyles();
    loadAnalytics(el);
    return el;
}

async function loadAnalytics(el) {
    try {
        const [summary, history] = await Promise.all([
            api.analytics.summary(),
            api.analytics.history(14),
        ]);

        el.querySelector('#analytics-content').innerHTML = `
      <!-- Summary Cards -->
      <div class="grid-4" style="margin-bottom:var(--space-8)">
        ${summaryCard('🔥', summary.streak_days ?? 0, 'Day Streak', 'var(--warning)')}
        ${summaryCard('🎯', `${Math.round(summary.avg_focus_score ?? 0)}%`, 'Avg Focus Score', 'var(--primary-light)')}
        ${summaryCard('⚡', summary.total_sessions ?? 0, 'Total Sessions', 'var(--accent)')}
        ${summaryCard('✅', `${summary.completed_tasks ?? 0}/${summary.total_tasks ?? 0}`, 'Tasks Done', 'var(--success)')}
      </div>

      <!-- Focus Chart -->
      <div class="grid-2" style="margin-bottom:var(--space-6)">
        <div class="card">
          <h3 class="chart-title">Focus Score — Last ${history.length} Sessions</h3>
          <div class="bar-chart" id="focus-chart">
            ${renderBarChart(history, 'focus_score', 100, 'var(--primary)')}
          </div>
        </div>
        <div class="card">
          <h3 class="chart-title">Session Duration (minutes)</h3>
          <div class="bar-chart" id="duration-chart">
            ${renderBarChart(history, 'actual_minutes', null, 'var(--accent)')}
          </div>
        </div>
      </div>

      <!-- Session History -->
      <div class="card">
        <h3 class="chart-title" style="margin-bottom:var(--space-4)">Session History</h3>
        ${history.length === 0
                ? `<div class="empty-state"><div class="empty-icon">📊</div><h3>No sessions yet</h3><p>Complete your first focus session to see data.</p></div>`
                : `<div class="history-table">
              <div class="history-header">
                <span>Date</span><span>Task</span><span>Duration</span><span>Focus</span><span>Distractions</span>
              </div>
              ${history.map(row => `
                <div class="history-row">
                  <span class="history-date">${formatDate(row.started_at)}</span>
                  <span class="history-task">${row.task_title ?? '— Free Focus —'}</span>
                  <span>${row.actual_minutes ?? row.duration_minutes ?? '—'} min</span>
                  <span>
                    <span class="score-pill" style="background:${scoreColor(row.focus_score)}20;color:${scoreColor(row.focus_score)}">
                      ${Math.round(row.focus_score ?? 0)}%
                    </span>
                  </span>
                  <span>${row.distraction_count ?? 0}</span>
                </div>
              `).join('')}
            </div>`
            }
      </div>
    `;
    } catch (err) {
        el.querySelector('#analytics-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load analytics</h3>
        <p>${err.message}</p>
      </div>
    `;
    }
}

function summaryCard(icon, value, label, color) {
    return `
    <div class="card" style="text-align:center;border-color:${color}20">
      <div style="font-size:1.75rem;margin-bottom:var(--space-2)">${icon}</div>
      <div style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:${color}">${value}</div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-1)">${label}</div>
    </div>
  `;
}

function renderBarChart(history, key, maxVal, color) {
    if (!history.length) return '<p style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-4)">No data yet</p>';
    const values = history.map(r => Number(r[key] ?? 0));
    const max = maxVal ?? (Math.max(...values) || 1);
    return `<div class="bars">
    ${values.map((v, i) => `
      <div class="bar-wrap" title="${key}: ${v}">
        <div class="bar" style="height:${Math.round((v / max) * 100)}%;background:${color};animation-delay:${i * 50}ms"></div>
        <div class="bar-label">${Math.round(v)}</div>
      </div>
    `).join('')}
  </div>`;
}

function formatDate(dt) {
    const d = new Date(dt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function scoreColor(score) {
    const s = Number(score ?? 0);
    if (s >= 75) return 'var(--success)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
}

function injectAnalyticsStyles() {
    if (document.getElementById('analytics-styles')) return;
    const s = document.createElement('style');
    s.id = 'analytics-styles';
    s.textContent = `
    .analytics-page { padding: var(--space-8); }
    .loading-row { display: grid; grid-template-columns: repeat(4,1fr); gap: var(--space-4); margin-bottom: var(--space-8); }
    .chart-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; margin-bottom: var(--space-4); }
    .bar-chart { height: 160px; display: flex; align-items: flex-end; }
    .bars { display: flex; gap: 4px; align-items: flex-end; height: 100%; width: 100%; }
    .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; min-height: 4px; border-radius: 3px 3px 0 0; transition: height 0.6s cubic-bezier(0.34,1.56,0.64,1); animation: fadeUp 0.5s both; }
    .bar:hover { filter: brightness(1.3); }
    .bar-label { font-size: 0.6rem; color: var(--text-muted); white-space: nowrap; }
    .history-table { display: flex; flex-direction: column; gap: 0; }
    .history-header, .history-row {
      display: grid; grid-template-columns: 100px 1fr 80px 80px 100px;
      padding: var(--space-3) var(--space-4); font-size: var(--text-sm);
      border-bottom: 1px solid var(--border);
    }
    .history-header { color: var(--text-muted); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .history-row { color: var(--text-secondary); transition: background var(--transition-fast); }
    .history-row:hover { background: var(--bg-card); }
    .history-row:last-child { border-bottom: none; }
    .history-date { color: var(--text-primary); font-weight: 500; }
    .history-task { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .score-pill { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600; }
  `;
    document.head.appendChild(s);
}
