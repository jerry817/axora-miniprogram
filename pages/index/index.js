// AI 建议候选池：涵盖写作、翻译、生活、知识等多种场景，
// 每次进入首页 / 点击"换一换"时随机抽取展示，帮助用户快速发起对话
const SUGGESTION_POOL = [
  { icon: "📝", text: "写一篇吸引人的小红书文章" },
  { icon: "🤔", text: "我们一生中会遇到多少人?" },
  { icon: "🍳", text: "教我做一道简单又美味的家常菜" },
  { icon: "💡", text: "用简单的话解释一下什么是黑洞" },
  { icon: "📮", text: "帮我起草一封得体的请假邮件" },
  { icon: "🎯", text: "如何在一周内养成早起的习惯" },
  { icon: "📚", text: "推荐三本值得一读的成长类书籍" },
  { icon: "✈️", text: "帮我写一条旅行主题的朋友圈文案" },
  { icon: "💰", text: "用通俗的语言讲讲复利是什么" },
  { icon: "🎤", text: "面试时如何做自我介绍比较好" },
  { icon: "🐱", text: "给我家的猫想三个有趣的名字" },
  { icon: "🎬", text: "推荐几部适合周末看的治愈系电影" },
  { icon: "💪", text: "帮我制定一份新手健身计划" },
  { icon: "🎁", text: "朋友生日送什么礼物比较有心意" },
  { icon: "🧘", text: "压力大的时候有什么缓解方法" },
  { icon: "⏱️", text: "生活中有哪些提高效率的小技巧" }
];

const SUGGESTION_COUNT = 4;

// A local pool keeps the banner available when the device is offline.
const QUOTE_POOL = [
  // 中文
  "千里之行，始于足下。", "不积跬步，无以至千里。", "学而不思则罔，思而不学则殆。",
  "己所不欲，勿施于人。", "天行健，君子以自强不息。", "海纳百川，有容乃大。",
  "知之为知之，不知为不知。", "行百里者半九十。", "读万卷书，行万里路。",
  "长风破浪会有时。", "山重水复疑无路，柳暗花明又一村。", "纸上得来终觉浅。",
  "静以修身，俭以养德。", "温故而知新。", "有志者事竟成。",
  "锲而不舍，金石可镂。", "尺有所短，寸有所长。", "见贤思齐焉。",
  "业精于勤，荒于嬉。", "路虽远，行则将至。", "积善成德，而神明自得。",
  "心之所向，素履以往。", "苟日新，日日新，又日新。", "不畏浮云遮望眼。",
  "星光不问赶路人。",
  // English
  "The journey begins with one step.", "Where there is a will, there is a way.", "Small steps add up.",
  "Make it happen.", "Stay hungry, stay curious.", "Dreams demand action.",
  "Progress, not perfection.", "Learn, then lead.", "Start before you are ready.",
  "Kindness is strength.", "Hope is a waking dream.", "Create your own light.",
  "Keep going.", "Believe in the work.", "Every day is a fresh start.",
  "Do one thing well.", "Curiosity opens doors.", "Practice makes progress.",
  "Focus on what matters.", "Growth lives beyond comfort.", "Tomorrow starts today.",
  "Be brave enough to begin.", "Let your work speak.", "Turn ideas into action.",
  "Make room for wonder.",
  // 한국어
  "천 리 길도 한 걸음부터.", "시작이 반이다.", "가는 말이 고와야 오는 말이 곱다.",
  "뜻이 있는 곳에 길이 있다.", "오늘 할 일을 내일로 미루지 말라.", "작은 물방울이 바위를 뚫는다.",
  "배움에는 끝이 없다.", "실패는 성공의 어머니.", "꿈은 행동에서 자란다.",
  "꾸준함이 답이다.", "나를 믿어라.", "천천히, 그러나 멈추지 말자.",
  "마음먹은 대로 된다.", "노력은 배신하지 않는다.", "용기는 한 걸음에서 시작된다.",
  "행복은 가까이에 있다.", "지금 이 순간에 집중하자.", "새로운 길은 발걸음으로 열린다.",
  "말보다 행동이 강하다.", "기회는 준비된 사람에게 온다.", "좋은 생각이 좋은 하루를 만든다.",
  "오늘의 내가 내일을 만든다.", "작은 친절이 큰 변화를 만든다.", "빛나는 하루를 만들자.",
  "자신만의 속도로 가자.",
  // 日本語
  "千里の道も一歩から。", "初心忘るべからず。", "七転び八起き。",
  "継続は力なり。", "急がば回れ。", "雨垂れ石を穿つ。",
  "為せば成る。", "案ずるより産むが易し。", "学問に王道なし。",
  "笑う門には福来る。", "一期一会。", "温故知新。",
  "石の上にも三年。", "明日は明日の風が吹く。", "自分を信じよう。",
  "今日という日を大切に。", "小さな一歩が未来を変える。", "挑戦は成長の種。",
  "心に光を灯そう。", "夢は行動で近づく。", "努力は未来をつくる。",
  "学びは旅の始まり。", "前を向いて進もう。", "新しい自分に出会おう。",
  "毎日が新しい始まり。"
];
const authService = require("../../services/authService");

function pickRandomSuggestions(count) {
  const pool = SUGGESTION_POOL.slice();
  const result = [];
  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

Page({
  data: {
    suggestionList: [],
    currentQuote: QUOTE_POOL[0],
    marqueeShouldScroll: false,
    marqueeDuration: "0s"
  },

  onShow() {
    this.refreshSuggestions();
    this.updateTabBar();
    this.setRandomQuote();
  },

  setRandomQuote() {
    const currentQuote = QUOTE_POOL[Math.floor(Math.random() * QUOTE_POOL.length)];
    // Render in its non-animated state first so its natural text width can be measured.
    this.setData({ currentQuote, marqueeShouldScroll: false, marqueeDuration: "0s" }, () => {
      wx.nextTick(() => this.updateMarqueeState());
    });
  },

  updateMarqueeState() {
    const query = wx.createSelectorQuery();
    query.select("#quoteMarqueeViewport").boundingClientRect();
    query.select("#quoteMarqueeContent").boundingClientRect();
    query.exec(([viewport, content]) => {
      if (!viewport || !content) return;

      const marqueeShouldScroll = content.width > viewport.width;
      // About 40px per second is readable while preserving a smooth CSS transform.
      const marqueeDuration = `${Math.max(8, Math.ceil((content.width + 32) / 40))}s`;
      this.setData({ marqueeShouldScroll, marqueeDuration });
    });
  },

  refreshSuggestions() {
    this.setData({ suggestionList: pickRandomSuggestions(SUGGESTION_COUNT) });
  },

  goChat() {
    if (!authService.requireAiAccess()) return;
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  goTool(e) {
    const { type } = e.currentTarget.dataset;
    if (type === "ocr") {
      wx.showToast({ title: "功能开发中，敬请期待", icon: "none" });
      return;
    }
    if (!authService.requireAiAccess()) return;
    wx.setStorageSync("selectedToolType", type);
    wx.switchTab({ url: "/pages/tools/tools" });
  },

  // 点击 AI 建议：跳转到聊天页，并让 AI 针对该建议自动生成回复
  openSuggestion(e) {
    const { text } = e.currentTarget.dataset;
    if (!text || !authService.requireAiAccess()) return;

    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.pendingPrompt = text;

    wx.switchTab({ url: "/pages/chat/chat" });
  },

  updateTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected("pages/index/index");
  }
});
