const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// 确保 data 目录存在
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// 读取数据库
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultDB = { items: [], nextId: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { items: [], nextId: 1 };
  }
}

// 写入数据库
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// 初始化数据库
function initDB() {
  readDB();
  return { items: [], nextId: 1 };
}

// 获取所有项目
function getAll(table) {
  const db = readDB();
  return db[table] || [];
}

// 获取单个项目
function getById(table, id) {
  const db = readDB();
  return (db[table] || []).find(item => item.id === id);
}

// 创建项目
function create(table, data) {
  const db = readDB();
  if (!db[table]) db[table] = [];
  const item = {
    id: db.nextId++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db[table].push(item);
  writeDB(db);
  return item;
}

// 更新项目
function update(table, id, data) {
  const db = readDB();
  if (!db[table]) return null;
  const index = db[table].findIndex(item => item.id === id);
  if (index === -1) return null;
  db[table][index] = {
    ...db[table][index],
    ...data,
    updated_at: new Date().toISOString()
  };
  writeDB(db);
  return db[table][index];
}

// 删除项目
function remove(table, id) {
  const db = readDB();
  if (!db[table]) return false;
  const index = db[table].findIndex(item => item.id === id);
  if (index === -1) return false;
  db[table].splice(index, 1);
  writeDB(db);
  return true;
}

module.exports = {
  initDB,
  getAll,
  getById,
  create,
  update,
  remove
};
