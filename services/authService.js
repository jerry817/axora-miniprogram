/**
 * Client-side convenience checks. The authoritative whitelist check remains
 * in cloudfunctions/authUser and cloudfunctions/chatAI.
 */
const constants = require("../config/constants");

const USER_KEY = constants.STORAGE_KEY.USER;
const BLOCKED_MESSAGE = "抱歉，您未在白名单内，请联系开发者";
const LOGIN_REQUIRED_MESSAGE = "请在「我的」页面登录后使用";
const HOME_TAB_URL = "/pages/index/index";

function getUser() {
  try {
    return wx.getStorageSync(USER_KEY) || null;
  } catch (error) {
    return null;
  }
}

function isAuthorized() {
  const user = getUser();
  return !!(user && user.userId && user.isWhitelisted);
}

async function getAuthorization() {
  const response = await wx.cloud.callFunction({ name: "authUser" });
  const result = response && response.result;
  if (!result || !result.openid) {
    throw new Error((result && result.error) || "无法验证登录状态");
  }
  return result;
}

function showBlockedModal(onConfirm) {
  wx.showModal({
    title: "访问受限",
    content: BLOCKED_MESSAGE,
    showCancel: false,
    confirmText: "我知道了",
    success: (res) => {
      if (res.confirm && typeof onConfirm === "function") onConfirm();
    }
  });
}

function showLoginRequiredModal(onConfirm) {
  wx.showModal({
    title: "访问受限",
    content: LOGIN_REQUIRED_MESSAGE,
    showCancel: false,
    confirmText: "我知道了",
    success: (res) => {
      if (res.confirm && typeof onConfirm === "function") onConfirm();
    }
  });
}

/**
 * Checks the locally cached successful login. It never makes another cloud
 * authorization request, so an authenticated user can continue directly to
 * AI Chat and AI Tools for the rest of the session (and after relaunch).
 */
function requireAiAccess(options = {}) {
  if (isAuthorized()) {
    return true;
  }

  const user = getUser();
  if (user && user.userId) {
    showBlockedModal(options.onDenied);
  } else {
    showLoginRequiredModal(options.onDenied);
  }
  return false;
}

/**
 * Route-level guard for AI tab pages. A direct route to either protected page
 * is returned to Home after the user dismisses the access alert.
 */
function requireAiPageAccess() {
  return requireAiAccess({
    onDenied: () => wx.switchTab({ url: HOME_TAB_URL })
  });
}

/**
 * Handles a failed chatService response consistently across pages:
 * a NOT_WHITELISTED error shows the blocked modal, anything else shows a toast.
 */
function handleAiError(res, fallbackMessage) {
  if (res && res.code === "NOT_WHITELISTED") {
    showBlockedModal();
  } else {
    wx.showToast({ title: (res && res.error) || fallbackMessage, icon: "none" });
  }
}

module.exports = {
  BLOCKED_MESSAGE,
  getAuthorization,
  handleAiError,
  isAuthorized,
  requireAiAccess,
  requireAiPageAccess,
  showBlockedModal
};
