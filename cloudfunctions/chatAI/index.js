const cloud = require('wx-server-sdk')
const OpenAI = require('openai')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// DEEPSEEK_KEY 需要在云函数「环境变量」中配置，切勿把密钥硬编码在代码里
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_KEY,
  baseURL: 'https://api.deepseek.com'
})

// 请求超时时间（毫秒）。云函数默认最长执行时间通常是 20s，这里留出余量。
const REQUEST_TIMEOUT_MS = 12000

// DeepSeek 调用失败或超时时使用的本地兜底回复（每次随机挑一条）。
// 内容保持通用、友好，绝不把真实错误信息（密钥、网络细节等）透传给用户。
const FALLBACK_REPLIES = [
  "这个问题很值得深入思考，我们可以换个角度继续探索。",
  "你的问题已经收到，尝试从更多维度整理一下思路。",
  "这是一个不错的话题，不妨先从关键点开始梳理。",
  "有些问题需要一点时间沉淀，或许会有新的发现。",
  "这个方向很有意思，可以继续展开聊聊。",
  "每个问题背后都有更多可能，继续深入看看吧。",
  "换一个视角，也许会发现不一样的答案。"
]

function pickFallbackReply() {
  const index = Math.floor(Math.random() * FALLBACK_REPLIES.length)
  return FALLBACK_REPLIES[index]
}

// 调用 DeepSeek，并用 Promise.race 强制加上超时：
// 只要 REQUEST_TIMEOUT_MS 内没有返回结果，就当作失败处理，走本地兜底回复。
function createChatCompletion(messages) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`DeepSeek request timed out after ${REQUEST_TIMEOUT_MS}ms`))
    }, REQUEST_TIMEOUT_MS)
  })

  const request = client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: 2000
  })

  return Promise.race([request, timeout])
}

exports.main = async (event) => {
  try {
    // The server is the final authority: a modified client cannot call the AI
    // service unless the caller's WeChat OPENID is explicitly enabled.
    const { OPENID } = cloud.getWXContext()
    
    const enableWhitelist =
  process.env.ENABLE_WHITELIST !== "false";


if (enableWhitelist) {

  const whitelist = await cloud.database()
    .collection('ai_whitelist')
    .where({
      _id: OPENID,
      enabled: true
    })
    .get();


  if (!whitelist.data.length) {

    return {
      success:false,
      code:"NOT_WHITELISTED",
      error:"抱歉，您未在白名单内，请联系开发者"
    };

  }
}

    const messages = event && event.messages

    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: 'messages 参数不能为空'
      }
    }

    let response
    try {
      response = await createChatCompletion(messages)
    } catch (apiError) {
      // API 调用失败或超时：只记录真实原因到日志，前端只看到友好的本地兜底回复
      console.error('chatAI DeepSeek call failed or timed out, using fallback reply:', apiError)
      return {
        success: true,
        answer: pickFallbackReply(),
        fallback: true
      }
    }

    const choice = response.choices && response.choices[0]

    if (!choice || !choice.message || !choice.message.content) {
      console.error('chatAI received an empty response from DeepSeek, using fallback reply')
      return {
        success: true,
        answer: pickFallbackReply(),
        fallback: true
      }
    }

    return {
      success: true,
      answer: choice.message.content
    }
  } catch (error) {
    // 这里捕获的是白名单校验、参数解析等云函数自身的意外错误，
    // 属于需要开发者关注的问题，所以仍然如实返回 success: false。
    console.error('chatAI cloud function error:', error)
    return {
      success: false,
      error: error.message || 'Axora 服务调用失败'
    }
  }
}
