const express = require('express');
const router = express.Router();
const gitService = require('../services/gitService');
const configService = require('../configService');

// GET /api/git/:projectIndex/status - 获取 git 状态
router.get('/:projectIndex/status', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const status = gitService.status(project.rootDir);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/:projectIndex/history - 获取提交历史
router.get('/:projectIndex/history', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const limit = parseInt(req.query.limit) || 50;
    const history = gitService.getHistory(project.rootDir, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/:projectIndex/commit - 提交（保存快照）
router.post('/:projectIndex/commit', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const { message } = req.body;
    const result = gitService.commit(project.rootDir, message);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/:projectIndex/restore/:hash - 恢复到指定提交
router.post('/:projectIndex/restore/:hash', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const result = gitService.restore(project.rootDir, req.params.hash);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/:projectIndex/show/:hash - 查看提交详情
router.get('/:projectIndex/show/:hash', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const result = gitService.show(project.rootDir, req.params.hash);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/git/:projectIndex/diff - 查看差异
router.get('/:projectIndex/diff', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const { hash1, hash2 } = req.query;
    const result = gitService.diff(project.rootDir, hash1 || 'HEAD~1', hash2);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/git/:projectIndex/discard - 丢弃所有未提交更改
router.post('/:projectIndex/discard', (req, res) => {
  try {
    const project = configService.getByIndex(parseInt(req.params.projectIndex));
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const result = gitService.discardAll(project.rootDir);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
