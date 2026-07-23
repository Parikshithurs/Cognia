const { Router } = require('express');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/task.controller');
const router = Router();

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
