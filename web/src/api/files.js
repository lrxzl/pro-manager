import request from './request'

// 列出目录
export const listDir = (path) => request.get('/files/list', { params: { path } })

// 读取文件
export const readFile = (path) => request.get('/files/read', { params: { path } })

// 写入文件
export const writeFile = (path, content) => request.post('/files/write', { path, content })

// 创建目录
export const createDir = (path) => request.post('/files/mkdir', { path })

// 删除
export const deleteFile = (path) => request.post('/files/delete', { path })

// 重命名
export const renameFile = (path, newName) => request.post('/files/rename', { path, newName })

// 复制
export const copyFile = (src, dest) => request.post('/files/copy', { src, dest })

// 移动
export const moveFile = (src, dest) => request.post('/files/move', { src, dest })

// 搜索
export const searchFiles = (path, keyword) => request.get('/files/search', { params: { path, keyword } })

// 获取目录大小
export const getDirSize = (path) => request.get('/files/size', { params: { path } })
