const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 生产环境提供前端静态文件
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

// API 路由
app.use('/api', apiRoutes);

// SPA 回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// 初始化数据库并启动
initDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
