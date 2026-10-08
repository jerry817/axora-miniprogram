/** Unified AI calling service. */
const ai = require("../api/ai");
const prompts = require("../config/prompts");

async function send(messages, type = "chat") {
  const systemPrompt = prompts[type] || prompts.chat;
  const hasSystemMessage = messages.length > 0 && messages[0].role === "system";
  const fullMessages = hasSystemMessage
    ? messages
    : [{ role: "system", content: systemPrompt }, ...messages];

  try {
    const res = await ai.chat(fullMessages);
    if (res && res.success) {
      return { success: true, answer: res.answer };
    }
    return {
      success: false,
      error: (res && res.error) || "系统服务繁忙，请稍后再试",
      code: res && res.code
    };
  } catch (error) {
    return {
      success: false,
      error: (error && (error.errMsg || error.message)) || "网络异常，请稍后再试"
    };
  }
}

async function sendSingle(text, type) {
  return send([{ role: "user", content: text }], type);
}

module.exports = { send, sendSingle };
