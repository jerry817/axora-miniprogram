const chatService = require("../../services/chatService");
const historyService = require("../../services/historyService");
const authService = require("../../services/authService");

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "你好，我是Axora，今天想聊点什么。"
};

Page({
  data: {
    inputText: "",
    loading: false,
    scrollTop: 0,
    historyId: "",
    messages: [WELCOME_MESSAGE]
  },

  onReady() {
    this.scrollToBottom();
  },

  onShow() {
    // Prevent access through direct routes as well as through the tab bar.
    if (!authService.requireAiPageAccess()) return;

    this.updateTabBar();
    // 从历史记录页跳转进入时，恢复对应的历史对话
    this.consumePendingHistory();
    // 若首页"A 建议"跳转过来时携带了待发送内容，则自动填入并发送
    this.consumePendingPrompt();
  },

  consumePendingHistory() {
    const app = getApp();
    const historyId = app.globalData && app.globalData.pendingHistoryId;
    if (!historyId) {
      return;
    }
    // 取用后立即清空，避免下次切回聊天页时被重复读取
    app.globalData.pendingHistoryId = "";

    const record = historyService.getById(historyId);
    if (record && record.messages && record.messages.length) {
      this.setData({
        historyId: record.id,
        messages: record.messages
      });
      this.scrollToBottom();
    }
  },

  consumePendingPrompt() {
    const app = getApp();
    const prompt = app.globalData && app.globalData.pendingPrompt;
    if (!prompt) {
      return;
    }
    // 取用后立即清空，避免下次切回聊天页时被重复发送
    app.globalData.pendingPrompt = "";

    if (this.data.loading) {
      return;
    }

    this.setData({ inputText: prompt });
    this.sendMessage();
  },

  // 输入框变化
  onInput(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 让消息列表滚动到底部
  scrollToBottom() {
    this.setData({
      scrollTop: Date.now()
    });
  },

  // 发送消息
  async sendMessage() {
    const text = this.data.inputText;
    if (!text.trim() || this.data.loading) {
      return;
    }
    if (!authService.requireAiAccess()) return;

    const userMessage = { role: "user", content: text };
    const messages = [...this.data.messages, userMessage];

    this.setData({
      messages,
      inputText: "",
      loading: true
    });
    this.scrollToBottom();

    const res = await chatService.send(messages, "chat");

    if (res.success) {
      const nextMessages = [
        ...this.data.messages,
        { role: "assistant", content: res.answer }
      ];
      this.setData({ messages: nextMessages, loading: false });
      this.saveHistory(nextMessages);
    } else {
      this.setData({ loading: false });
      authService.handleAiError(res, "服务繁忙，请稍后再试");
    }

    this.scrollToBottom();
  },

  // 保存或更新聊天记录到本地历史
  saveHistory(messages) {
    if (this.data.historyId) {
      historyService.update(this.data.historyId, messages);
      return;
    }
    const firstUserMsg = messages.find((item) => item.role === "user");
    const record = historyService.save({
      type: "chat",
      title: firstUserMsg ? firstUserMsg.content.slice(0, 20) : "新的对话",
      messages
    });
    this.setData({ historyId: record.id });
  },

  // 点击"新对话"：把当前活跃会话存入历史记录，并重置为全新的对话状态
  startNewChat() {
    // 发送中不允许新建对话，避免状态错乱
    if (this.data.loading) {
      return;
    }

    const { messages } = this.data;
    const hasUserMessage = messages.some((item) => item.role === "user");
    // 只有当当前会话包含真实对话内容时才需要保存
    // （若上一次发送失败，用户消息可能还未被写入历史，这里做兜底保存）
    if (hasUserMessage) {
      this.saveHistory(messages);
    }

    this.setData({
      historyId: "",
      messages: [WELCOME_MESSAGE],
      inputText: ""
    });
    this.scrollToBottom();
  },

  updateTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected("pages/chat/chat");
  }
});
