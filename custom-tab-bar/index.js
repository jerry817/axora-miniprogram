const authService = require("../services/authService");

const AI_PROTECTED_PAGES = ["pages/chat/chat", "pages/tools/tools"];

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "pages/index/index", icon: "/assets/icons/home.svg", activeIcon: "/assets/icons/home-active.svg" },
      { pagePath: "pages/chat/chat", icon: "/assets/icons/spark.svg", activeIcon: "/assets/icons/spark-active.svg" },
      { pagePath: "pages/tools/tools", icon: "/assets/icons/grid.svg", activeIcon: "/assets/icons/grid-active.svg" },
      { pagePath: "pages/history/history", icon: "/assets/icons/clock.svg", activeIcon: "/assets/icons/clock-active.svg" },
      { pagePath: "pages/mine/mine", icon: "/assets/icons/user.svg", activeIcon: "/assets/icons/user-active.svg" }
    ]
  },

  lifetimes: {
    // Resolve the real active tab before the first frame is painted, so a
    // freshly-created tab-bar instance never renders with the default
    // selected:0 (home) and then visibly slides over to the actual tab.
    attached() {
      this.syncSelected();
    }
  },

  pageLifetimes: {
    // Belt-and-braces: keep the pill in sync purely from the host page's
    // own lifecycle, independent of whether that page remembers to call
    // getTabBar().setSelected() in its onShow.
    show() {
      this.syncSelected();
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      if (!current) return;
      this.setSelected(current.route);
    },

    setSelected(pagePath) {
      const index = this.data.list.findIndex((item) => item.pagePath === pagePath);
      if (index !== -1 && index !== this.data.selected) this.setData({ selected: index });
    },

    onChange(event) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) return;

      // Keep the current tab selected and show the login alert in place when
      // a signed-out user taps either AI tab.
      if (AI_PROTECTED_PAGES.includes(item.pagePath) && !authService.requireAiAccess()) {
        return;
      }

      this.setData({ selected: index });
      wx.switchTab({ url: `/${item.pagePath}` });
    }
  }
});
