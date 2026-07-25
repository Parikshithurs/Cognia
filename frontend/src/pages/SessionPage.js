import api from '../modules/api/client.js';
import store from '../modules/store/store.js';
import { startSession, endSession, onTick, onComplete, formatTime } from '../modules/session/session.js';
import { startCamera, stopCamera } from '../modules/camera/camera.js';
import { showToast } from '../components/Toast.js';

export async function renderSessionPage() {
    const el = document.createElement('div');
    el.className = 'session-page';

    // Load tasks for selection
    let tasks = store.get('tasks') || [];
    if (!tasks.length) {
        try { tasks = await api.tasks.list(); store.set('tasks', tasks); } catch { }
    }
    const activeTasks = tasks.filter(t => t.status !== 'done');

    el.innerHTML = `
    <div class="session-layout">
      <!-- Left: Timer Panel -->
      <div class="timer-panel card">
        <div class="session-status-badge" id="phase-badge">
          <span class="status-dot"></span>
          <span id="phase-label">Ready to Focus</span>
        </div>

        <div class="timer-ring-container">
          <svg class="timer-ring" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle class="ring-bg" cx="100" cy="100" r="88" />
            <circle class="ring-progress" id="ring-progress" cx="100" cy="100" r="88"
              stroke-dasharray="553" stroke-dashoffset="553" />
          </svg>
          <div class="timer-display">
            <div id="timer-time" class="timer-time">25:00</div>
            <div id="timer-phase" class="timer-phase">Focus Session</div>
          </div>
        </div>

        <div class="task-select-row">
          <label class="form-label">Task (optional)</label>
          <select id="session-task" class="form-select">
            <option value="">— Free Focus —</option>
            ${activeTasks.map(t => `<option value="${t.id}">${t.title} (${t.estimated_minutes}m)</option>`).join('')}
          </select>
        </div>
        <div class="duration-row">
          <div class="form-group">
            <label class="form-label">Focus (min)</label>
            <input id="focus-min" type="number" class="form-input" min="5" max="90" value="25" />
          </div>
          <div class="form-group">
            <label class="form-label">Break (min)</label>
            <input id="break-min" type="number" class="form-input" min="1" max="30" value="5" />
          </div>
        </div>

        <div class="session-controls">
          <button id="start-btn" class="btn btn-primary btn-lg" style="flex:1">▶ Start Focus</button>
          <button id="end-btn" class="btn btn-danger btn-lg" style="flex:1;display:none">■ End Session</button>
        </div>
      </div>

      <!-- Right: Camera + Info -->
      <div class="camera-panel">
        <!-- Camera view -->
        <div class="camera-card card" id="camera-card">
          <div class="camera-header">
            <h3>📷 Focus Camera</h3>
            <div class="focus-indicator" id="focus-indicator">
              <span class="focus-dot" id="focus-dot"></span>
              <span id="focus-label">Inactive</span>
            </div>
          </div>
          <div class="camera-wrap">
            <video id="camera-video" autoplay muted playsinline></video>
            <canvas id="camera-canvas"></canvas>
            <div id="distraction-overlay" class="distraction-overlay" style="display:none">
              <div class="distraction-content">
                <div class="distraction-icon">👁️</div>
                <h3>Distraction Detected</h3>
                <p>Look back at your screen to continue!</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Stats -->
        <div class="live-stats card">
          <h3 class="live-title">Live Stats</h3>
          <div class="live-grid">
            <div class="live-stat">
              <div class="live-val" id="live-dist">0</div>
              <div class="live-key">Distractions</div>
            </div>
            <div class="live-stat">
              <div class="live-val" id="live-focus" style="color:var(--success)">100%</div>
              <div class="live-key">Focus Rate</div>
            </div>
            <div class="live-stat">
              <div class="live-val" id="live-elapsed">0:00</div>
              <div class="live-key">Elapsed</div>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="tips-card card">
          <h3 class="tips-title">💡 ADHD Tips</h3>
          <div id="tip-text" class="tip-text">${getRandomTip()}</div>
          <button class="btn btn-secondary btn-sm" id="next-tip" style="margin-top:var(--space-3)">Next Tip</button>
        </div>
      </div>
    </div>
  `;

    injectSessionStyles();
    setupSession(el);
    return el;
}

