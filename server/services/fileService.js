const fs = require('fs');
const path = require('path');

const fileService = {
  // 列出目录内容
  listDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`目录不存在: ${dirPath}`);
    }
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`不是目录: ${dirPath}`);
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stat.size,
            modified: stat.mtime.toISOString()
          };
        } catch {
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: 0,
            modified: null
          };
        }
      })
      .sort((a, b) => {
        // 目录优先
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  },

  // 读取文件内容
  readFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      throw new Error(`是目录不是文件: ${filePath}`);
    }
    // 检查是否是二进制文件
    const ext = path.extname(filePath).toLowerCase();
    const textExts = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.json', '.md', '.txt', '.html', '.css', '.scss', '.less', '.yaml', '.yml', '.xml', '.csv', '.sh', '.bat', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.toml', '.ini', '.cfg', '.conf', '.env', '.gitignore', '.dockerignore', '.sql'];
    if (!textExts.includes(ext) && stat.size > 1024 * 1024) {
      throw new Error('文件太大，不支持读取');
    }
    return fs.readFileSync(filePath, 'utf-8');
  },

  // 写入文件
  writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  },

  // 创建目录
  createDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  // 删除文件或目录
  delete(targetPath) {
    if (!fs.existsSync(targetPath)) {
      throw new Error(`不存在: ${targetPath}`);
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
  },

  // 重命名
  rename(oldPath, newName) {
    if (!fs.existsSync(oldPath)) {
      throw new Error(`不存在: ${oldPath}`);
    }
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    if (fs.existsSync(newPath)) {
      throw new Error(`目标已存在: ${newPath}`);
    }
    fs.renameSync(oldPath, newPath);
    return newPath;
  },

  // 复制文件或目录
  copy(src, dest) {
    if (!fs.existsSync(src)) {
      throw new Error(`源不存在: ${src}`);
    }
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  },

  // 移动文件或目录
  move(src, dest) {
    if (!fs.existsSync(src)) {
      throw new Error(`源不存在: ${src}`);
    }
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.renameSync(src, dest);
  },

  // 搜索文件
  search(dirPath, keyword, maxResults = 50) {
    const results = [];
    const walk = (dir) => {
      if (results.length >= maxResults) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.name.toLowerCase().includes(keyword.toLowerCase())) {
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory()
            });
          }
          if (entry.isDirectory()) {
            walk(fullPath);
          }
        }
      } catch {}
    };
    walk(dirPath);
    return results;
  },

  // 获取源码目录大小（MB），排除 node_modules 等
  getDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    const skipDirs = ['node_modules', '.git', 'dist', '.nuxt', '.next'];
    const walk = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (skipDirs.includes(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            try {
              total += fs.statSync(fullPath).size;
            } catch {}
          }
        }
      } catch {}
    };
    walk(dirPath);
    return Math.round(total / (1024 * 1024) * 100) / 100; // MB, 保留2位小数
  },

  // 获取 node_modules 依赖大小（MB）
  getNodeModulesSize(dirPath) {
    const nmPath = path.join(dirPath, 'node_modules');
    if (!fs.existsSync(nmPath)) return 0;
    let total = 0;
    const walk = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            try {
              total += fs.statSync(fullPath).size;
            } catch {}
          }
        }
      } catch {}
    };
    walk(nmPath);
    return Math.round(total / (1024 * 1024) * 100) / 100; // MB, 保留2位小数
  }
};

module.exports = fileService;
