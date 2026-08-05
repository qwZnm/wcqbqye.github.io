// ===== 在线翻译独立页面脚本（实时翻译版）=====
let toastTimer;
let debounceTimer = null;
let translateSeq = 0; // 用于丢弃过期的翻译请求
let currentTranslateController = null; // 用于取消上一次还没结束的请求

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('toolbox_theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = isDark
      ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
}

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

// ===== 语言自动检测与提示 =====
function autoDetectAndHint() {
  const input = document.getElementById('transInput');
  const source = document.getElementById('transSourceLang');
  const target = document.getElementById('transTargetLang');
  const hint = document.getElementById('transHint');
  if (!input || !source || !target || !hint) return;
  const text = input.value.trim();
  if (!text || source.value !== 'auto') {
    hint.textContent = '实时翻译 · 输入即翻译';
    return;
  }
  if (containsChinese(text)) {
    target.value = 'en';
    hint.textContent = '检测到中文 → 自动译为英文';
  } else {
    target.value = 'zh-CN';
    hint.textContent = '检测到非中文 → 自动译为中文';
  }
}

// ===== 实时翻译入口（防抖 500ms）=====
function onInputChange() {
  autoDetectAndHint();
  scheduleTranslate(500);
}

function onLangChange() {
  autoDetectAndHint();
  scheduleTranslate(200);
}

function scheduleTranslate(delay = 500) {
  clearTimeout(debounceTimer);
  const input = document.getElementById('transInput');
  if (!input || !input.value.trim()) {
    translateSeq++;
    if (currentTranslateController) currentTranslateController.abort();
    const output = document.getElementById('transOutput');
    const status = document.getElementById('transStatus');
    if (output) output.value = '';
    if (status) status.textContent = '等待输入...';
    return;
  }
  debounceTimer = setTimeout(() => runTranslate(), delay);
}

// ===== 语言选择 =====
function getTranslateLangs(text) {
  const source = document.getElementById('transSourceLang')?.value || 'auto';
  const target = document.getElementById('transTargetLang')?.value || 'zh-CN';
  if (source !== 'auto') return { source, target };
  return containsChinese(text) ? { source: 'zh-CN', target: target || 'en' } : { source: 'auto', target: target || 'zh-CN' };
}

