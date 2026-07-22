const { getUserSummary, getRecentSessions } = require('../services/analytics.service');

const getSummary = (req, res) => {
    try {
        const summary = getUserSummary(req.uid);
        res.json(summary);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute summary' });
    }
};

const getHistory = (req, res) => {
    try {
        const sessions = getRecentSessions(req.uid, Number(req.query.limit) || 14);
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

module.exports = { getSummary, getHistory };
