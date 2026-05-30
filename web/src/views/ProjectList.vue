<template>
  <div class="container">
    <header class="header">
      <h1>🚀 Pro Manager</h1>
      <button class="btn btn-primary" @click="showCreateModal = true">
        ＋ 创建项目
      </button>
    </header>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      加载中...
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div class="empty-state-text">还没有项目</div>
      <p>点击上方按钮创建第一个项目</p>
    </div>

    <div v-else class="project-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card card"
      >
        <div class="project-clickable" @click="$router.push(`/project/${project.id}`)">
          <div class="project-header">
            <div class="project-name">{{ project.projectName }}</div>
            <span :class="['badge', project.isRunning ? 'badge-success' : 'badge-danger']">
              {{ project.isRunning ? '运行中' : '已停止' }}
            </span>
          </div>

          <div class="project-info">
            <div class="info-item" v-if="project.frontend?.dir">
              <span class="info-label">前端</span>
              <span class="info-value">{{ project.frontend.language }} :{{project.frontend.port }}</span>
            </div>
            <div class="info-item" v-if="project.server?.dir">
              <span class="info-label">后端</span>
              <span class="info-value">{{ project.server.language }} :{{ project.server.port }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">大小</span>
              <span class="info-value">{{ formatSize(project.totalSize) }}（{{ formatSize(project.sourceSize) }}+{{ formatSize(project.depSize) }}）</span>
            </div>
          </div>
        </div>

        <div class="project-actions">
          <button
            v-if="!project.isRunning"
            class="btn btn-success btn-sm"
            :disabled="startingId === project.id"
            @click="handleStart(project)"
          >
            {{ startingId === project.id ? '启动中...' : '▶ 启动' }}
          </button>
          <button
            v-else
            class="btn btn-danger btn-sm"
            :disabled="stoppingId === project.id"
            @click="handleStop(project)"
          >
            {{ stoppingId === project.id ? '停止中...' : '■ 停止' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="handleRename(project)">
            ✏️
          </button>
          <button class="btn btn-outline btn-sm" @click="handleDelete(project)">
            🗑️
          </button>
        </div>

        <div v-if="project.isRunning" class="project-links">
          <a
            v-if="project.frontend?.dir && project.frontend.status === 'running'"
            :href="`http://localhost:${project.frontend.port}`"
            target="_blank"
            class="link"
            @click.stop
          >
            🌐 前端 :{{ project.frontend.port }}
          </a>
          <a
            v-if="project.server?.dir && project.server.status === 'running'"
            :href="`http://localhost:${project.server.port}`"
            target="_blank"
            class="link"
            @click.stop
          >
            ⚙️ 后端 :{{ project.server.port }}
          </a>
        </div>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-title">创建新项目</div>

        <div class="form-group">
          <label>项目名称</label>
          <input
            v-model="createForm.name"
            placeholder="输入项目名称"
            @keyup.enter="handleCreate"
          />
        </div>

        <div class="form-group">
          <label>项目类型</label>
          <div class="type-selector">
            <button
              v-for="t in projectTypes"
              :key="t.value"
              :class="['type-btn', { active: createForm.type === t.value }]"
              @click="createForm.type = t.value"
            >
              {{ t.icon }} {{ t.label }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>选择手脚架</label>
          <div class="scaffold-list">
            <div
              v-for="s in scaffolds"
              :key="s.name"
              :class="['scaffold-item', { active: createForm.scaffold === s.name }]"
              @click="createForm.scaffold = s.name"
            >
              <div class="scaffold-name">{{ s.name }}</div>
              <div class="scaffold-desc">{{ s.description }}</div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="showCreateModal = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!createForm.name || creating"
            @click="handleCreate"
          >
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useProjectStore } from '../stores/project'
import { useToast } from '../composables/useToast'

const router = useRouter()
const store = useProjectStore()
const toast = useToast()

const { projects, scaffolds, loading } = storeToRefs(store)

const showCreateModal = ref(false)
const creating = ref(false)
const startingId = ref(null)
const stoppingId = ref(null)

const projectTypes = [
  { value: 'app', label: '应用', icon: '📱' },
  { value: 'website', label: '网站', icon: '🌐' },
  { value: 'game', label: '游戏', icon: '🎮' }
]

const createForm = ref({
  name: '',
  type: 'app',
  scaffold: ''
})

onMounted(async () => {
  await Promise.all([
    store.fetchProjects(),
    store.fetchScaffolds()
  ])
  // 默认选中第一个手脚架
  if (scaffolds.value.length > 0 && !createForm.value.scaffold) {
    createForm.value.scaffold = scaffolds.value[0].name
  }
})

const handleCreate = async () => {
  if (!createForm.value.name) return
  creating.value = true
  try {
    await store.createProject(createForm.value)
    toast.success('项目创建成功')
    showCreateModal.value = false
    createForm.value = { name: '', type: 'app', scaffold: scaffolds.value[0]?.name || '' }
  } catch (err) {
    toast.error(err.message)
  } finally {
    creating.value = false
  }
}

const handleStart = async (project) => {
  startingId.value = project.id
  try {
    const result = await store.startProject(project.id)

    // 检查是否有部分失败
    const errors = []
    if (result.frontend?.error) errors.push(`前端: ${result.frontend.error}`)
    if (result.server?.error) errors.push(`后端: ${result.server.error}`)

    if (errors.length > 0) {
      toast.warning(`部分启动失败: ${errors.join(', ')}`)
    } else {
      toast.success('项目已启动')
    }
  } catch (err) {
    toast.error(`启动失败: ${err.message}`)
  } finally {
    startingId.value = null
  }
}

const handleStop = async (project) => {
  stoppingId.value = project.id
  try {
    await store.stopProject(project.id)
    toast.success('项目已停止')
  } catch (err) {
    toast.error(err.message)
  } finally {
    stoppingId.value = null
  }
}

const handleRename = async (project) => {
  const newName = prompt('输入新名称:', project.projectName)
  if (!newName || newName === project.projectName) return
  try {
    await store.renameProject(project.id, newName)
    toast.success('重命名成功')
  } catch (err) {
    toast.error(err.message)
  }
}

const handleDelete = async (project) => {
  if (!confirm(`确定要删除项目 "${project.projectName}" 吗？\n此操作不可恢复！`)) return
  try {
    await store.deleteProject(project.id)
    toast.success('项目已删除')
  } catch (err) {
    toast.error(err.message)
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.project-card {
}

.project-clickable {
  cursor: pointer;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}

.project-clickable:hover {
  background: var(--primary-bg);
  border-radius: var(--radius-sm);
  margin-left: -8px;
  margin-right: -8px;
  padding-left: 8px;
  padding-right: 8px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--text-muted);
  min-width: 32px;
}

.info-value {
  color: var(--text-secondary);
}

.project-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
}

.project-links {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.link {
  color: var(--primary);
  text-decoration: none;
  font-size: 13px;
}

.link:hover {
  text-decoration: underline;
}

/* 类型选择器 */
.type-selector {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.type-btn.active {
  border-color: var(--primary);
  background: var(--primary-bg);
  color: var(--primary);
}

/* 手脚架列表 */
.scaffold-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scaffold-item {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.scaffold-item:hover {
  border-color: var(--text-muted);
}

.scaffold-item.active {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.scaffold-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.scaffold-desc {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .project-grid {
    grid-template-columns: 1fr;
  }

  .type-selector {
    flex-direction: column;
  }
}
</style>
