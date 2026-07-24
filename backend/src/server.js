require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initDb } = require('./db');
const { firebaseAuth } = require('./middleware/firebaseAuth.middleware');
const taskRoutes = require('./routes/task.routes');
const sessionRoutes = require('./routes/session.routes');
const motionRoutes = require('./routes/motion.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const { createWsServer } = require('./ws/wsHandler');

const PORT = process.env.PORT || 3001;

async function main() {
    // Initialize sql.js database first (async WASM load)
    await initDb();

    const app = express();

    app.use(cors({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
    }));
    app.use(express.json({ limit: '2mb' }));

    // Health check (public)
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString(), service: 'Cognia API v1' });
    });

    // Protected routes
    app.use('/api/tasks', firebaseAuth, taskRoutes);
    app.use('/api/sessions', firebaseAuth, sessionRoutes);
    app.use('/api/motion', firebaseAuth, motionRoutes);
    app.use('/api/analytics', firebaseAuth, analyticsRoutes);

    app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
    app.use((err, _req, res, _next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    const server = http.createServer(app);
    createWsServer(server);

    server.listen(PORT, () => {
        console.log(`
  ╔══════════════════════════════════════╗
  ║   🧠  Cognia Backend API             ║
  ║   HTTP → http://localhost:${PORT}      ║
  ║   WS   → ws://localhost:${PORT}/ws    ║
  ╚══════════════════════════════════════╝
    `);
    });
}

main().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
