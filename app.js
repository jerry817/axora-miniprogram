App({
  globalData: {
    // 首页"对话建议"被点击后，暂存待发送的内容，供聊天页 onShow 时读取并自动发送
    pendingPrompt: "",
    // 历史记录页点击某条记录后，暂存其 id，供聊天页/工具页 onShow 时读取并还原完整对话
    pendingHistoryId: ""
  },

  onLaunch() {
    wx.cloud.init({
      env: "ai-assistant-d8g5sr9u4136fdbeb",
      traceUser: true
    });
  },

  onError(error) {
    console.error("小程序全局错误：", error);
  }
});
