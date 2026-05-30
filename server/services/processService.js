const { spawn } = require('child_process');
const net = require('net');
const treeKill = require('tree-kill');
const path = require('path');
const fs = require('fs');

// 进程追踪 Map: key = "${projectIndex}_${type}" (frontend/server)
const processes = new Map();

const isWindows = process.platform === 'win32';

const processService = {
  // 启动前端
  async startFrontend(projectIndex, project) {
    const frontDir = path.join(project.rootDir, project.frontend.dir);
    if (!fs.existsSync(frontDir)) {
      throw new Error(`前端目录不存在: ${frontDir}`);
    }

    // 检查是否已运行
    const key = `${projectIndex}_frontend`;
    if (processes.has(key)) {
      throw new Error('前端已在运行中');
    }

    // 检查 node_modules，不存在则安装
    if (!fs.existsSync(path.join(frontDir, 'node_modules'))) {
      if (fs.existsSync(path.join(frontDir, 'package.json'))) {
        await this.install(frontDir);
      }
    }

    // 查找可用端口
    const port = await this.findAvailablePort(project.frontend.port || 5173);

    // 启动 dev server
    const proc = this._spawnNpmDev(frontDir, port);

    // 追踪进程
    const entry = {
      proc,
      pid: proc.pid,
      startTime: Date.now(),
      port,
      output: ''
    };
    processes.set(key, entry);

    // 监听输出，检测端口
    let detectedPort = port;
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      entry.output += text;
      // Vite 端口检测
      const match = text.match(/Local:\s+https?:\/\/localhost:(\d+)/);
      if (match) {
        detectedPort = parseInt(match[1]);
        entry.port = detectedPort;
      }
    });
    proc.stderr.on('data', (data) => {
      entry.output += data.toString();
    });

    // 检测进程是否启动成功
    let exited = false;
    let exitCode = null;
    proc.on('exit', (code) => {
      exited = true;
      exitCode = code;
      processes.delete(key);
    });

    // 等待一小段时间让进程启动
    await this._sleep(2000);

    // 检查进程是否已退出（启动失败）
    if (exited) {
      const errorMsg = entry.output.slice(-300) || '进程已退出';
      throw new Error(`前端启动失败 (exit code: ${exitCode}): ${errorMsg}`);
    }

    return {
      pid: proc.pid,
      port: detectedPort,
      output: entry.output.slice(-500)
    };
  },

  // 启动后端
  async startServer(projectIndex, project) {
    const serverDir = path.join(project.rootDir, project.server.dir);
    if (!fs.existsSync(serverDir)) {
      throw new Error(`后端目录不存在: ${serverDir}`);
    }

    const key = `${projectIndex}_server`;
    if (processes.has(key)) {
      throw new Error('后端已在运行中');
    }

    // 检查 node_modules
    if (!fs.existsSync(path.join(serverDir, 'node_modules'))) {
      if (fs.existsSync(path.join(serverDir, 'package.json'))) {
        await this.install(serverDir);
      }
    }

    const port = await this.findAvailablePort(project.server.port || 3000);

    // 启动后端
    const proc = this._spawnNode(serverDir, port);

    const entry = {
      proc,
      pid: proc.pid,
      startTime: Date.now(),
      port,
      output: ''
    };
    processes.set(key, entry);

    let detectedPort = port;
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      entry.output += text;
      // Express 端口检测
      const match = text.match(/(?:listening|running).*?(\d{4,5})/i);
      if (match) {
        detectedPort = parseInt(match[1]);
        entry.port = detectedPort;
      }
    });
    proc.stderr.on('data', (data) => {
      entry.output += data.toString();
    });

    // 检测进程是否启动成功
    let exited = false;
    let exitCode = null;
    proc.on('exit', (code) => {
      exited = true;
      exitCode = code;
      processes.delete(key);
    });

    await this._sleep(2000);

    // 检查进程是否已退出（启动失败）
    if (exited) {
      const errorMsg = entry.output.slice(-300) || '进程已退出';
      throw new Error(`后端启动失败 (exit code: ${exitCode}): ${errorMsg}`);
    }

    return {
      pid: proc.pid,
      port: detectedPort,
      output: entry.output.slice(-500)
    };
  },

  // 启动全部
  async startAll(projectIndex, project) {
    const results = {};

    if (project.frontend && project.frontend.dir) {
      try {
        results.frontend = await this.startFrontend(projectIndex, project);
      } catch (err) {
        results.frontend = { error: err.message };
      }
    }

    if (project.server && project.server.dir) {
      try {
        results.server = await this.startServer(projectIndex, project);
      } catch (err) {
        results.server = { error: err.message };
      }
    }

    return results;
  },

  // 停止前端
  stopFrontend(projectIndex) {
    return this._stop(`${projectIndex}_frontend`);
  },

  // 停止后端
  stopServer(projectIndex) {
    return this._stop(`${projectIndex}_server`);
  },

  // 停止全部
  stopAll(projectIndex) {
    const results = {};
    results.frontend = this.stopFrontend(projectIndex);
    results.server = this.stopServer(projectIndex);
    return results;
  },

  // 停止所有进程
  stopAllProcesses() {
    for (const [key, entry] of processes) {
      try {
        treeKill(entry.pid, 'SIGTERM');
      } catch {}
    }
    processes.clear();
  },

  // 安装依赖
  async install(dirPath) {
    return new Promise((resolve, reject) => {
      const cmd = isWindows ? 'cmd' : 'npm';
      const args = isWindows ? ['/c', 'npm', 'install'] : ['install'];

      const proc = spawn(cmd, args, {
        cwd: dirPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      proc.stdout.on('data', data => { output += data.toString(); });
      proc.stderr.on('data', data => { output += data.toString(); });

      proc.on('exit', (code) => {
        if (code === 0) {
          resolve({ success: true, output: output.slice(-500) });
        } else {
          reject(new Error(`npm install 失败 (code ${code}): ${output.slice(-300)}`));
        }
      });

      proc.on('error', reject);
    });
  },

  // 检查端口是否存活
  async checkPortAlive(port) {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get(`http://localhost:${port}`, { timeout: 2000 }, (res) => {
        resolve(true);
        req.destroy();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  },

  // 检查端口是否被占用
  isPortInUse(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port, '0.0.0.0');
    });
  },

  // 查找可用端口
  async findAvailablePort(startPort) {
    let port = startPort;
    for (let i = 0; i < 100; i++) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) return port;
      port++;
    }
    throw new Error(`无法找到可用端口（从 ${startPort} 开始）`);
  },

  // 获取进程状态
  getStatus(projectIndex) {
    const key_f = `${projectIndex}_frontend`;
    const key_s = `${projectIndex}_server`;
    return {
      frontend: processes.has(key_f) ? {
        pid: processes.get(key_f).pid,
        port: processes.get(key_f).port,
        uptime: Date.now() - processes.get(key_f).startTime
      } : null,
      server: processes.has(key_s) ? {
        pid: processes.get(key_s).pid,
        port: processes.get(key_s).port,
        uptime: Date.now() - processes.get(key_s).startTime
      } : null
    };
  },

  // 检查进程是否存活
  isProcessAlive(pid) {
    if (!pid || pid < 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  },

  // 内部方法：停止进程
  _stop(key) {
    if (!processes.has(key)) {
      return { success: true, message: '未运行' };
    }
    const entry = processes.get(key);
    return new Promise((resolve) => {
      treeKill(entry.pid, 'SIGTERM', (err) => {
        processes.delete(key);
        resolve({ success: !err, error: err?.message });
      });
    });
  },

  // 内部方法：spawn npm dev
  _spawnNpmDev(dirPath, port) {
    const env = { ...process.env, PORT: String(port) };
    // 使用 --port 参数传递端口给 Vite
    if (isWindows) {
      return spawn('cmd', ['/c', 'npm', 'run', 'dev', '--', '--port', String(port)], {
        cwd: dirPath,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }
    return spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
      cwd: dirPath,
      env,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  },

  // 内部方法：spawn node
  _spawnNode(dirPath, port) {
    const env = { ...process.env, PORT: String(port) };
    // 查找入口文件
    const pkgPath = path.join(dirPath, 'package.json');
    let entryFile = 'index.js';
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts && pkg.scripts.dev) {
          // 使用 npm run dev
          if (isWindows) {
            return spawn('cmd', ['/c', 'npm', 'run', 'dev'], {
              cwd: dirPath,
              env,
              shell: true,
              stdio: ['pipe', 'pipe', 'pipe']
            });
          }
          return spawn('npm', ['run', 'dev'], {
            cwd: dirPath,
            env,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe']
          });
        }
        if (pkg.main) entryFile = pkg.main;
      } catch {}
    }
    return spawn('node', [entryFile], {
      cwd: dirPath,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  },

  // 内部方法：sleep
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = processService;
