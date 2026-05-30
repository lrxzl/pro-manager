const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');
const path = require('path');

// GET /api/files/list?path=... - 列出目录
router.get('/list', (req, res) => {
  try {
    const dirPath = req.query.path;
    if (!dirPath) return res.status(400).json({ error: '缺少 path 参数' });
    const files = fileService.listDir(dirPath);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/read?path=... - 读取文件
router.get('/read', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: '缺少 path 参数' });
    const content = fileService.readFile(filePath);
    res.json({ success: true, data: { content, path: filePath } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/write - 写入文件
router.post('/write', (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: '缺少 path' });
    if (content === undefined) return res.status(400).json({ error: '缺少 content' });
    fileService.writeFile(filePath, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/mkdir - 创建目录
router.post('/mkdir', (req, res) => {
  try {
    const { path: dirPath } = req.body;
    if (!dirPath) return res.status(400).json({ error: '缺少 path' });
    fileService.createDir(dirPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/delete - 删除文件/目录
router.post('/delete', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: '缺少 path' });
    fileService.delete(targetPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/rename - 重命名
router.post('/rename', (req, res) => {
  try {
    const { path: oldPath, newName } = req.body;
    if (!oldPath || !newName) return res.status(400).json({ error: '缺少参数' });
    const newPath = fileService.rename(oldPath, newName);
    res.json({ success: true, data: { newPath } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/copy - 复制
router.post('/copy', (req, res) => {
  try {
    const { src, dest } = req.body;
    if (!src || !dest) return res.status(400).json({ error: '缺少参数' });
    fileService.copy(src, dest);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/move - 移动
router.post('/move', (req, res) => {
  try {
    const { src, dest } = req.body;
    if (!src || !dest) return res.status(400).json({ error: '缺少参数' });
    fileService.move(src, dest);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/search?path=...&keyword=... - 搜索
router.get('/search', (req, res) => {
  try {
    const { path: dirPath, keyword } = req.query;
    if (!dirPath || !keyword) return res.status(400).json({ error: '缺少参数' });
    const results = fileService.search(dirPath, keyword);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/size?path=... - 获取目录大小
router.get('/size', (req, res) => {
  try {
    const dirPath = req.query.path;
    if (!dirPath) return res.status(400).json({ error: '缺少 path 参数' });
    const size = fileService.getDirectorySize(dirPath);
    res.json({ success: true, data: { size, unit: 'MB' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
