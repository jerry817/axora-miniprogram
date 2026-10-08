/**
 * 底层 A 调用接口：直接调用 chatA 云函数。
 * 页面/组件请优先通过 services/chatService 调用（会自动注入 system prompt、
 * 统一错误结构），而不是直接依赖这里的原始返回结构。
 */
const chat = async (messages) => {
  const res = await wx.cloud.callFunction({
    name: "chatAI",
    data: {
      messages
    }
  });

  return res.result;
};

module.exports = {
  chat
};