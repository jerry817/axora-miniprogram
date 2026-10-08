const constants = require("../../config/constants");
const authService = require("../../services/authService");
const { VERSION } = require("../../config/constants.js");
const USER_KEY = constants.STORAGE_KEY.USER;
const PRIVACY_KEY = constants.STORAGE_KEY.PRIVACY_AGREED;

Page({
  data: {
    appName: constants.APP_NAME,
    version: constants.VERSION,
    isLoggedIn: false,
    userInfo: null, // { nickName, avatarUrl, userId, isWhitelisted }
    showPrivacyModal: false,
    showLoginModal: false,
    showVersionModal: false,
    showFeedbackModal: false,
    showAboutModal: false,
    showEasterModal: false,
    nicknameInput: "",
    selectedAvatarUrl: "",
    clickCount: 0,
    clickTimer: null,
    privacyParagraphs: [
      "选择登录时，我们会获取本小程序专属的用户 ID，仅用于核验白名单资格。",
      "微信已不再允许小程序直接读取用户的微信头像和昵称。您可自行选择头像并填写昵称，它们只用于本小程序内的身份展示。",
      "我们不会收集手机号、位置等其他敏感信息，也不会将您的头像、昵称或用户 ID 提供、共享或出售给任何第三方。",
      "相关信息仅保存在您的设备本地。您可以随时在「我的」页面点击「退出登录」，以及选择清空本地保存的信息。",
      "点击「同意并登录」即表示您已阅读并同意以上内容。"
    ],
    versionHistory: [
      {
        version: VERSION,
        tag: "当前版本",
        notes: [
          "优化导航栏",
          "增加使用限制条件"
        ]
      }
    ]
  },

  onShow() {
    this.restoreLoginState();
    this.updateTabBar();
  },

  restoreLoginState() {
    try {
      const userInfo = wx.getStorageSync(USER_KEY);
      // Cached profiles from the old version did not contain an OPENID and
      // therefore cannot prove whitelist status. Require one fresh login.
      if (userInfo && userInfo.nickName && userInfo.userId && userInfo.isWhitelisted) {
        this.setData({ isLoggedIn: true, userInfo });
      } else if (userInfo) {
        wx.removeStorageSync(USER_KEY);
      }
    } catch (e) {
      console.error("读取用户信息失败", e);
    }
  },

  onLoginTap() {
    if (this.data.isLoggedIn) return;
    let agreed = false;
    try {
      agreed = !!wx.getStorageSync(PRIVACY_KEY);
    } catch (e) {
      agreed = false;
    }
    if (agreed) {
      this.setData({ showLoginModal: true });
    } else {
      this.setData({ showPrivacyModal: true });
    }
  },

  onPrivacyCancel() {
    this.setData({ showPrivacyModal: false });
  },

  onAgreePrivacyAndLogin() {
    try {
      wx.setStorageSync(PRIVACY_KEY, true);
    } catch (e) {
      console.error("保存隐私协议同意状态失败", e);
    }
    this.setData({ showPrivacyModal: false, showLoginModal: true });
  },

  // wx.getUserProfile is no longer suitable for reading WeChat account data.
  // These supported controls let the user choose the display information.
  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl;
    if (avatarUrl) this.setData({ selectedAvatarUrl: avatarUrl });
  },

  onNicknameInput(e) {
    this.setData({ nicknameInput: e.detail.value || "" });
  },

  closeLoginModal() {
    this.setData({ showLoginModal: false, nicknameInput: "", selectedAvatarUrl: "" });
  },

  async doWeChatLogin() {
    const nickName = this.data.nicknameInput.trim();
    if (!nickName) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }

    wx.showLoading({ title: "验证登录中", mask: true });
    try {
      const auth = await authService.getAuthorization();
      if (!auth.allowed) {
        wx.hideLoading();
        this.closeLoginModal();
        authService.showBlockedModal();
        return;
      }

      const userInfo = {
        nickName,
        avatarUrl: await this.persistAvatar(this.data.selectedAvatarUrl),
        userId: auth.openid,
        isWhitelisted: true
      };
      wx.hideLoading();
      this.setData({ isLoggedIn: true, userInfo, showLoginModal: false });
      try {
        wx.setStorageSync(USER_KEY, userInfo);
      } catch (e) {
        console.error("保存用户信息失败", e);
      }
      wx.showToast({ title: "登录成功", icon: "success" });
    } catch (error) {
      wx.hideLoading();
      console.error("登录验证失败", error);
      wx.showModal({
        title: "登录失败",
        content: "无法连接白名单服务，请稍后重试。",
        showCancel: false
      });
    }
  },

  // chooseAvatar returns a temporary path. Saving it makes the selected avatar
  // available after the Mini Program is restarted whenever local storage lasts.
  persistAvatar(tempFilePath) {
    if (!tempFilePath) return Promise.resolve("/assets/images/logo.png");
    return new Promise((resolve) => {
      wx.saveFile({
        tempFilePath,
        success: (result) => resolve(result.savedFilePath || tempFilePath),
        fail: () => resolve(tempFilePath)
      });
    });
  },

  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后将不再展示您的头像和昵称，可随时重新登录",
      confirmColor: "#ff4d4f",
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync(USER_KEY);
          } catch (e) {
            console.error("清除用户信息失败", e);
          }
          this.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({ title: "已退出登录", icon: "none" });
        }
      }
    });
  },

  onCopyUserId() {
    if (!this.data.userInfo || !this.data.userInfo.userId) return;
    wx.setClipboardData({
      data: this.data.userInfo.userId,
      success: () => wx.showToast({ title: "用户 ID 已复制", icon: "success" })
    });
  },

  onFeedback() {
    this.setData({ showFeedbackModal: true });
  },

  closeFeedbackModal() {
    this.setData({ showFeedbackModal: false });
  },

  onVersionHistory() {
    this.setData({ showVersionModal: true });
  },

  closeVersionModal() {
    this.setData({ showVersionModal: false });
  },

  onAbout() {
    const count = this.data.clickCount + 1;
    this.setData({ clickCount: count });
    if (this.data.clickTimer) clearTimeout(this.data.clickTimer);
    const timer = setTimeout(() => {
      if (count >= 6) {
        this.setData({ showEasterModal: true });
      } else {
        this.setData({ showAboutModal: true });
      }
      this.setData({ clickCount: 0 });
    }, 360);
    this.setData({ clickTimer: timer });
  },

  closeAboutModal() {
    this.setData({ showAboutModal: false });
  },

  closeEasterModal() {
    this.setData({ showEasterModal: false });
  },

  updateTabBar() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected("pages/mine/mine");
  }
});
