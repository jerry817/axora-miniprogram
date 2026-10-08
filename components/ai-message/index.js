const { parseMessage } = require("../../utils/markdown");

Component({
  properties: {
    role: {
      type: String,
      value: "ai" // 默认A消息，避免无role时布局崩坏
    },
    content: {
      type: String,
      value: "",
      observer(newVal) {
        this.renderContent(newVal);
      }
    }
  },

  data: {
    segments: []
  },

  lifetimes: {
    attached() {
      this.renderContent(this.properties.content);
    }
  },

  methods: {
    // 将原始文本解析为「文本 / 代码块」片段，供 wxml 分别渲染
    renderContent(content) {
      this.setData({
        segments: parseMessage(content)
      });
    },

    // 复制代码块内容
    copyCode(e) {
      const { content } = e.currentTarget.dataset;
      if (!content) {
        return;
      }
      wx.setClipboardData({
        data: content,
        success() {
          wx.showToast({ title: "代码已复制", icon: "success" });
        }
      });
    }
  }
});
