<template>
  <div class="container">
    <header class="header">
      <button class="btn btn-outline" @click="goBack">← 返回</button>
      <button class="btn btn-outline" @click="goHome">🏠 首页</button>
      <h1>📁 文件管理</h1>
      <button class="btn btn-primary btn-sm" @click="refresh">刷新</button>
    </header>

    <!-- 面包屑 -->
    <div class="breadcrumb">
      <span
        v-for="(crumb, i) in breadcrumbs"
        :key="i"
        class="crumb"
        @click="navigateTo(crumb.path)"
      >
        {{ crumb.name }}
      </span>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <button class="btn btn-sm btn-outline" @click="showNewFileModal = true">📄 新建文件</button>
      <button class="btn btn-sm btn-outline" @click="showNewDirModal = true">📁 新建目录</button>
      <button class="btn btn-sm btn-outline" @click="showSearchModal = true">🔍 搜索</button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      加载中...
    </div>

    <div v-else class="file-list">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item card"
        @click="handleClick(file)"
        @contextmenu.prevent="showContextMenu($event, file)"
      >
        <div class="file-icon">{{ file.isDirectory ? '📁' : '📄' }}</div>
        <div class="file-info">
          <div class="file-name">{{ file.name }}</div>
          <div class="file-meta">
            <span v-if="!file.isDirectory">{{ formatSize(file.size) }}</span>
            <span v-if="file.modified">{{ formatDate(file.modified) }}</span>
          </div>
        </div>
        <div class="file-actions" @click.stop>
          <button class="btn btn-sm btn-outline" @click="handleRename(file)">✏️</button>
          <button class="btn btn-sm btn-outline" @click="handleDelete(file)">🗑️</button>
        </div>
      </div>

      <div v-if="files.length === 0" class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-text">空目录</div>
      </div>
    </div>

    <!-- 文件编辑器 -->
    <div v-if="editingFile" class="editor-overlay" @click.self="editingFile = null">
      <div class="editor-modal">
        <div class="editor-header">
          <span>{{ editingFile }}</span>
          <div class="editor-actions">
            <button class="btn btn-sm btn-primary" @click="saveFile" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button class="btn btn-sm btn-outline" @click="editingFile = null">关闭</button>
          </div>
        </div>
        <textarea v-model="editingContent" class="editor-content"></textarea>
      </div>
    </div>

    <!-- 新建文件弹窗 -->
    <div v-if="showNewFileModal" class="modal-overlay" @click.self="showNewFileModal = false">
      <div class="modal">
        <div class="modal-title">新建文件</div>
        <div class="form-group">
          <label>文件名</label>
          <input v-model="newFileName" placeholder="example.txt" @keyup.enter="createFile" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showNewFileModal = false">取消</button>
          <button class="btn btn-primary" @click="createFile" :disabled="!newFileName">创建</button>
        </div>
      </div>
    </div>

    <!-- 新建目录弹窗 -->
    <div v-if="showNewDirModal" class="modal-overlay" @click.self="showNewDirModal = false">
      <div class="modal">
        <div class="modal-title">新建目录</div>
        <div class="form-group">
          <label>目录名</label>
          <input v-model="newDirName" placeholder="new-folder" @keyup.enter="createDir" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showNewDirModal = false">取消</button>
          <button class="btn btn-primary" @click="createDir" :disabled="!newDirName">创建</button>
        </div>
      </div>
    </div>

    <!-- 搜索弹窗 -->
    <div v-if="showSearchModal" class="modal-overlay" @click.self="showSearchModal = false">
      <div class="modal">
        <div class="modal-title">搜索文件</div>
        <div class="form-group">
          <label>关键词</label>
          <input v-model="searchKeyword" placeholder="输入文件名关键词" @keyup.enter="doSearch" />
        </div>
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="result in searchResults"
            :key="result.path"
            class="search-item"
            @click="navigateToFile(result)"
          >
            <span>{{ result.isDirectory ? '📁' : '📄' }}</span>
            <span>{{ result.name }}</span>
            <span class="search-path">{{ result.path }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showSearchModal = false">关闭</button>
          <button class="btn btn-primary" @click="doSearch" :disabled="!searchKeyword">搜索</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as filesApi from '../api/files'
import * as projectsApi from '../api/projects'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const projectId = route.params.id
const project = ref(null)
const currentPath = ref('')
const files = ref([])
const loading = ref(false)

const editingFile = ref(null)
const editingContent = ref('')
const saving = ref(false)

const showNewFileModal = ref(false)
const newFileName = ref('')
const showNewDirModal = ref(false)
const newDirName = ref('')
const showSearchModal = ref(false)
const searchKeyword = ref('')
const searchResults = ref([])

const breadcrumbs = computed(() => {
  if (!currentPath.value) return []
  const parts = currentPath.value.split(/[/\\]/).filter(Boolean)
  // 从 pro-manager 开始显示，忽略前面的目录
  const rootIndex = parts.findIndex(p => p === 'pro-manager')
  const startIndex = rootIndex >= 0 ? rootIndex : 0
  const visibleParts = parts.slice(startIndex)
  return visibleParts.map((part, i) => ({
    name: part,
    path: parts.slice(0, startIndex + i + 1).join('/')
  }))
})

const loadProject = async () => {
  try {
    const res = await projectsApi.getProject(projectId)
    project.value = res.data
    currentPath.value = project.value.rootDir
    await loadFiles()
  } catch (err) {
    toast.error(err.message)
  }
}

const loadFiles = async () => {
  loading.value = true
  try {
    const res = await filesApi.listDir(currentPath.value)
    files.value = res.data || []
  } catch (err) {
    toast.error(err.message)
    files.value = []
  } finally {
    loading.value = false
  }
}

const refresh = () => loadFiles()

const navigateTo = (path) => {
  currentPath.value = path
  loadFiles()
}

const handleClick = (file) => {
  if (file.isDirectory) {
    navigateTo(file.path)
  } else {
    openFile(file.path)
  }
}

const openFile = async (filePath) => {
  try {
    const res = await filesApi.readFile(filePath)
    editingFile.value = filePath
    editingContent.value = res.data.content
  } catch (err) {
    toast.error(err.message)
  }
}

const saveFile = async () => {
  saving.value = true
  try {
    await filesApi.writeFile(editingFile.value, editingContent.value)
    toast.success('文件已保存')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

const handleRename = async (file) => {
  const newName = prompt('输入新名称:', file.name)
  if (!newName || newName === file.name) return
  try {
    await filesApi.renameFile(file.path, newName)
    toast.success('重命名成功')
    loadFiles()
  } catch (err) {
    toast.error(err.message)
  }
}

const handleDelete = async (file) => {
  if (!confirm(`确定要删除 "${file.name}" 吗？`)) return
  try {
    await filesApi.deleteFile(file.path)
    toast.success('删除成功')
    loadFiles()
  } catch (err) {
    toast.error(err.message)
  }
}

const createFile = async () => {
  if (!newFileName.value) return
  try {
    const filePath = currentPath.value + '/' + newFileName.value
    await filesApi.writeFile(filePath, '')
    toast.success('文件已创建')
    showNewFileModal.value = false
    newFileName.value = ''
    loadFiles()
  } catch (err) {
    toast.error(err.message)
  }
}

const createDir = async () => {
  if (!newDirName.value) return
  try {
    const dirPath = currentPath.value + '/' + newDirName.value
    await filesApi.createDir(dirPath)
    toast.success('目录已创建')
    showNewDirModal.value = false
    newDirName.value = ''
    loadFiles()
  } catch (err) {
    toast.error(err.message)
  }
}

const doSearch = async () => {
  if (!searchKeyword.value) return
  try {
    const res = await filesApi.searchFiles(currentPath.value, searchKeyword.value)
    searchResults.value = res.data || []
  } catch (err) {
    toast.error(err.message)
  }
}

const navigateToFile = (file) => {
  showSearchModal.value = false
  if (file.isDirectory) {
    navigateTo(file.path)
  } else {
    const dir = file.path.substring(0, file.path.lastIndexOf('/'))
    currentPath.value = dir
    loadFiles()
    openFile(file.path)
  }
}

const goBack = () => {
  if (project.value && currentPath.value === project.value.rootDir) {
    router.push(`/project/${projectId}`)
  } else {
    const parent = currentPath.value.substring(0, currentPath.value.lastIndexOf('/'))
    if (parent) {
      currentPath.value = parent
      loadFiles()
    }
  }
}

const goHome = () => {
  router.push(`/project/${projectId}`)
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// 检查是否有路径参数
onMounted(() => {
  const queryPath = route.query.path
  if (queryPath) {
    currentPath.value = queryPath
  }
  loadProject()
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 0;
}

.header h1 {
  flex: 1;
  font-size: 18px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  overflow-x: auto;
  font-size: 13px;
}

.crumb {
  cursor: pointer;
  color: var(--primary);
  white-space: nowrap;
}

.crumb:hover {
  text-decoration: underline;
}

.crumb::after {
  content: '/';
  margin-left: 4px;
  color: var(--text-muted);
}

.crumb:last-child::after {
  content: '';
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.file-item:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.file-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

/* 编辑器 */
.editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  z-index: 1000;
  padding: 20px;
}

.editor-modal {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  flex: 1;
  background: var(--bg);
  color: var(--text);
  border: none;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.search-results {
  max-height: 300px;
  overflow-y: auto;
  margin-top: 12px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.search-item:hover {
  background: var(--bg-hover);
}

.search-path {
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .file-actions {
    opacity: 1;
  }
}
</style>
