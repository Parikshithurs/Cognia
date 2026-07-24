const { WebSocketServer } = require('ws');
const url = require('url');
const admin = require('firebase-admin');
const motionModel = require('../models/motionEvent.model');
const sessionModel = require('../models/session.model');

/**
 * Creates and attaches a WebSocket server to the existing HTTP server.
 * Clients connect with: ws://localhost:3001?token=<firebase_id_token>
 *
 * Expected messages (JSON):
 *   { type: "motion", session_id: 1, payload: { face_detected, face_x, face_y, confidence, timestamp } }
 *   { type: "ping" }
 */
function createWsServer(httpServer) {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    const firebaseReady =
        process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;

    // Buffer motion events and flush in batches every second per connection
    const buffers = new Map(); // connectionId -> { uid, session_id, events[] }

    async function authenticateConnection(req) {
        const { query } = url.parse(req.url, true);
        const token = query.token;
        const devUid = query.dev_uid;

        if (!firebaseReady) {
            if (devUid) return devUid;
            throw new Error('Firebase not configured');
        }

        if (!token) throw new Error('No token provided');
        const decoded = await admin.auth().verifyIdToken(token);
        return decoded.uid;
    }

    wss.on('connection', async (ws, req) => {
        let uid;
        try {
            uid = await authenticateConnection(req);
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: `Auth failed: ${err.message}` }));
            ws.close();
            return;
        }

        const connId = `${uid}_${Date.now()}`;
        buffers.set(connId, { uid, session_id: null, events: [] });

        ws.send(JSON.stringify({ type: 'connected', uid }));
        console.log(`📡 WS connected: ${uid}`);

        // Flush buffer every 1 second
        const flushInterval = setInterval(() => {
            const buf = buffers.get(connId);
            if (buf && buf.events.length > 0 && buf.session_id) {
                try {
                    motionModel.insertEvents(buf.session_id, buf.uid, buf.events);
                } catch (e) {
                    console.error('WS motion flush error:', e.message);
                }
                buf.events = [];
            }
        }, 1000);

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                    return;
                }

                if (msg.type === 'set_session') {
                    const buf = buffers.get(connId);
                    if (buf) buf.session_id = msg.session_id;
                    return;
                }

                if (msg.type === 'motion') {
                    const buf = buffers.get(connId);
                    if (!buf || !buf.session_id) return;
                    buf.events.push({
                        face_detected: msg.payload?.face_detected ?? false,
                        face_x: msg.payload?.face_x,
                        face_y: msg.payload?.face_y,
                        confidence: msg.payload?.confidence,
                        timestamp: msg.payload?.timestamp ?? new Date().toISOString(),
                    });
                }
            } catch (e) {
                console.error('WS message parse error:', e.message);
            }
        });

        ws.on('close', () => {
            clearInterval(flushInterval);
            buffers.delete(connId);
            console.log(`📡 WS disconnected: ${uid}`);
        });

        ws.on('error', (err) => {
            console.error(`WS error for ${uid}:`, err.message);
            clearInterval(flushInterval);
            buffers.delete(connId);
        });
    });

    console.log('✅ WebSocket server ready at /ws');
    return wss;
}

module.exports = { createWsServer };
