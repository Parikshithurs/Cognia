const { Router } = require('express');
const { getSummary, getHistory } = require('../controllers/analytics.controller');
const router = Router();

router.get('/summary', getSummary);
router.get('/history', getHistory);

module.exports = router;