// ===== 翻译接口 =====
async function fetchWithTimeout(url, options = {}, timeout = 4500) {
  const controller = currentTranslateController;
  const timer = setTimeout(() => controller?.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller?.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleTranslate(text, source, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url, { cache: 'no-store' }, 4500);
  if (!res.ok) throw new Error(`翻译接口状态异常：${res.status}`);
  const data = await res.json();
  const translated = (data?.[0] || []).map(item => item?.[0] || '').join('');
  if (!translated) throw new Error('翻译结果为空');
  return translated;
}

async function fetchMyMemoryTranslate(text, source, target) {
  const langMap = { 'zh-CN': 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', de: 'de', auto: containsChinese(text) ? 'zh-CN' : 'en' };
  const from = langMap[source] || 'en';
  const to = langMap[target] || 'zh-CN';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const res = await fetchWithTimeout(url, { cache: 'no-store' }, 4500);
  if (!res.ok) throw new Error(`备用接口状态异常：${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText || '';
  if (!translated) throw new Error('备用接口结果为空');
  return translated;
}

// ===== 本地兜底词典 =====
function localFallbackTranslate(text, source, target) {
  const normalized = text.trim().toLowerCase();
  const zhToEn = {
    '你好': 'Hello', '你好，世界': 'Hello, world', '世界': 'World',
    '欢迎': 'Welcome', '欢迎使用': 'Welcome to use', '翻译': 'Translate',
    '在线翻译': 'Online translation', '工具': 'Tool', '工具箱': 'Toolbox',
    '谢谢': 'Thank you', '早上好': 'Good morning', '晚上好': 'Good evening',
    '再见': 'Goodbye', '我爱你': 'I love you', '中国': 'China',
    '英文': 'English', '中文': 'Chinese'
  };
  const enToZh = {
    'hello': '你好', 'hello, world': '你好，世界', 'world': '世界',
    'welcome': '欢迎', 'translate': '翻译', 'translation': '翻译',
    'online translation': '在线翻译', 'tool': '工具', 'toolbox': '工具箱',
    'thank you': '谢谢', 'good morning': '早上好', 'good evening': '晚上好',
    'goodbye': '再见', 'i love you': '我爱你', 'china': '中国',
    'english': '英文', 'chinese': '中文'
  };
  if ((target === 'en' || (!target && containsChinese(text))) && zhToEn[text.trim()]) return zhToEn[text.trim()];
  if ((target === 'zh-CN' || source === 'en') && enToZh[normalized]) return enToZh[normalized];
  if (containsChinese(text)) {
    let result = text;
    Object.keys(zhToEn).sort((a, b) => b.length - a.length).forEach(key => {
      result = result.replaceAll(key, zhToEn[key]);
    });
    if (result !== text) return result;
  } else {
    let result = normalized;
    Object.keys(enToZh).sort((a, b) => b.length - a.length).forEach(key => {
      result = result.replaceAll(key, enToZh[key]);
    });
    if (result !== normalized) return result;
  }
  return '';
}

// ===== 执行翻译（核心）=====
async function runTranslate() {
  const input = document.getElementById('transInput');
  const output = document.getElementById('transOutput');
  const status = document.getElementById('transStatus');
  if (!input || !output || !status) return;

  const text = input.value.trim();
  if (!text) {
    output.value = '';
    status.textContent = '等待输入...';
    return;
  }

  // 增加序列号，丢弃过期的翻译结果（用户快速输入时只保留最后一次）
  const seq = ++translateSeq;
  if (currentTranslateController) currentTranslateController.abort();
  currentTranslateController = new AbortController();
  autoDetectAndHint();
  const { source, target } = getTranslateLangs(text);
  status.textContent = '正在翻译...';

  let result = '';
  let usedApi = '';

  try {
    result = await fetchGoogleTranslate(text, source, target);
    usedApi = 'Google';
  } catch (err) {
    if (seq !== translateSeq) return; // 已过期，丢弃
    try {
      currentTranslateController = new AbortController();
      result = await fetchMyMemoryTranslate(text, source, target);
      usedApi = 'MyMemory';
    } catch (fallbackErr) {
      const localResult = localFallbackTranslate(text, source, target);
      if (localResult) {
        result = localResult;
        usedApi = '本地词典';
      } else {
        if (seq !== translateSeq) return;
        output.value = '';
        status.textContent = '翻译失败 · 接口超时或限流，请稍后重试';
        return;
      }
    }
  }

  // 只有最新的请求才写入结果
  if (seq !== translateSeq) return;
  output.value = result;
  const srcLabel = source === 'auto' ? '自动识别' : source;
  status.textContent = `${srcLabel} → ${target} · ${usedApi}`;
  currentTranslateController = null;
}

// ===== 交换语言 =====
function swapTranslateLangs() {
  const source = document.getElementById('transSourceLang');
  const target = document.getElementById('transTargetLang');
  const input = document.getElementById('transInput');
  const output = document.getElementById('transOutput');
  if (!source || !target || !input || !output) return;
  if (source.value === 'auto') source.value = containsChinese(input.value) ? 'zh-CN' : 'en';
  const oldSource = source.value;
  source.value = target.value;
  target.value = oldSource;
  if (output.value) {
    input.value = output.value;
  }
  autoDetectAndHint();
  scheduleTranslate(200);
}

// ===== 清空 =====
function clearTranslator() {
  const input = document.getElementById('transInput');
  const output = document.getElementById('transOutput');
  const status = document.getElementById('transStatus');
  clearTimeout(debounceTimer);
  translateSeq++;
  if (currentTranslateController) currentTranslateController.abort();
  if (input) input.value = '';
  if (output) output.value = '';
  if (status) status.textContent = '等待输入...';
  autoDetectAndHint();
}

// ===== 复制 =====
function copyTranslation() {
  const output = document.getElementById('transOutput');
  if (!output || !output.value) {
    showToast('没有可复制的译文');
    return;
  }
  navigator.clipboard.writeText(output.value).then(() => showToast('译文已复制')).catch(() => {
    output.select();
    document.execCommand('copy');
    showToast('译文已复制');
  });
}

// ===== 填入示例 =====
function fillTranslateDemo() {
  const input = document.getElementById('transInput');
  if (!input) return;
  input.value = '你好，欢迎使用在线翻译工具。';
  input.focus();
  onInputChange();
}

// ===== 初始化 =====
function initTranslatorPage() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
}

initTranslatorPage();
