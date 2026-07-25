import { auth } from '../../firebase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get a fresh Firebase ID token for the current user.
 * Falls back to X-Dev-UID header if Firebase not configured.
 */
async function getAuthHeader() {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` };
    }
    return {};
}

async function request(method, path, body = null) {
    const authHeader = await getAuthHeader();
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...authHeader,
        },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// --- Tasks ---
export const api = {
    tasks: {
        list: () => request('GET', '/api/tasks'),
        create: (body) => request('POST', '/api/tasks', body),
        update: (id, body) => request('PUT', `/api/tasks/${id}`, body),
        delete: (id) => request('DELETE', `/api/tasks/${id}`),
    },
    sessions: {
        start: (body) => request('POST', '/api/sessions/start', body),
        active: () => request('GET', '/api/sessions/active'),
        list: () => request('GET', '/api/sessions'),
        end: (id, body) => request('POST', `/api/sessions/${id}/end`, body),
        pause: (id) => request('POST', `/api/sessions/${id}/pause`),
        resume: (id) => request('POST', `/api/sessions/${id}/resume`),
    },
    motion: {
        ingest: (body) => request('POST', '/api/motion', body),
    },
    analytics: {
        summary: () => request('GET', '/api/analytics/summary'),
        history: (limit = 14) => request('GET', `/api/analytics/history?limit=${limit}`),
    },
    health: () => request('GET', '/api/health'),
};

export default api;
