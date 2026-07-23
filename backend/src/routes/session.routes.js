const { Router } = require('express');
const { startSession, getActiveSessions, getSessions, endSession, pauseSession, resumeSession } = require('../controllers/session.controller');
const router = Router();

router.post('/start', startSession);
router.get('/active', getActiveSessions);
router.get('/', getSessions);
router.post('/:id/end', endSession);
router.post('/:id/pause', pauseSession);
router.post('/:id/resume', resumeSession);

module.exports = router;
