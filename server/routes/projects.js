const express = require('express');
const router = express.Router();
const projectService = require('../services/projectService');

// GET /api/projects - 获取所有项目
router.get('/', (req, res) => {
  try {
    const projects = projectService.getAll();
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id - 获取单个项目
router.get('/:id', (req, res) => {
  try {
    const project = projectService.getByIndex(parseInt(req.params.id));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects - 创建项目
router.post('/', (req, res) => {
  try {
    const { name, scaffold, type } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    const project = projectService.create({ name, scaffold, type });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id - 更新项目（重命名）
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    const project = projectService.rename(parseInt(req.params.id), name);
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id - 删除项目
router.delete('/:id', async (req, res) => {
  try {
    const result = await projectService.delete(parseInt(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/start - 启动项目
router.post('/:id/start', async (req, res) => {
  try {
    const { target } = req.body; // 'all', 'frontend', 'server'
    const result = await projectService.start(parseInt(req.params.id), target || 'all');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/stop - 停止项目
router.post('/:id/stop', (req, res) => {
  try {
    const { target } = req.body;
    const result = projectService.stop(parseInt(req.params.id), target || 'all');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/install - 安装依赖
router.post('/:id/install', async (req, res) => {
  try {
    const { target } = req.body; // 'frontend', 'server'
    const result = await projectService.install(parseInt(req.params.id), target || 'frontend');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/sync - 同步运行状态
router.post('/:id/sync', async (req, res) => {
  try {
    const project = await projectService.syncStatus(parseInt(req.params.id));
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/size - 更新目录大小
router.get('/:id/size', (req, res) => {
  try {
    const project = projectService.updateSize(parseInt(req.params.id));
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
