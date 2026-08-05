// ===== 字符串加解密独立页面脚本 =====
let toastTimer;

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

function updateCryptoMode() {
  const mode = document.getElementById('cryptoMode')?.value || 'hash';
  const hashType = document.getElementById('hashType');
  const hint = document.getElementById('cryptoHint');
  if (hashType) hashType.style.display = mode === 'hash' ? 'block' : 'none';
  if (!hint) return;
  if (mode === 'hash') hint.textContent = 'Hash 使用在线接口；Hash 结果不可逆，不能解密。';
  else if (mode === 'base64-encode') hint.textContent = '将普通字符串编码为 Base64。';
  else if (mode === 'base64-decode') hint.textContent = '将 Base64 内容解码为普通字符串。';
  else if (mode === 'url-encode') hint.textContent = '将字符串转换为 URL 安全编码。';
  else if (mode === 'url-decode') hint.textContent = '将 URL 编码内容还原为普通字符串。';
}

async function fetchHash(text, type) {
  const url = `https://v2.xxapi.cn/api/hash?type=${encodeURIComponent(type)}&text=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`接口请求失败：${res.status}`);
    const data = await res.json();
    if (data.code !== 200 || !data.data) throw new Error(data.msg || '接口返回异常');
    return data.data;
  } finally {
    clearTimeout(timer);
  }
}

function encodeBase64Unicode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64Unicode(text) {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function runCrypto() {
  const input = document.getElementById('cryptoInput');
  const output = document.getElementById('cryptoOutput');
  const status = document.getElementById('cryptoStatus');
  const mode = document.getElementById('cryptoMode')?.value || 'hash';
  const text = input?.value || '';
  if (!input || !output || !status) return;
  if (!text.trim()) {
    showToast('请输入要处理的字符串');
    return;
  }

  status.textContent = '正在处理...';
  output.value = '';

  try {
    let result = '';
    if (mode === 'hash') {
      const type = document.getElementById('hashType')?.value || 'md5';
      result = await fetchHash(text, type);
      status.textContent = `${type.toUpperCase()} · 在线接口`;
    } else if (mode === 'base64-encode') {
      result = encodeBase64Unicode(text);
      status.textContent = 'Base64 编码完成';
    } else if (mode === 'base64-decode') {
      result = decodeBase64Unicode(text);
      status.textContent = 'Base64 解码完成';
    } else if (mode === 'url-encode') {
      result = encodeURIComponent(text);
      status.textContent = 'URL 编码完成';
    } else if (mode === 'url-decode') {
      result = decodeURIComponent(text);
      status.textContent = 'URL 解码完成';
    }
    output.value = result;
  } catch (err) {
    const msg = err?.name === 'AbortError' ? '接口超时，请稍后重试' : (err?.message || '处理失败');
    status.textContent = msg;
    showToast(msg);
  }
}

function clearCrypto() {
  const input = document.getElementById('cryptoInput');
  const output = document.getElementById('cryptoOutput');
  const status = document.getElementById('cryptoStatus');
  if (input) input.value = '';
  if (output) output.value = '';
  if (status) status.textContent = '请选择功能并点击开始处理。';
}

function copyCryptoResult() {
  const output = document.getElementById('cryptoOutput');
  if (!output || !output.value) {
    showToast('没有可复制的结果');
    return;
  }
  navigator.clipboard.writeText(output.value).then(() => showToast('结果已复制')).catch(() => {
    output.select();
    document.execCommand('copy');
    showToast('结果已复制');
  });
}

function fillCryptoDemo() {
  const input = document.getElementById('cryptoInput');
  if (!input) return;
  input.value = '123456';
  input.focus();
}

function initCryptoPage() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  updateCryptoMode();
}

initCryptoPage();
