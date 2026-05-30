const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const gitService = {
  // 执行 git 命令
  _exec(cmd, cwd) {
    try {
      const result = execSync(cmd, {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return result.trim();
    } catch (err) {
      throw new Error(err.stderr || err.message);
    }
  },

  // 初始化 git 仓库
  init(projectDir) {
    if (!fs.existsSync(path.join(projectDir, '.git'))) {
      this._exec('git init', projectDir);
      this._exec('git add -A', projectDir);
      this._exec('git commit -m "Initial commit"', projectDir);
    }
    return { success: true };
  },

  // 检查是否是 git 仓库
  isGitRepo(projectDir) {
    return fs.existsSync(path.join(projectDir, '.git'));
  },

  // 获取 git 状态
  status(projectDir) {
    this.init(projectDir);
    const status = this._exec('git status --porcelain', projectDir);
    const files = status ? status.split('\n').filter(Boolean).map(line => {
      const flag = line.substring(0, 2).trim();
      const file = line.substring(3);
      let status = 'modified';
      if (flag === '??') status = 'new';
      else if (flag === 'D') status = 'deleted';
      else if (flag === 'R') status = 'renamed';
      return { flag, file, status };
    }) : [];
    return { files, clean: files.length === 0 };
  },

  // 获取提交历史
  getHistory(projectDir, limit = 50) {
    this.init(projectDir);
    try {
      const log = this._exec(`git log --oneline -${limit} --format="%H|%s|%ai"`, projectDir);
      if (!log) return [];
      return log.split('\n').filter(Boolean).map(line => {
        const [hash, message, date] = line.split('|');
        return { hash, message, date };
      });
    } catch {
      return [];
    }
  },

  // 提交（保存快照）
  commit(projectDir, message) {
    this.init(projectDir);
    this._exec('git add -A', projectDir);

    // 检查是否有变更
    const status = this._exec('git status --porcelain', projectDir);
    if (!status) {
      return { success: true, message: '没有变更需要提交' };
    }

    const msg = message || `快照 ${new Date().toLocaleString('zh-CN')}`;
    this._exec(`git commit -m "${msg.replace(/"/g, '\\"')}"`, projectDir);

    const hash = this._exec('git rev-parse HEAD', projectDir);
    return { success: true, hash, message: msg };
  },

  // 恢复到指定提交
  restore(projectDir, commitHash) {
    this.init(projectDir);

    // 先保存当前状态
    const status = this._exec('git status --porcelain', projectDir);
    if (status) {
      this._exec('git add -A', projectDir);
      this._exec('git commit -m "自动保存：恢复前"', projectDir);
    }

    // 恢复到指定提交
    this._exec(`git checkout ${commitHash} -- .`, projectDir);
    this._exec('git add -A', projectDir);
    this._exec(`git commit -m "恢复到 ${commitHash.substring(0, 7)}"`, projectDir);

    return { success: true, restoredTo: commitHash };
  },

  // 查看提交详情
  show(projectDir, commitHash) {
    this.init(projectDir);
    const detail = this._exec(`git show --stat ${commitHash}`, projectDir);
    return { hash: commitHash, detail };
  },

  // 查看变更差异
  diff(projectDir, commitHash1, commitHash2) {
    this.init(projectDir);
    const diff = commitHash2
      ? this._exec(`git diff ${commitHash1} ${commitHash2}`, projectDir)
      : this._exec(`git diff ${commitHash1}`, projectDir);
    return { diff };
  },

  // 获取当前 HEAD 的 hash
  getHead(projectDir) {
    this.init(projectDir);
    try {
      return this._exec('git rev-parse HEAD', projectDir);
    } catch {
      return null;
    }
  },

  // 丢弃所有未提交的更改
  discardAll(projectDir) {
    this.init(projectDir);
    this._exec('git checkout -- .', projectDir);
    this._exec('git clean -fd', projectDir);
    return { success: true };
  }
};

module.exports = gitService;
