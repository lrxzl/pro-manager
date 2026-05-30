<template>
  <div class="container">
    <header class="header">
      <button class="btn btn-outline" @click="$router.push(`/project/${projectId}`)">← 返回</button>
      <h1>💾 Git 版本管理</h1>
      <div class="header-actions">
        <button class="btn btn-outline" @click="loadStatus" :disabled="loading">
          🔄 刷新
        </button>
        <button class="btn btn-primary" @click="showCommitModal = true">
          📸 提交保存
        </button>
      </div>
    </header>

    <!-- 当前状态 -->
    <div v-if="status" class="status-card card">
      <div class="status-header">
        <span class="status-title">当前状态</span>
        <span :class="['badge', status.clean ? 'badge-success' : 'badge-warning']">
          {{ status.clean ? '已提交' : '有未提交的更改' }}
        </span>
      </div>
      <div v-if="!status.clean && status.files.length > 0" class="changed-files">
        <div v-for="file in status.files.slice(0, 10)" :key="file.file" class="file-item">
          <span :class="['file-flag', file.status]">{{ file.flag }}</span>
          <span class="file-name">{{ file.file }}</span>
        </div>
        <div v-if="status.files.length > 10" class="more-files">
          还有 {{ status.files.length - 10 }} 个文件...
        </div>
      </div>
      <div v-if="!status.clean" class="status-actions">
        <button class="btn btn-danger btn-sm" @click="handleDiscard">
          丢弃所有更改
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      加载中...
    </div>

    <!-- 提交历史 -->
    <div v-else-if="history.length === 0" class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">还没有提交记录</div>
      <p>点击上方"提交保存"按钮创建第一个版本</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="(commit, index) in history"
        :key="commit.hash"
        class="commit-item card"
      >
        <div class="commit-header">
          <div class="commit-message">{{ commit.message }}</div>
          <div class="commit-hash">{{ commit.hash.substring(0, 7) }}</div>
        </div>
        <div class="commit-meta">
          <span class="commit-date">{{ formatDate(commit.date) }}</span>
        </div>
        <div class="commit-actions">
          <button
            class="btn btn-sm btn-success"
            :disabled="restoringHash === commit.hash"
            @click="handleRestore(commit)"
          >
            {{ restoringHash === commit.hash ? '恢复中...' : '🔄 恢复此版本' }}
          </button>
          <button
            class="btn btn-sm btn-outline"
            @click="handleShowDetail(commit)"
          >
            📋 查看详情
          </button>
          <button
            v-if="index < history.length - 1"
            class="btn btn-sm btn-outline"
            @click="handleDiff(commit, history[index + 1])"
          >
            📊 查看差异
          </button>
        </div>
      </div>
    </div>

    <!-- 提交弹窗 -->
    <div v-if="showCommitModal" class="modal-overlay" @click.self="showCommitModal = false">
      <div class="modal">
        <div class="modal-title">提交保存</div>
        <div class="form-group">
          <label>提交说明</label>
          <input
            v-model="commitMessage"
            placeholder="描述这次修改的内容..."
            @keyup.enter="handleCommit"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCommitModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="committing"
            @click="handleCommit"
          >
            {{ committing ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal modal-large">
        <div class="modal-title">提交详情</div>
        <div v-if="detailContent" class="detail-content">
          <pre>{{ detailContent }}</pre>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 差异弹窗 -->
    <div v-if="showDiffModal" class="modal-overlay" @click.self="showDiffModal = false">
      <div class="modal modal-large">
        <div class="modal-title">文件差异</div>
        <div v-if="diffContent" class="diff-content">
          <pre>{{ diffContent }}</pre>
        </div>
        <div v-else class="empty-state">
          <p>没有差异</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDiffModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as gitApi from '../api/git'
import { useToast } from '../composables/useToast'

const route = useRoute()
const toast = useToast()

const projectId = route.params.id
const loading = ref(false)
const status = ref(null)
const history = ref([])
const restoringHash = ref(null)

const showCommitModal = ref(false)
const commitMessage = ref('')
const committing = ref(false)

const showDetailModal = ref(false)
const detailContent = ref('')

const showDiffModal = ref(false)
const diffContent = ref('')

const loadStatus = async () => {
  try {
    const res = await gitApi.getGitStatus(projectId)
    status.value = res.data
  } catch (err) {
    console.error('获取状态失败:', err)
  }
}

const loadHistory = async () => {
  loading.value = true
  try {
    const res = await gitApi.getGitHistory(projectId)
    history.value = res.data || []
  } catch (err) {
    toast.error('获取历史失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadHistory()])
})

const handleCommit = async () => {
  committing.value = true
  try {
    const res = await gitApi.commitSnapshot(projectId, commitMessage.value)
    toast.success(res.data.message || '提交成功')
    showCommitModal.value = false
    commitMessage.value = ''
    await Promise.all([loadStatus(), loadHistory()])
  } catch (err) {
    toast.error('提交失败: ' + err.message)
  } finally {
    committing.value = false
  }
}

const handleRestore = async (commit) => {
  if (!confirm(`确定要恢复到版本 "${commit.message}" 吗？\n当前未提交的更改会先自动保存。`)) return
  restoringHash.value = commit.hash
  try {
    await gitApi.restoreSnapshot(projectId, commit.hash)
    toast.success('已恢复到指定版本')
    await Promise.all([loadStatus(), loadHistory()])
  } catch (err) {
    toast.error('恢复失败: ' + err.message)
  } finally {
    restoringHash.value = null
  }
}

const handleShowDetail = async (commit) => {
  try {
    const res = await gitApi.showSnapshot(projectId, commit.hash)
    detailContent.value = res.data.detail
    showDetailModal.value = true
  } catch (err) {
    toast.error('获取详情失败: ' + err.message)
  }
}

const handleDiff = async (commit1, commit2) => {
  try {
    const res = await gitApi.getDiff(projectId, commit2.hash, commit1.hash)
    diffContent.value = res.data.diff
    showDiffModal.value = true
  } catch (err) {
    toast.error('获取差异失败: ' + err.message)
  }
}

const handleDiscard = async () => {
  if (!confirm('确定要丢弃所有未提交的更改吗？\n此操作不可恢复！')) return
  try {
    await gitApi.discardChanges(projectId)
    toast.success('已丢弃所有更改')
    await loadStatus()
  } catch (err) {
    toast.error('丢弃失败: ' + err.message)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 0;
}

.header h1 {
  flex: 1;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.status-card {
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-title {
  font-weight: 500;
}

.changed-files {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  font-family: monospace;
}

.file-flag {
  width: 20px;
  text-align: center;
  font-weight: bold;
}

.file-flag.new { color: var(--success); }
.file-flag.deleted { color: var(--danger); }
.file-flag.modified { color: var(--warning); }

.more-files {
  color: var(--text-muted);
  font-size: 12px;
  padding-top: 8px;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commit-item {
  transition: all 0.2s;
}

.commit-item:hover {
  border-color: var(--primary);
}

.commit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.commit-message {
  font-weight: 500;
  flex: 1;
}

.commit-hash {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.commit-meta {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.commit-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-large {
  max-width: 800px;
}

.detail-content,
.diff-content {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 16px;
  overflow-x: auto;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-content pre,
.diff-content pre {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 640px) {
  .header {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
  }

  .commit-actions {
    flex-direction: column;
  }
}
</style>
