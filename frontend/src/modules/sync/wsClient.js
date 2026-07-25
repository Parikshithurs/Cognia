import { auth } from '../../firebase.js';
import store from '../store/store.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

let socket = null;
let sessionId = null;
let pingInterval = null;

async function getToken() {
    const user = auth.currentUser;
    if (user) return await user.getIdToken();
    return null;
}

export async function connectWs(sid) {
    sessionId = sid;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'set_session', session_id: sid }));
        return;
    }

    const token = await getToken();
    const url = token ? `${WS_URL}?token=${token}` : `${WS_URL}?dev_uid=local_dev`;

    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
        console.log('📡 WS connected');
        socket.send(JSON.stringify({ type: 'set_session', session_id: sid }));
        pingInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, 15000);
    });

    socket.addEventListener('message', (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'error') console.warn('WS server error:', msg.message);
        } catch { }
    });

    socket.addEventListener('close', () => {
        console.log('📡 WS disconnected');
        clearInterval(pingInterval);
        socket = null;
        // Attempt reconnect after 3s if session is active
        if (sessionId && store.get('currentSession')) {
            setTimeout(() => connectWs(sessionId), 3000);
        }
    });

    socket.addEventListener('error', (err) => {
        console.warn('WS error:', err.message);
    });
}

export function sendMotionFrame(payload) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'motion', session_id: sessionId, payload }));
}

export function disconnectWs() {
    sessionId = null;
    clearInterval(pingInterval);
    if (socket) {
        socket.close();
        socket = null;
    }
}
