/**
 * 聊天历史记录服务
 * 使用小程序本地存储（wx.setStorageSync）持久化对话记录，
 * 供 chat / tools / history / mine 等页面统一读写，避免各页面重复实现存储逻辑。
 */
const constants = require("../config/constants");

const STORAGE_KEY = constants.STORAGE_KEY.HISTORY;

function getAll() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    console.error("读取聊天记录失败", e);
    return [];
  }
}

function getById(id) {
  return getAll().find((item) => item.id === id) || null;
}

function persist(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list);
  } catch (e) {
    console.error("保存聊天记录失败", e);
  }
}

/**
 * 新建一条历史记录
 * @param {{type:string, title:string, messages:Array}} record
 * @returns {{id:string, type:string, title:string, messages:Array, updateTime:number}} 创建后的完整记录
 */
function save(record) {
  const list = getAll();
  const newRecord = {
    id: `h_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: record.type || "chat",
    title: record.title || "新的对话",
    messages: record.messages || [],
    updateTime: Date.now()
  };
  list.unshift(newRecord);
  persist(list);
  return newRecord;
}

/**
 * 更新已存在记录的消息内容（例如多轮对话新增了消息）
 */
function update(id, messages) {
  const list = getAll();
  const target = list.find((item) => item.id === id);
  if (!target) {
    return null;
  }
  target.messages = messages;
  target.updateTime = Date.now();
  persist(list);
  return target;
}

function remove(id) {
  const list = getAll().filter((item) => item.id !== id);
  persist(list);
  return list;
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (e) {
    console.error("清空聊天记录失败", e);
  }
}

module.exports = {
  getAll,
  getById,
  save,
  update,
  remove,
  clear
};
