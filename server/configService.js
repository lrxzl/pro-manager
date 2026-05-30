const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'pro-manager.json');
const PROJECTS_DIR = path.join(__dirname, '..', 'projects');

// 确保项目目录存在
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, '[]', 'utf-8');
    return [];
  }
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeConfig(projects) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(projects, null, 2), 'utf-8');
}

const configService = {
  // 获取所有项目
  getAll() {
    return readConfig().map((p, i) => ({ ...p, id: i }));
  },

  // 按索引获取项目
  getByIndex(index) {
    const projects = readConfig();
    if (index < 0 || index >= projects.length) return null;
    return { ...projects[index], id: index };
  },

  // 按名称获取项目
  getByName(name) {
    const projects = readConfig();
    const index = projects.findIndex(p => p.projectName === name);
    if (index === -1) return null;
    return { ...projects[index], id: index };
  },

  // 添加项目
  add(project) {
    const projects = readConfig();
    // 检查名称唯一性
    if (projects.some(p => p.projectName === project.projectName)) {
      throw new Error(`项目名称 "${project.projectName}" 已存在`);
    }
    projects.push(project);
    writeConfig(projects);
    return { ...project, id: projects.length - 1 };
  },

  // 更新项目
  update(index, patch) {
    const projects = readConfig();
    if (index < 0 || index >= projects.length) {
      throw new Error(`项目索引 ${index} 不存在`);
    }
    // 如果更新了名称，检查唯一性
    if (patch.projectName && patch.projectName !== projects[index].projectName) {
      if (projects.some(p => p.projectName === patch.projectName)) {
        throw new Error(`项目名称 "${patch.projectName}" 已存在`);
      }
    }
    // 支持嵌套路径更新，如 'frontend.status': 'running'
    for (const [key, value] of Object.entries(patch)) {
      const keys = key.split('.');
      let obj = projects[index];
      let skip = false;
      for (let i = 0; i < keys.length - 1; i++) {
        // 如果父级是 null，跳过此路径的更新
        if (obj[keys[i]] === null || obj[keys[i]] === undefined) {
          skip = true;
          break;
        }
        if (typeof obj[keys[i]] !== 'object') {
          skip = true;
          break;
        }
        obj = obj[keys[i]];
      }
      if (!skip) {
        obj[keys[keys.length - 1]] = value;
      }
    }
    writeConfig(projects);
    return { ...projects[index], id: index };
  },

  // 删除项目
  remove(index) {
    const projects = readConfig();
    if (index < 0 || index >= projects.length) {
      throw new Error(`项目索引 ${index} 不存在`);
    }
    const removed = projects.splice(index, 1)[0];
    writeConfig(projects);
    return removed;
  },

  // 获取项目数量
  count() {
    return readConfig().length;
  },

  // 获取所有已使用的端口
  getUsedPorts() {
    const projects = readConfig();
    const ports = [];
    for (const p of projects) {
      if (p.frontend && p.frontend.port > 0) ports.push(p.frontend.port);
      if (p.server && p.server.port > 0) ports.push(p.server.port);
    }
    return ports;
  }
};

module.exports = configService;
