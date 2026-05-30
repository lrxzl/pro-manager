<template>
  <div class="container">
    <header class="header">
      <button class="btn btn-outline" @click="$router.push('/')">← 返回</button>
      <h1>{{ project?.projectName || '加载中...' }}</h1>
      <div></div>
    </header>

    <div v-if="!project" class="loading">
      <div class="spinner"></div>
      加载中...
    </div>

    <template v-else>
      <!-- 状态卡片 -->
      <div class="status-card card">
        <div class="status-header">
          <span :class="['badge', project.isRunning ? 'badge-success' : 'badge-danger']">
            {{ project.isRunning ? '运行中' : '已停止' }}
          </span>
          <span class="size">{{ formatSize(project.totalSize) }}（{{ formatSize(project.sourceSize) }}+{{ formatSize(project.depSize) }}）</span>
        </div>

        <div class="components">
          <div v-if="project.frontend" class="component">
            <div class="comp-header">
              <span class="comp-name">🌐 前端 ({{ project.frontend.language }})</span>
              <span :class="['badge', project.frontend.status === 'running' ? 'badge-success' : 'badge-danger']">
                {{ project.frontend.status === 'running' ? '运行中' : '已停止' }}
              </span>
            </div>
            <div class="comp-info">
              <span>端口: {{ project.frontend.port }}</span>
              <span>大小: {{ formatSize((project.frontend.size || 0) + (project.frontend.depSize || 0)) }}（{{ formatSize(project.frontend.size) }}+{{ formatSize(project.frontend.depSize) }}）</span>
            </div>
            <a
              v-if="project.frontend.status === 'running'"
              :href="`http://localhost:${project.frontend.port}`"
              target="_blank"
              class="link"
            >
              http://localhost:{{ project.frontend.port }}
            </a>
          </div>

          <div v-if="project.server" class="component">
            <div class="comp-header">
              <span class="comp-name">⚙️ 后端 ({{ project.server.language }})</span>
              <span :class="['badge', project.server.status === 'running' ? 'badge-success' : 'badge-danger']">
                {{ project.server.status === 'running' ? '运行中' : '已停止' }}
              </span>
            </div>
            <div class="comp-info">
              <span>端口: {{ project.server.port }}</span>
              <span>大小: {{ formatSize((project.server.size || 0) + (project.server.depSize || 0)) }}（{{ formatSize(project.server.size) }}+{{ formatSize(project.server.depSize) }}）</span>
            </div>
            <a
              v-if="project.server.status === 'running'"
              :href="`http://localhost:${project.server.port}`"
              target="_blank"
              class="link"
            >
              http://localhost:{{ project.server.port }}
            </a>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions-grid">
        <button
          class="action-btn card"
          :disabled="actionLoading"
          @click="handleStart"
        >
          <span class="action-icon">▶️</span>
          <span class="action-text">{{ project.isRunning ? '重启' : '启动' }}</span>
        </button>

        <button
          class="action-btn card"
          :disabled="actionLoading || !project.isRunning"
          @click="handleStop"
        >
          <span class="action-icon">⏹️</span>
          <span class="action-text">停止</span>
        </button>

        <button
          class="action-btn card"
          :disabled="actionLoading"
          @click="handleInstall"
        >
          <span class="action-icon">📦</span>
          <span class="action-text">安装依赖</span>
        </button>

        <button
          class="action-btn card"
          @click="$router.push(`/project/${id}/files`)"
        >
          <span class="action-icon">📁</span>
          <span class="action-text">文件管理</span>
        </button>

        <button
          class="action-btn card"
          @click="$router.push(`/project/${id}/git`)"
        >
          <span class="action-icon">💾</span>
          <span class="action-text">Git 快照</span>
        </button>

        <button
          class="action-btn card"
          @click="$router.push(`/project/${id}/terminal`)"
        >
          <span class="action-icon">💻</span>
          <span class="action-text">终端</span>
        </button>

        <button
          class="action-btn card"
          :disabled="actionLoading"
          @click="handleSync"
        >
          <span class="action-icon">🔄</span>
          <span class="action-text">同步状态</span>
        </button>

        <button
          class="action-btn card"
          :disabled="actionLoading"
          @click="handleUpdateSize"
        >
          <span class="action-icon">📊</span>
          <span class="action-text">更新大小</span>
        </button>
      </div>

      <!-- 运行日志 -->
      <div v-if="logOutput" class="log-card card">
        <div class="log-header">
          <span>运行日志</span>
          <button class="btn btn-sm btn-outline" @click="logOutput = ''">清空</button>
        </div>
        <pre class="log-content">{{ logOutput }}</pre>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useToast } from '../composables/useToast'

const route = useRoute()
const store = useProjectStore()
const toast = useToast()

const id = route.params.id
const project = ref(null)
const actionLoading = ref(false)
const logOutput = ref('')

const loadProject = async () => {
  try {
    project.value = await store.fetchProject(id)
  } catch (err) {
    toast.error(err.message)
  }
}

onMounted(loadProject)

const handleStart = async () => {
  actionLoading.value = true
  try {
    const result = await store.startProject(id)
    logOutput.value = JSON.stringify(result, null, 2)

    // 检查是否有部分失败
    const errors = []
    if (result.frontend?.error) errors.push(`前端: ${result.frontend.error}`)
    if (result.server?.error) errors.push(`后端: ${result.server.error}`)

    if (errors.length > 0) {
      toast.warning(`部分启动失败:\n${errors.join('\n')}`)
    } else {
      toast.success('项目已启动')
    }

    await loadProject()
  } catch (err) {
    toast.error(`启动失败: ${err.message}`)
  } finally {
    actionLoading.value = false
  }
}

const handleStop = async () => {
  actionLoading.value = true
  try {
    await store.stopProject(id)
    toast.success('项目已停止')
    await loadProject()
  } catch (err) {
    toast.error(err.message)
  } finally {
    actionLoading.value = false
  }
}

const handleInstall = async () => {
  actionLoading.value = true
  try {
    const result = await store.installProject(id)
    logOutput.value = result?.output || '安装完成'
    toast.success('依赖安装完成')
  } catch (err) {
    toast.error(err.message)
  } finally {
    actionLoading.value = false
  }
}

const handleSync = async () => {
  actionLoading.value = true
  try {
    await store.syncStatus(id)
    await loadProject()
    toast.success('状态已同步')
  } catch (err) {
    toast.error(err.message)
  } finally {
    actionLoading.value = false
  }
}

const handleUpdateSize = async () => {
  actionLoading.value = true
  try {
    await store.updateSize(id)
    await loadProject()
    toast.success('大小已更新')
  } catch (err) {
    toast.error(err.message)
  } finally {
    actionLoading.value = false
  }
}

const formatSize = (mb) => {
  if (!mb || mb === 0) return '0 KB'
  if (mb < 0.01) return '< 0.01 MB'
  if (mb < 1) return (mb * 1024).toFixed(0) + ' KB'
  return mb.toFixed(2) + ' MB'
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 0;
}

.header h1 {
  flex: 1;
  font-size: 20px;
}

.status-card {
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.size {
  font-size: 14px;
  color: var(--text-secondary);
}

.components {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.component {
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comp-name {
  font-weight: 500;
}

.comp-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.link {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
}

.link:hover {
  text-decoration: underline;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  border-radius: var(--radius);
}

.action-btn:hover:not(:disabled) {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 24px;
}

.action-text {
  font-size: 13px;
  font-weight: 500;
}

.log-card {
  margin-top: 20px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.log-content {
  background: var(--bg);
  padding: 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 640px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
