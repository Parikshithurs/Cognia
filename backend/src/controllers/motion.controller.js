const motionModel = require('../models/motionEvent.model');
const sessionModel = require('../models/session.model');

/**
 * POST /api/motion
 * Body: { session_id, events: [{ face_detected, face_x, face_y, confidence, timestamp }] }
 */
const ingestMotion = (req, res) => {
    try {
        const { session_id, events } = req.body;
        if (!session_id || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'session_id and events[] are required.' });
        }

        // Verify session belongs to user
        const session = sessionModel.getSessionById(session_id);
        if (!session || session.uid !== req.uid) {
            return res.status(403).json({ error: 'Session not found or unauthorized.' });
        }

        const count = motionModel.insertEvents(session_id, req.uid, events);
        res.json({ inserted: count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to ingest motion events' });
    }
};

module.exports = { ingestMotion };
