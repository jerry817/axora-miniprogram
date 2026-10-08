const historyService = require("../../services/historyService");
const constants = require("../../config/constants");

const TYPE_LABEL = {
  chat: "Axora对话",
  writer: "辅助写作",
  translator: "文本翻译",
  summary: "文档总结"
};

Page({
  data: {
    list: [],
    visibleList: [],
    page: 1,
    isEmpty: false
  },

  onShow() {
    this.loadHistory();
    this.updateTabBar();
  },

  onPullDownRefresh() {
    this.loadHistory();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多（本地数据分页展示，呼应 constants 中的 PAGE_SIZE）
  onReachBottom() {
    const { list, visibleList, page } = this.data;
    if (visibleList.length >= list.length) {
      return;
    }
    const nextPage = page + 1;
    this.setData({
      page: nextPage,
      visibleList: list.slice(0, nextPage * constants.PAGE_SIZE)
    });
  },

  loadHistory() {
    const list = historyService.getAll().map((item) => ({
      id: item.id,
      type: item.type,
      typeLabel: TYPE_LABEL[item.type] || "AI对话",
      title: item.title,
      preview: this.getPreview(item.messages),
      timeText: this.formatTime(item.updateTime)
    }));

    this.setData({
      list,
      visibleList: list.slice(0, constants.PAGE_SIZE),
      page: 1,
      isEmpty: list.length === 0
    });
  },

  getPreview(messages) {
    if (!messages || !messages.length) {
      return "";
    }
    const last = messages[messages.length - 1];
    const text = (last.content || "").replace(/\n/g, " ");
    return text.length > 40 ? `${text.slice(0, 40)}...` : text;
  },

  formatTime(timestamp) {
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  onOpenItem(e) {
    const { id, type } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.pendingHistoryId = id;

    // chat 和 tools 都是 tabBar 页面，不能用 wx.navigateTo 跳转，需用 wx.switchTab
    if (type === "chat") {
      wx.switchTab({ url: "/pages/chat/chat" });
    } else {
      wx.switchTab({ url: "/pages/tools/tools" });
    }
  },

  onDeleteItem(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: "删除记录",
      content: "确定要删除这条聊天记录吗？",
      success: (res) => {
        if (res.confirm) {
          historyService.remove(id);
          this.loadHistory();
        }
      }
    });
  },

  onClearAll() {
    if (!this.data.list.length) {
      return;
    }
    wx.showModal({
      title: "清空历史",
      content: "将删除全部聊天记录，且无法恢复",
      success: (res) => {
        if (res.confirm) {
          historyService.clear();
          this.loadHistory();
        }
      }
    });
  },

  updateTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected("pages/history/history");
  }
});
