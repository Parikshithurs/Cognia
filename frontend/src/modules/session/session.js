import store from '../store/store.js';
import api from '../api/client.js';
import { connectWs, disconnectWs } from '../sync/wsClient.js';
import { showToast } from '../../components/Toast.js';

// Default micro-session config
const DEFAULT_CONFIG = {
    focusMinutes: 25,
    breakMinutes: 5,
};

let timerInterval = null;
let secondsLeft = 0;
let sessionPhase = 'focus'; // 'focus' | 'break'
let onTickCallback = null;
let onCompleteCallback = null;

export async function startSession(taskId, config = {}) {
    const focusMinutes = config.focusMinutes ?? DEFAULT_CONFIG.focusMinutes;
    const breakMinutes = config.breakMinutes ?? DEFAULT_CONFIG.breakMinutes;

    try {
        const session = await api.sessions.start({
            task_id: taskId || null,
            duration_minutes: focusMinutes,
            type: 'focus',
        });

        store.set('currentSession', session);
        store.set('isDistracted', false);
        store.set('distractionCount', 0);

        await connectWs(session.id);

        sessionPhase = 'focus';
        secondsLeft = focusMinutes * 60;
        startTimer(breakMinutes);

        return session;
    } catch (err) {
        showToast('Failed to start session: ' + err.message, 'error');
        throw err;
    }
}

function startTimer(breakMinutes) {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        secondsLeft--;
        onTickCallback?.({ secondsLeft, phase: sessionPhase });

        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            if (sessionPhase === 'focus') {
                showToast('🎉 Focus session complete! Take a break.', 'success');
                sessionPhase = 'break';
                secondsLeft = breakMinutes * 60;
                startTimer(breakMinutes);
                onCompleteCallback?.({ phase: 'focus' });
            } else {
                showToast('⚡ Break over! Ready for another session?', 'info');
                onCompleteCallback?.({ phase: 'break' });
            }
        }
    }, 1000);
}

export async function endSession() {
    clearInterval(timerInterval);
    timerInterval = null;

    const session = store.get('currentSession');
    if (!session) return;

    try {
        const distractionCount = store.get('distractionCount') || 0;
        const ended = await api.sessions.end(session.id, { distraction_count: distractionCount });
        store.set('currentSession', null);
        disconnectWs();
        return ended;
    } catch (err) {
        showToast('Failed to end session: ' + err.message, 'error');
        throw err;
    }
}

export async function pauseSession() {
    clearInterval(timerInterval);
    const session = store.get('currentSession');
    if (session) await api.sessions.pause(session.id);
}

export async function resumeSession(breakMinutes) {
    const session = store.get('currentSession');
    if (session) {
        await api.sessions.resume(session.id);
        startTimer(breakMinutes ?? DEFAULT_CONFIG.breakMinutes);
    }
}

export function getTimeLeft() { return secondsLeft; }
export function getPhase() { return sessionPhase; }

export function onTick(cb) { onTickCallback = cb; }
export function onComplete(cb) { onCompleteCallback = cb; }

export function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
}
