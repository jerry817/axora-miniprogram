const chatService = require("../../services/chatService");
const historyService = require("../../services/historyService");
const authService = require("../../services/authService");

const TABS = [
  {
    type: "writer",
    icon: "✍️",
    label: "辅助写作",
    placeholder: "请输入写作主题或要求，例如：帮我写一份产品发布会邀请函"
  },
  {
    type: "translator",
    icon: "🌍",
    label: "文本翻译",
    placeholder: "请输入需要翻译的内容"
  },
  {
    type: "summary",
    icon: "📄",
    label: "文档总结",
    placeholder: "请粘贴需要总结的长文本内容"
  }
];

// 支持的语言列表
const LANGUAGES = [
  "中文 (简体)",
  "中文 (繁体)",
  "英语",
  "日语",
  "韩语",
  "法语",
  "德语",
  "西班牙语",
  "俄语",
  "葡萄牙语",
  "意大利语",
  "阿拉伯语"
];

// 语气选项
const TONES = ["非正式", "正式", "商务", "学术"];

function findTab(type) {
  return TABS.find((t) => t.type === type) || TABS[0];
}

Page({
  data: {
    tabs: TABS,
    activeType: "writer",
    activeTab: TABS[0],
    inputText: "",
    resultText: "",
    loading: false,
    historyId: "",
    // 翻译相关
    languages: LANGUAGES,
    sourceLangIndex: 2, // 默认英语
    targetLangIndex: 0, // 默认中文简体
    tones: TONES,
    toneIndex: 0 // 默认非正式
  },

  onShow() {
    // Prevent access through direct routes as well as through the tab bar.
    if (!authService.requireAiPageAccess()) return;

    this.updateTabBar();
    // 从历史记录页跳转进入，回显对应的输入/输出
    this.consumePendingHistory();
    // 从首页或其他tabBar页面跳转过来时，读取选中的工具类型
    const selectedType = wx.getStorageSync("selectedToolType");
    if (selectedType && TABS.some((t) => t.type === selectedType)) {
      this.setData({
        activeType: selectedType,
        activeTab: findTab(selectedType),
        inputText: "",
        resultText: "",
        historyId: ""
      });
      wx.removeStorageSync("selectedToolType");
    }
  },

  consumePendingHistory() {
    const app = getApp();
    const historyId = app.globalData && app.globalData.pendingHistoryId;
    if (!historyId) {
      return;
    }
    // 取用后立即清空，避免下次切回工具页时被重复读取
    app.globalData.pendingHistoryId = "";

    const record = historyService.getById(historyId);
    if (record) {
      const userMsg = (record.messages || []).find((m) => m.role === "user");
      const aiMsg = (record.messages || []).find((m) => m.role === "assistant");
      this.setData({
        activeType: record.type,
        activeTab: findTab(record.type),
        historyId: record.id,
        inputText: userMsg ? userMsg.content : "",
        resultText: aiMsg ? aiMsg.content : ""
      });
    }
  },

  onTabChange(e) {
    const { type } = e.currentTarget.dataset;
    if (type === this.data.activeType) {
      return;
    }
    this.setData({
      activeType: type,
      activeTab: findTab(type),
      inputText: "",
      resultText: "",
      historyId: ""
    });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 源语言选择
  onSourceLangChange(e) {
    this.changeLang("sourceLangIndex", "targetLangIndex", parseInt(e.detail.value));
  },

  // 目标语言选择
  onTargetLangChange(e) {
    this.changeLang("targetLangIndex", "sourceLangIndex", parseInt(e.detail.value));
  },

  // 语言选择的共用逻辑：与另一侧语言相同时自动交换，若已有译文则重新翻译
  changeLang(field, otherField, index) {
    const update = { [field]: index };
    if (index === this.data[otherField]) {
      update[otherField] = this.data[field];
    }
    this.setData(update);
    if (this.data.inputText && this.data.resultText) {
      this.onTranslate();
    }
  },

  // 交换源语言和目标语言
  swapLanguages() {
    const sourceIdx = this.data.sourceLangIndex;
    const targetIdx = this.data.targetLangIndex;
    const input = this.data.inputText;
    const result = this.data.resultText;
    
    this.setData({
      sourceLangIndex: targetIdx,
      targetLangIndex: sourceIdx,
      inputText: result,
      resultText: input
    });
  },

  // 语气选择
  onToneChange(e) {
    this.setData({ toneIndex: parseInt(e.detail.value) });
    if (this.data.inputText && this.data.resultText) {
      this.onTranslate();
    }
  },

  // 翻译功能
  async onTranslate() {
    const text = this.data.inputText.trim();
    if (!text || this.data.loading) {
      return;
    }
    if (!authService.requireAiAccess()) return;

    this.setData({ loading: true, resultText: "" });

    const sourceLang = LANGUAGES[this.data.sourceLangIndex];
    const targetLang = LANGUAGES[this.data.targetLangIndex];
    const tone = TONES[this.data.toneIndex];
    
    // 构造精确的翻译指令
    const prompt = `请将以下${sourceLang}文本翻译成${targetLang}，语气风格：${tone}。请直接输出翻译结果，不要添加任何解释、说明或额外内容。

原文：
${text}`;

    const res = await chatService.sendSingle(prompt, "translator");

    if (res.success) {
      // 清理可能的多余说明文字
      let answer = res.answer.trim();
      // 移除可能的"翻译结果："等前缀
      answer = answer.replace(/^翻译结果[：:]\s*/i, "");
      answer = answer.replace(/^译文[：:]\s*/i, "");
      
      this.setData({ resultText: answer, loading: false });
      this.saveHistory(text, answer);
    } else {
      this.setData({ loading: false });
      authService.handleAiError(res, "翻译失败，请重试");
    }
  },

  async onGenerate() {
    // 翻译模式使用专门的onTranslate方法
    if (this.data.activeType === "translator") {
      this.onTranslate();
      return;
    }

    const text = this.data.inputText.trim();
    if (!text || this.data.loading) {
      return;
    }
    if (!authService.requireAiAccess()) return;

    this.setData({ loading: true, resultText: "" });

    const res = await chatService.sendSingle(text, this.data.activeType);

    if (res.success) {
      this.setData({ resultText: res.answer, loading: false });
      this.saveHistory(text, res.answer);
    } else {
      this.setData({ loading: false });
      authService.handleAiError(res, "生成失败，请重试");
    }
  },

  // 保存本次生成结果到历史记录
  saveHistory(inputText, answer) {
    const tab = findTab(this.data.activeType);
    const record = historyService.save({
      type: this.data.activeType,
      title: `${tab.label}：${inputText.slice(0, 16)}`,
      messages: [
        { role: "user", content: inputText },
        { role: "assistant", content: answer }
      ]
    });
    this.setData({ historyId: record.id });
  },

  onCopyResult() {
    if (!this.data.resultText) {
      return;
    }
    wx.setClipboardData({
      data: this.data.resultText,
      success: () => wx.showToast({ title: "已复制", icon: "success" })
    });
  },

  updateTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected("pages/tools/tools");
  }
});
