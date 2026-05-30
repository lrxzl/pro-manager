import request from './request'

// 获取所有项目
export const getProjects = () => request.get('/projects')

// 获取单个项目
export const getProject = (id) => request.get(`/projects/${id}`)

// 创建项目
export const createProject = (data) => request.post('/projects', data)

// 更新项目（重命名）
export const updateProject = (id, data) => request.put(`/projects/${id}`, data)

// 删除项目
export const deleteProject = (id) => request.delete(`/projects/${id}`)

// 启动项目
export const startProject = (id, target = 'all') => request.post(`/projects/${id}/start`, { target })

// 停止项目
export const stopProject = (id, target = 'all') => request.post(`/projects/${id}/stop`, { target })

// 安装依赖
export const installProject = (id, target = 'frontend') => request.post(`/projects/${id}/install`, { target })

// 同步状态
export const syncProjectStatus = (id) => request.post(`/projects/${id}/sync`)

// 更新大小
export const updateProjectSize = (id) => request.get(`/projects/${id}/size`)
