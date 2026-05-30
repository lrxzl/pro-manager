import request from './request'

// 获取 git 状态
export const getGitStatus = (projectIndex) => request.get(`/git/${projectIndex}/status`)

// 获取提交历史
export const getGitHistory = (projectIndex, limit = 50) => request.get(`/git/${projectIndex}/history`, { params: { limit } })

// 提交（保存快照）
export const commitSnapshot = (projectIndex, message) => request.post(`/git/${projectIndex}/commit`, { message })

// 恢复到指定提交
export const restoreSnapshot = (projectIndex, hash) => request.post(`/git/${projectIndex}/restore/${hash}`)

// 查看提交详情
export const showSnapshot = (projectIndex, hash) => request.get(`/git/${projectIndex}/show/${hash}`)

// 查看差异
export const getDiff = (projectIndex, hash1, hash2) => request.get(`/git/${projectIndex}/diff`, { params: { hash1, hash2 } })

// 丢弃所有未提交更改
export const discardChanges = (projectIndex) => request.post(`/git/${projectIndex}/discard`)
