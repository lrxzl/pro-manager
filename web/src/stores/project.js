import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as projectsApi from '../api/projects'
import * as scaffoldsApi from '../api/scaffolds'

export const useProjectStore = defineStore('project', () => {
  const projects = ref([])
  const scaffolds = ref([])
  const loading = ref(false)
  const currentProject = ref(null)

  // 获取所有项目
  const fetchProjects = async () => {
    loading.value = true
    try {
      const res = await projectsApi.getProjects()
      projects.value = res.data || []
    } catch (err) {
      console.error('获取项目列表失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取手脚架列表
  const fetchScaffolds = async () => {
    try {
      const res = await scaffoldsApi.getScaffolds()
      scaffolds.value = res.data || []
    } catch (err) {
      console.error('获取手脚架列表失败:', err)
    }
  }

  // 获取单个项目
  const fetchProject = async (id) => {
    try {
      const res = await projectsApi.getProject(id)
      currentProject.value = res.data
      return res.data
    } catch (err) {
      console.error('获取项目详情失败:', err)
      throw err
    }
  }

  // 创建项目
  const createProject = async (data) => {
    try {
      const res = await projectsApi.createProject(data)
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('创建项目失败:', err)
      throw err
    }
  }

  // 重命名项目
  const renameProject = async (id, name) => {
    try {
      const res = await projectsApi.updateProject(id, { name })
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('重命名失败:', err)
      throw err
    }
  }

  // 删除项目
  const deleteProject = async (id) => {
    try {
      await projectsApi.deleteProject(id)
      await fetchProjects()
    } catch (err) {
      console.error('删除项目失败:', err)
      throw err
    }
  }

  // 启动项目
  const startProject = async (id, target) => {
    try {
      const res = await projectsApi.startProject(id, target)
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('启动项目失败:', err)
      throw err
    }
  }

  // 停止项目
  const stopProject = async (id, target) => {
    try {
      const res = await projectsApi.stopProject(id, target)
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('停止项目失败:', err)
      throw err
    }
  }

  // 安装依赖
  const installProject = async (id, target) => {
    try {
      const res = await projectsApi.installProject(id, target)
      return res.data
    } catch (err) {
      console.error('安装依赖失败:', err)
      throw err
    }
  }

  // 同步状态
  const syncStatus = async (id) => {
    try {
      const res = await projectsApi.syncProjectStatus(id)
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('同步状态失败:', err)
      throw err
    }
  }

  // 更新大小
  const updateSize = async (id) => {
    try {
      const res = await projectsApi.updateProjectSize(id)
      await fetchProjects()
      return res.data
    } catch (err) {
      console.error('更新大小失败:', err)
      throw err
    }
  }

  return {
    projects,
    scaffolds,
    loading,
    currentProject,
    fetchProjects,
    fetchScaffolds,
    fetchProject,
    createProject,
    renameProject,
    deleteProject,
    startProject,
    stopProject,
    installProject,
    syncStatus,
    updateSize
  }
})
