const sessionModel = require('../models/session.model');
const { computeFocusScore } = require('../services/analytics.service');

const startSession = (req, res) => {
    try {
        const { task_id, duration_minutes, type } = req.body;
        const session = sessionModel.startSession(req.uid, { task_id, duration_minutes, type });
        res.status(201).json(session);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start session' });
    }
};

const getActiveSessions = (req, res) => {
    try {
        const session = sessionModel.getActiveSession(req.uid);
        res.json(session ?? null);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch active session' });
    }
};

const getSessions = (req, res) => {
    try {
        const sessions = sessionModel.getSessionsByUser(req.uid, Number(req.query.limit) || 50);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

const endSession = (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const focusScore = computeFocusScore(sessionId);
        const { distraction_count } = req.body || {};
        const session = sessionModel.endSession(sessionId, req.uid, { focus_score: focusScore, distraction_count });
        if (!session) return res.status(404).json({ error: 'Session not found or not active.' });
        res.json(session);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to end session' });
    }
};

const pauseSession = (req, res) => {
    try {
        const session = sessionModel.pauseSession(Number(req.params.id), req.uid);
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to pause session' });
    }
};

const resumeSession = (req, res) => {
    try {
        const session = sessionModel.resumeSession(Number(req.params.id), req.uid);
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to resume session' });
    }
};

module.exports = { startSession, getActiveSessions, getSessions, endSession, pauseSession, resumeSession };
