/**
 * 轻量级 Markdown 解析工具
 * 用于 a-message 组件渲染 Axora 回复内容：
 * - 将内容切分为「普通文本」与「代码块」两类片段
 * - 普通文本片段进一步转换为 rich-text 可识别的 HTML 字符串，
 *   支持标题 / 列表 / 加粗 / 斜体 / 行内代码 / 换行
 *
 * 注意：小程序不支持任意第三方 DOM/HTML 解析库，这里用正则实现一个
 * 满足聊天场景需要的最小可用子集，而不是完整的 Markdown 规范。
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 解析单行/单段文本中的行内语法：行内代码、加粗、斜体
function inlineToHtml(text) {
  let html = escapeHtml(text);

  // 行内代码 `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  // 加粗 **text**
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  // 斜体 *text*
  html = html.replace(/\*([^*\n]+)\*/g, "<i>$1</i>");
  // 换行
  html = html.replace(/\n/g, "<br/>");

  return html;
}

// 解析不含代码块的一段 Markdown 文本，生成 HTML 字符串
function blockToHtml(text) {
  const lines = text.split("\n");
  const htmlParts = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      const items = listBuffer.map((li) => `<li>${inlineToHtml(li)}</li>`).join("");
      htmlParts.push(`<ul class="md-list">${items}</ul>`);
      listBuffer = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList();
      const level = Math.min(trimmed.match(/^#+/)[0].length, 3);
      const content = trimmed.replace(/^#{1,3}\s+/, "");
      htmlParts.push(`<h${level} class="md-heading">${inlineToHtml(content)}</h${level}>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      htmlParts.push(`<p class="md-p">${inlineToHtml(line)}</p>`);
    }
  });

  flushList();
  return htmlParts.join("");
}

/**
 * 将一条消息内容解析为渲染片段数组
 * 返回形如：
 *   [{ type: 'text', html: '<p>...</p>' }, { type: 'code', lang: 'js', content: '...' }]
 */
function parseMessage(content) {
  if (!content) {
    return [];
  }

  const segments = [];
  const codeFenceRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeFenceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      if (textPart.trim()) {
        segments.push({ type: "text", html: blockToHtml(textPart) });
      }
    }

    segments.push({
      type: "code",
      lang: match[1] || "text",
      content: match[2].replace(/\n$/, "")
    });

    lastIndex = codeFenceRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    const textPart = content.slice(lastIndex);
    if (textPart.trim()) {
      segments.push({ type: "text", html: blockToHtml(textPart) });
    }
  }

  // 没有匹配到任何片段（极端情况）时，兜底整体作为文本处理
  if (segments.length === 0) {
    segments.push({ type: "text", html: blockToHtml(content) });
  }

  return segments;
}

module.exports = {
  parseMessage
};
