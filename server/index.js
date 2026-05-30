const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');

const app = express();
const PORT = 3456;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（前端构建产物）
const webDist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDist));

// API 路由
app.use('/api/projects', require('./routes/projects'));
app.use('/api/scaffolds', require('./routes/scaffolds'));
app.use('/api/files', require('./routes/files'));
app.use('/api/git', require('./routes/git'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA 回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(webDist, 'index.html'));
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// WebSocket 服务器（用于终端）
const wss = new WebSocketServer({ server, path: '/ws/terminal' });

wss.on('connection', (ws) => {
  let shell = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'start') {
        // 启动 shell
        const cwd = msg.cwd || process.cwd();
        const isWin = process.platform === 'win32';
        shell = spawn(isWin ? 'cmd' : 'sh', [], {
          cwd,
          env: process.env,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        shell.stdout.on('data', (d) => {
          ws.send(JSON.stringify({ type: 'stdout', data: d.toString() }));
        });
        shell.stderr.on('data', (d) => {
          ws.send(JSON.stringify({ type: 'stderr', data: d.toString() }));
        });
        shell.on('exit', (code) => {
          ws.send(JSON.stringify({ type: 'exit', code }));
          shell = null;
        });

        ws.send(JSON.stringify({ type: 'started', pid: shell.pid }));
      } else if (msg.type === 'input' && shell) {
        shell.stdin.write(msg.data);
      } else if (msg.type === 'resize' && shell) {
        // 终端大小调整（如果支持）
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    if (shell) {
      try {
        shell.kill();
      } catch {}
      shell = null;
    }
  });
});

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Pro Manager 已启动!');
  console.log('');
  console.log(`   后端 API: http://localhost:${PORT}`);
  console.log(`   前端页面: http://localhost:5174`);
  console.log('');
  console.log('   提示: 请在浏览器中打开 http://localhost:5174');
  console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  const processService = require('./services/processService');
  processService.stopAllProcesses();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  const processService = require('./services/processService');
  processService.stopAllProcesses();
  server.close(() => {
    process.exit(0);
  });
});