function setupSession(el) {
    let isRunning = false;
    let elapsedSeconds = 0;
    let totalSeconds = 25 * 60;
    let elapsedInterval = null;
    let distractionCount = 0;

    const startBtn = el.querySelector('#start-btn');
    const endBtn = el.querySelector('#end-btn');
    const ringEl = el.querySelector('#ring-progress');
    const timeEl = el.querySelector('#timer-time');
    const phaseEl = el.querySelector('#timer-phase');
    const phaseBadge = el.querySelector('#phase-label');
    const distOverlay = el.querySelector('#distraction-overlay');
    const videoEl = el.querySelector('#camera-video');
    const canvasEl = el.querySelector('#camera-canvas');
    const focusDot = el.querySelector('#focus-dot');
    const focusLabel = el.querySelector('#focus-label');

    const circumference = 553;

    function updateRing(secondsLeft, totalSecs) {
        const progress = 1 - (secondsLeft / totalSecs);
        const offset = circumference - progress * circumference;
        ringEl.style.strokeDashoffset = offset;
    }

    // On every timer tick
    onTick(({ secondsLeft, phase }) => {
        totalSeconds = phase === 'focus'
            ? Number(el.querySelector('#focus-min').value) * 60
            : Number(el.querySelector('#break-min').value) * 60;

        timeEl.textContent = formatTime(secondsLeft);
        phaseEl.textContent = phase === 'focus' ? 'Focus Session' : '☕ Break Time';
        phaseBadge.textContent = phase === 'focus' ? '🔴 Focusing' : '☕ Break';
        updateRing(secondsLeft, totalSeconds);
    });

    onComplete(({ phase }) => {
        if (phase === 'focus') {
            ringEl.style.stroke = 'var(--success)';
        } else {
            ringEl.style.stroke = 'var(--primary)';
        }
    });

    // Distraction store watch
    store.on('isDistracted', (distracted) => {
        distOverlay.style.display = distracted ? 'flex' : 'none';
        if (distracted) {
            el.querySelector('#camera-card').style.animation = 'distractionAlert 1s ease-in-out infinite';
        } else {
            el.querySelector('#camera-card').style.animation = '';
        }
    });

    store.on('distractionCount', (count) => {
        distractionCount = count || 0;
        el.querySelector('#live-dist').textContent = distractionCount;
        // Compute naive focus rate
        const focusRate = elapsedSeconds > 0
            ? Math.round(Math.max(0, 100 - (distractionCount / Math.max(1, Math.floor(elapsedSeconds / 30))) * 20))
            : 100;
        el.querySelector('#live-focus').textContent = focusRate + '%';
    });

    store.on('motionData', (data) => {
        if (!isRunning) return;
        const detected = data?.face_detected;
        focusDot.style.background = detected ? 'var(--success)' : 'var(--danger)';
        focusLabel.textContent = detected ? 'Focused' : 'Away';
    });

    startBtn.addEventListener('click', async () => {
        if (isRunning) return;
        startBtn.disabled = true;
        startBtn.textContent = '…';

        const taskId = el.querySelector('#session-task').value || null;
        const focusM = Number(el.querySelector('#focus-min').value) || 25;
        const breakM = Number(el.querySelector('#break-min').value) || 5;
        totalSeconds = focusM * 60;

        try {
            await startSession(taskId, { focusMinutes: focusM, breakMinutes: breakM });
            await startCamera(videoEl, canvasEl);

            isRunning = true;
            elapsedSeconds = 0;
            el.querySelector('#focus-indicator').style.opacity = '1';
            focusDot.style.background = 'var(--success)';
            focusLabel.textContent = 'Active';
            phaseBadge.textContent = '🔴 Focusing';

            startBtn.style.display = 'none';
            endBtn.style.display = 'flex';

            elapsedInterval = setInterval(() => {
                elapsedSeconds++;
                const m = Math.floor(elapsedSeconds / 60);
                const s = String(elapsedSeconds % 60).padStart(2, '0');
                el.querySelector('#live-elapsed').textContent = `${m}:${s}`;
            }, 1000);

            showToast('🎯 Session started! Stay focused.', 'success');
        } catch (err) {
            startBtn.disabled = false;
            startBtn.textContent = '▶ Start Focus';
        }
    });

    endBtn.addEventListener('click', async () => {
        endBtn.disabled = true;
        try {
            await endSession();
            stopCamera();
            clearInterval(elapsedInterval);
            isRunning = false;

            // Reset UI
            timeEl.textContent = '25:00';
            ringEl.style.strokeDashoffset = circumference;
            phaseBadge.textContent = 'Ready to Focus';
            phaseEl.textContent = 'Focus Session';
            focusDot.style.background = 'var(--text-muted)';
            focusLabel.textContent = 'Inactive';
            el.querySelector('#live-elapsed').textContent = '0:00';
            el.querySelector('#camera-card').style.animation = '';
            distOverlay.style.display = 'none';

            endBtn.style.display = 'none';
            startBtn.style.display = 'flex';
            startBtn.disabled = false;
            startBtn.textContent = '▶ Start Focus';
            endBtn.disabled = false;

            showToast('✅ Session complete! Great work!', 'success');
        } catch (err) {
            endBtn.disabled = false;
            showToast(err.message, 'error');
        }
    });

    el.querySelector('#next-tip').addEventListener('click', () => {
        el.querySelector('#tip-text').textContent = getRandomTip();
    });
}

