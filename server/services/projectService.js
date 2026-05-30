const path = require('path');
const fs = require('fs');
const configService = require('../configService');
const scaffoldService = require('./scaffoldService');
const processService = require('./processService');
const fileService = require('./fileService');

const PROJECTS_DIR = path.join(__dirname, '..', '..', 'projects');

const projectService = {
  // 获取所有项目（带运行状态）
  getAll() {
    const projects = configService.getAll();
    return projects.map(p => this._enrichProject(p));
  },

  // 获取单个项目
  getByIndex(index) {
    const project = configService.getByIndex(index);
    if (!project) return null;
    return this._enrichProject(project);
  },

  // 创建项目
  create({ name, scaffold, type }) {
    // 验证名称
    if (!name || !name.trim()) {
      throw new Error('项目名称不能为空');
    }
    // 支持中文、英文、数字、下划线、连字符，移除其他字符
    const safeName = name.trim().replace(/[^a-zA-Z0-9一-鿿㐀-䶿_\-\s]/g, '_').replace(/\s+/g, '_');

    // 检查名称唯一性
    const existing = configService.getByName(safeName);
    if (existing) {
      throw new Error(`项目名称 "${safeName}" 已存在`);
    }

    // 计算项目目录
    const rootDir = path.join(PROJECTS_DIR, safeName);
    if (fs.existsSync(rootDir)) {
      throw new Error(`项目目录已存在: ${rootDir}`);
    }

    // 获取手脚架列表，确定默认手脚架
    const scaffolds = scaffoldService.getList();
    const scaffoldName = scaffold || (scaffolds.length > 0 ? scaffolds[0].name : null);
    if (!scaffoldName) {
      throw new Error('没有可用的手脚架');
    }

    // 生成项目
    const result = scaffoldService.generate(rootDir, scaffoldName, safeName, name);

    // 获取手脚架信息
    const scaffoldInfo = scaffolds.find(s => s.name === scaffoldName);
    const hasServer = scaffoldInfo && scaffoldInfo.language && scaffoldInfo.language.server;

    // 计算端口（避免冲突）
    const usedPorts = configService.getUsedPorts();
    const frontendPort = this._findNextPort(usedPorts, 5173);
    usedPorts.push(frontendPort);
    const serverPort = hasServer ? this._findNextPort(usedPorts, 3000) : -1;

    // 构建项目对象
    const project = {
      projectName: safeName,
      rootDir,
      readme: './README.md',
      frontend: {
        dir: './frontend',
        currentPID: -1,
        language: scaffoldInfo ? scaffoldInfo.language.frontend || 'vue3' : 'vue3',
        status: 'stopped',
        devCommand: 'npm run dev',
        port: frontendPort,
        size: fileService.getDirectorySize(path.join(rootDir, 'frontend')),
        depSize: fileService.getNodeModulesSize(path.join(rootDir, 'frontend')),
        readme: './README.md'
      },
      server: hasServer ? {
        dir: './server',
        currentPID: -1,
        language: scaffoldInfo.language.server || 'nodejs',
        status: 'stopped',
        devCommand: 'npm run dev',
        port: serverPort,
        size: fileService.getDirectorySize(path.join(rootDir, 'server')),
        depSize: fileService.getNodeModulesSize(path.join(rootDir, 'server')),
        readme: './README.md'
      } : null,
      originalProject: '',
      projectType: type || 'app',
      createdAt: new Date().toISOString()
    };

    // 保存到配置
    const saved = configService.add(project);
    return this._enrichProject(saved);
  },

  // 重命名项目
  rename(index, newName) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const safeName = newName.trim().replace(/[^a-zA-Z0-9一-鿿㐀-䶿_\-\s]/g, '_').replace(/\s+/g, '_');

    // 如果目录也需要重命名
    const newRootDir = path.join(PROJECTS_DIR, safeName);
    if (project.rootDir !== newRootDir && fs.existsSync(project.rootDir)) {
      fs.renameSync(project.rootDir, newRootDir);
    }

    return configService.update(index, {
      projectName: safeName,
      rootDir: newRootDir
    });
  },

  // 删除项目
  async delete(index) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    // 先停止运行中的进程
    try {
      processService.stopAll(index);
    } catch {}

    // 删除项目目录
    if (fs.existsSync(project.rootDir)) {
      fs.rmSync(project.rootDir, { recursive: true, force: true });
    }

    return configService.remove(index);
  },

  // 启动项目
  async start(index, target) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const results = {};
    const updatePatch = {};

    if (!target || target === 'all') {
      // 启动全部
      const startResult = await processService.startAll(index, project);

      if (startResult.frontend && !startResult.frontend.error) {
        updatePatch['frontend.status'] = 'running';
        updatePatch['frontend.currentPID'] = startResult.frontend.pid;
        updatePatch['frontend.port'] = startResult.frontend.port;
        results.frontend = startResult.frontend;
      } else if (startResult.frontend) {
        results.frontend = startResult.frontend;
      }

      if (startResult.server && !startResult.server.error) {
        updatePatch['server.status'] = 'running';
        updatePatch['server.currentPID'] = startResult.server.pid;
        updatePatch['server.port'] = startResult.server.port;
        results.server = startResult.server;
      } else if (startResult.server) {
        results.server = startResult.server;
      }
    } else if (target === 'frontend') {
      if (!project.frontend?.dir) throw new Error('该项目没有前端配置');
      const result = await processService.startFrontend(index, project);
      updatePatch['frontend.status'] = 'running';
      updatePatch['frontend.currentPID'] = result.pid;
      updatePatch['frontend.port'] = result.port;
      results.frontend = result;
    } else if (target === 'server') {
      if (!project.server?.dir) throw new Error('该项目没有后端配置');
      const result = await processService.startServer(index, project);
      updatePatch['server.status'] = 'running';
      updatePatch['server.currentPID'] = result.pid;
      updatePatch['server.port'] = result.port;
      results.server = result;
    }

    // 一次性更新配置
    if (Object.keys(updatePatch).length > 0) {
      configService.update(index, updatePatch);
    }

    return results;
  },

  // 停止项目
  stop(index, target) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const results = {};
    const patch = {};

    if (!target || target === 'all') {
      const stopResult = processService.stopAll(index);
      // 只有有 dir 的才更新状态
      if (project.frontend?.dir) {
        patch['frontend.status'] = 'stopped';
        patch['frontend.currentPID'] = -1;
      }
      if (project.server?.dir) {
        patch['server.status'] = 'stopped';
        patch['server.currentPID'] = -1;
      }
      configService.update(index, patch);
      return stopResult;
    } else if (target === 'frontend') {
      if (!project.frontend?.dir) throw new Error('该项目没有前端配置');
      const result = processService.stopFrontend(index);
      patch['frontend.status'] = 'stopped';
      patch['frontend.currentPID'] = -1;
      configService.update(index, patch);
      return result;
    } else if (target === 'server') {
      if (!project.server?.dir) throw new Error('该项目没有后端配置');
      const result = processService.stopServer(index);
      patch['server.status'] = 'stopped';
      patch['server.currentPID'] = -1;
      configService.update(index, patch);
      return result;
    }
  },

  // 安装依赖
  async install(index, target) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const dir = target === 'server'
      ? path.join(project.rootDir, project.server.dir)
      : path.join(project.rootDir, project.frontend.dir);

    return processService.install(dir);
  },

  // 更新目录大小
  updateSize(index) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const patch = {};
    if (project.frontend?.dir) {
      const frontendDir = path.join(project.rootDir, project.frontend.dir);
      patch['frontend.size'] = fileService.getDirectorySize(frontendDir);
      patch['frontend.depSize'] = fileService.getNodeModulesSize(frontendDir);
    }
    if (project.server?.dir) {
      const serverDir = path.join(project.rootDir, project.server.dir);
      patch['server.size'] = fileService.getDirectorySize(serverDir);
      patch['server.depSize'] = fileService.getNodeModulesSize(serverDir);
    }

    return configService.update(index, patch);
  },

  // 同步运行状态
  async syncStatus(index) {
    const project = configService.getByIndex(index);
    if (!project) throw new Error('项目不存在');

    const patch = {};

    // 检查前端（只有有 dir 的才检查）
    if (project.frontend?.dir && project.frontend.status === 'running') {
      const pidAlive = processService.isProcessAlive(project.frontend.currentPID);
      const portAlive = await processService.checkPortAlive(project.frontend.port);
      if (!pidAlive && !portAlive) {
        patch['frontend.status'] = 'stopped';
        patch['frontend.currentPID'] = -1;
      }
    }

    // 检查后端（只有有 dir 的才检查）
    if (project.server?.dir && project.server.status === 'running') {
      const pidAlive = processService.isProcessAlive(project.server.currentPID);
      const portAlive = await processService.checkPortAlive(project.server.port);
      if (!pidAlive && !portAlive) {
        patch['server.status'] = 'stopped';
        patch['server.currentPID'] = -1;
      }
    }

    if (Object.keys(patch).length > 0) {
      return configService.update(index, patch);
    }
    return project;
  },

  // 内部方法：丰富项目信息
  _enrichProject(project) {
    const status = processService.getStatus(project.id);
    // 只有有 dir 的才计入运行状态
    const frontendRunning = project.frontend?.dir && (project.frontend?.status === 'running' || status.frontend !== null);
    const serverRunning = project.server?.dir && (project.server?.status === 'running' || status.server !== null);
    const sourceSize = (project.frontend?.dir ? project.frontend?.size || 0 : 0) + (project.server?.dir ? project.server?.size || 0 : 0);
    const depSize = (project.frontend?.dir ? project.frontend?.depSize || 0 : 0) + (project.server?.dir ? project.server?.depSize || 0 : 0);
    return {
      ...project,
      totalSize: sourceSize + depSize,
      sourceSize,
      depSize,
      isRunning: frontendRunning || serverRunning,
      runtime: status
    };
  },

  // 内部方法：找下一个可用端口
  _findNextPort(usedPorts, startPort) {
    let port = startPort;
    while (usedPorts.includes(port)) {
      port++;
    }
    return port;
  }
};

module.exports = projectService;
