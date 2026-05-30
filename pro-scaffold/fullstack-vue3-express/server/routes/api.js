const express = require('express');
const router = express.Router();
const db = require('../db');

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 获取所有项目
router.get('/items', (req, res) => {
  try {
    const items = db.getAll('items');
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个项目
router.get('/items/:id', (req, res) => {
  try {
    const item = db.getById('items', parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建项目
router.post('/items', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const item = db.create('items', { name, description: description || '' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新项目
router.put('/items/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    const item = db.update('items', parseInt(req.params.id), { name, description });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除项目
router.delete('/items/:id', (req, res) => {
  try {
    const success = db.remove('items', parseInt(req.params.id));
    if (!success) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