const TIPS = [
    'Break large tasks into 5-minute micro-steps to reduce overwhelm.',
    'Use body-doubling: keep the camera on even if no one is watching.',
    'If distracted, say out loud what you were doing before the distraction.',
    'External timers (like this one!) reduce the burden on working memory.',
    'Reward yourself after each micro-session — even a 30-second stretch counts.',
    'Remove visual clutter from your workspace to reduce sensory overload.',
    'Write your current task on a sticky note and keep it visible.',
    'If you feel stuck, set a 2-minute timer and just start — momentum builds.',
    'Music without lyrics (lo-fi, classical) can improve focus for many.',
    'Stay hydrated! Dehydration significantly worsens ADHD symptoms.',
];
let tipIndex = 0;
function getRandomTip() { return TIPS[(tipIndex++) % TIPS.length]; }

function injectSessionStyles() {
    if (document.getElementById('session-styles')) return;
    const s = document.createElement('style');
    s.id = 'session-styles';
    s.textContent = `
    .session-page { padding: var(--space-6); }
    .session-layout { display: grid; grid-template-columns: 400px 1fr; gap: var(--space-6); }
    @media (max-width: 1024px) { .session-layout { grid-template-columns: 1fr; } }
    .timer-panel { display: flex; flex-direction: column; gap: var(--space-5); align-items: center; }
    .session-status-badge {
      display: flex; align-items: center; gap: var(--space-2);
      background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3);
      border-radius: var(--radius-full); padding: var(--space-2) var(--space-4);
      font-size: var(--text-sm); font-weight: 500;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--primary);
      animation: pulse 2s ease-in-out infinite;
    }
    .timer-ring-container { position: relative; width: 220px; height: 220px; }
    .timer-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 12; }
    .ring-progress {
      fill: none; stroke: var(--primary); stroke-width: 12;
      stroke-linecap: round; stroke-dasharray: 553; stroke-dashoffset: 553;
      transition: stroke-dashoffset 1s linear, stroke 0.5s ease;
      filter: drop-shadow(0 0 8px var(--primary-glow));
    }
    .timer-display {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .timer-time { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; }
    .timer-phase { font-size: var(--text-xs); color: var(--text-secondary); margin-top: var(--space-1); }
    .task-select-row, .duration-row { width: 100%; }
    .duration-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .session-controls { display: flex; gap: var(--space-3); width: 100%; }
    .camera-panel { display: flex; flex-direction: column; gap: var(--space-4); }
    .camera-card { padding: var(--space-4); }
    .camera-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
    .camera-header h3 { font-size: var(--text-base); font-weight: 600; }
    .focus-indicator { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); opacity: 0.5; }
    .focus-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); transition: background var(--transition-fast); }
    .camera-wrap { position: relative; border-radius: var(--radius-md); overflow: hidden; background: #000; aspect-ratio: 4/3; }
    #camera-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    #camera-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; transform: scaleX(-1); }
    .distraction-overlay {
      position: absolute; inset: 0; background: rgba(239,68,68,0.85);
      display: none; flex-direction: column; align-items: center; justify-content: center;
      animation: distractionAlert 1s ease-in-out infinite;
    }
    .distraction-content { text-align: center; color: white; }
    .distraction-icon { font-size: 2.5rem; margin-bottom: var(--space-3); }
    .distraction-content h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-2); }
    .live-stats { padding: var(--space-4); }
    .live-title { font-family: var(--font-display); font-size: var(--text-base); font-weight: 600; margin-bottom: var(--space-4); }
    .live-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
    .live-stat { text-align: center; }
    .live-val { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700; }
    .live-key { font-size: var(--text-xs); color: var(--text-secondary); margin-top: var(--space-1); }
    .tips-card { padding: var(--space-4); }
    .tips-title { font-size: var(--text-sm); font-weight: 600; margin-bottom: var(--space-3); }
    .tip-text { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.6; min-height: 48px; }
  `;
    document.head.appendChild(s);
}
