const taskModel = require('../models/task.model');

const getTasks = (req, res) => {
    try {
        const tasks = taskModel.getTasksByUser(req.uid);
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

const createTask = (req, res) => {
    try {
        const { title, description, priority, estimated_minutes } = req.body;
        if (!title?.trim()) return res.status(400).json({ error: 'Title is required.' });
        const task = taskModel.createTask(req.uid, { title, description, priority, estimated_minutes });
        res.status(201).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create task' });
    }
};

const updateTask = (req, res) => {
    try {
        const task = taskModel.updateTask(Number(req.params.id), req.uid, req.body);
        if (!task) return res.status(404).json({ error: 'Task not found.' });
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

const deleteTask = (req, res) => {
    try {
        const deleted = taskModel.deleteTask(Number(req.params.id), req.uid);
        if (!deleted) return res.status(404).json({ error: 'Task not found.' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
