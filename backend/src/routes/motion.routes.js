const { Router } = require('express');
const { ingestMotion } = require('../controllers/motion.controller');
const router = Router();

router.post('/', ingestMotion);

module.exports = router;
