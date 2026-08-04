// ===== Base64 页面专用脚本 =====
// 包含：Base64 编解码逻辑 + 通用功能（主题/登录/提示）

// ===== State =====
let currentUser = null;
let b64FileData = null;       // { name, size, type, arrayBuffer }
let b64ResultData = null;     // { type: 'text'|'file', content, filename, mime }

// ===== Tab Switch =====
function switchToolTab(panelId, btn) {
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

// ===== Base64 Tool: Text =====
function b64Encode() {
  const input = document.getElementById('b64Input').value;
  if (!input) { showToast('请输入文本'); return; }
  try {
    const encoded = btoa(unescape(encodeURIComponent(input)));
    document.getElementById('b64Output').value = encoded;
    b64ResultData = { type: 'text', content: encoded };
  } catch (e) { showToast('编码失败: ' + e.message); }
}

function b64Decode() {
  const input = document.getElementById('b64Input').value.trim();
  if (!input) { showToast('请输入 Base64 字符串'); return; }
  try {
    const decoded = decodeURIComponent(escape(atob(input)));
    document.getElementById('b64Output').value = decoded;
    b64ResultData = { type: 'text', content: decoded };
  } catch (e) { showToast('解码失败：请检查输入是否为有效的 Base64'); }
}

function b64AutoDetect() {
  const input = document.getElementById('b64Input').value.trim();
  const output = document.getElementById('b64Output');
  if (!input) { output.value = ''; return; }
  try {
    if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length >= 4) {
      const cleaned = input.replace(/\s/g, '');
      const decoded = decodeURIComponent(escape(atob(cleaned)));
      output.value = decoded;
      b64ResultData = { type: 'text', content: decoded };
    } else {
      const encoded = btoa(unescape(encodeURIComponent(input)));
      output.value = encoded;
      b64ResultData = { type: 'text', content: encoded };
    }
  } catch (e) {
    try {
      const encoded = btoa(unescape(encodeURIComponent(input)));
      output.value = encoded;
    } catch (e2) { output.value = ''; }
  }
}

function b64Copy() {
  const output = document.getElementById('b64Output').value;
  if (!output) { showToast('没有可复制的内容'); return; }
  navigator.clipboard.writeText(output).then(() => showToast('已复制到剪贴板'));
}

function b64Swap() {
  const inp = document.getElementById('b64Input');
  const out = document.getElementById('b64Output');
  const tmp = inp.value;
  inp.value = out.value;
  out.value = tmp;
}

function b64Clear() {
  document.getElementById('b64Input').value = '';
  document.getElementById('b64Output').value = '';
  b64ResultData = null;
}

// ===== Base64 Tool: File =====
function setupB64DragDrop() {
  const zone = document.getElementById('b64DropZone');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) b64HandleFile(e.dataTransfer.files[0]);
  });
}

function b64HandleFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过 10MB'); return; }

  b64FileData = { name: file.name, size: file.size, type: file.type };
  document.getElementById('b64FileInfo').classList.add('show');
  document.getElementById('b64FileName').textContent = file.name;
  document.getElementById('b64FileSize').textContent = formatSize(file.size);
  document.getElementById('b64FileType').textContent = file.type || '未知';

  const reader = new FileReader();
  reader.onload = (e) => {
    const buf = new Uint8Array(e.target.result);
    const isBinary = detectBinary(buf);
    const detectEl = document.getElementById('b64FileDetect');
    if (isBinary) {
      detectEl.innerHTML = '<span class="file-type-badge badge-binary">二进制文件</span>';
      b64FileData.isText = false;
    } else {
      detectEl.innerHTML = '<span class="file-type-badge badge-text">文本文件</span>';
      b64FileData.isText = true;
    }
    b64FileData.arrayBuffer = buf;
  };
  reader.readAsArrayBuffer(file);

  document.getElementById('b64FileResult').classList.remove('show');
  document.getElementById('b64Progress').classList.remove('show');
}

function b64EncodeFile() {
  if (!b64FileData || !b64FileData.arrayBuffer) { showToast('请先选择文件'); return; }
  const prog = document.getElementById('b64Progress');
  prog.classList.add('show');
  document.getElementById('b64ProgressFill').style.width = '50%';

  setTimeout(() => {
    try {
      let binary = '';
      const bytes = b64FileData.arrayBuffer;
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      const encoded = btoa(binary);
      document.getElementById('b64ProgressFill').style.width = '100%';
      setTimeout(() => prog.classList.remove('show'), 300);

      const resultBox = document.getElementById('b64FileResult');
      resultBox.classList.add('show');
      document.getElementById('b64ResultTitle').textContent = `Base64 编码结果 (${formatSize(encoded.length)})`;
      const out = document.getElementById('b64FileOutput');
      out.value = encoded;
      out.style.minHeight = '120px';
      b64ResultData = { type: 'file', content: encoded, filename: b64FileData.name + '.b64.txt', mime: 'text/plain', isEncoded: true };
      showToast('编码成功');
    } catch (e) {
      prog.classList.remove('show');
      showToast('编码失败: ' + e.message);
    }
  }, 100);
}

function b64DecodeFile() {
  if (!b64FileData || !b64FileData.arrayBuffer) { showToast('请先选择文件'); return; }
  const prog = document.getElementById('b64Progress');
  prog.classList.add('show');
  document.getElementById('b64ProgressFill').style.width = '50%';

  setTimeout(() => {
    try {
      const bytes = b64FileData.arrayBuffer;
      let b64Str = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        b64Str += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      b64Str = b64Str.replace(/\s/g, '');
      const decoded = atob(b64Str);
      const decodedBytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) decodedBytes[i] = decoded.charCodeAt(i);

      document.getElementById('b64ProgressFill').style.width = '100%';
      setTimeout(() => prog.classList.remove('show'), 300);

      const isText = !detectBinary(decodedBytes);
      const ext = isText ? 'txt' : 'bin';
      const baseName = b64FileData.name.replace(/\.[^.]+$/, '') || 'decoded';

      const resultBox = document.getElementById('b64FileResult');
      resultBox.classList.add('show');
      document.getElementById('b64ResultTitle').textContent = `解码结果 (${formatSize(decodedBytes.length)} · ${isText ? '文本' : '二进制'})`;

      const out = document.getElementById('b64FileOutput');
      if (isText) {
        out.value = new TextDecoder('utf-8').decode(decodedBytes);
      } else {
        out.value = `[二进制数据] ${decodedBytes.length} 字节\n十六进制前 32 字节: ${Array.from(decodedBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`;
      }
      out.style.minHeight = '120px';

      b64ResultData = {
        type: 'file', content: decodedBytes, filename: baseName + '.' + ext,
        mime: isText ? 'text/plain' : 'application/octet-stream', isEncoded: false
      };
      showToast('解码成功');
    } catch (e) {
      prog.classList.remove('show');
      showToast('解码失败：请确认文件内容是有效的 Base64');
    }
  }, 100);
}

function b64DownloadResult() {
  if (!b64ResultData) { showToast('没有可下载的结果'); return; }
  let blob;
  if (b64ResultData.content instanceof Uint8Array) {
    blob = new Blob([b64ResultData.content], { type: b64ResultData.mime });
  } else {
    blob = new Blob([b64ResultData.content], { type: b64ResultData.mime || 'text/plain' });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = b64ResultData.filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('下载已开始');
}

function b64CopyResult() {
  if (!b64ResultData) { showToast('没有可复制的结果'); return; }
  const text = typeof b64ResultData.content === 'string' ? b64ResultData.content : document.getElementById('b64FileOutput').value;
  navigator.clipboard.writeText(text).then(() => showToast('已复制'));
}

// ===== Helpers (ported from Python) =====
function detectBinary(bytes) {
  const checkLen = Math.min(bytes.length, 8192);
  for (let i = 0; i < checkLen; i++) {
    if (bytes[i] === 0x00) return true;
  }
  if (checkLen >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return false;
  return !isValidText(bytes);
}

function isValidText(bytes) {
  const checkLen = Math.min(bytes.length, 256);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(0, checkLen));
    for (const c of text) {
      const code = c.charCodeAt(0);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) return false;
    }
    return true;
  } catch {
    try {
      const text = new TextDecoder('latin-1').decode(bytes.slice(0, checkLen));
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) return false;
      }
      return true;
    } catch { return false; }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

// ===== Login Modal =====
let authMode = 'login';
function openModal() { document.getElementById('modalOverlay').classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.body.style.overflow = ''; document.getElementById('errorMsg').classList.remove('show'); }
function switchTab(mode) {
  authMode = mode;
  const lt = document.getElementById('loginTab'), rt = document.getElementById('registerTab');
  const t = document.getElementById('modalTitle'), s = document.getElementById('modalSub'), b = document.getElementById('submitBtn');
  const ft = document.getElementById('footerText'), fl = document.querySelector('.modal-footer a');
  const rf = document.querySelectorAll('.register-fields'), fr = document.getElementById('formRow');
  if (mode === 'login') { lt.classList.add('active'); rt.classList.remove('active'); t.textContent='欢迎回来'; s.textContent='登录以同步你的工具收藏'; b.textContent='登 录'; ft.textContent='还没有账号？'; fl.textContent='立即注册'; fl.onclick=()=>switchTab('register'); fr.style.display='flex'; rf.forEach(f=>f.classList.remove('show')); }
  else { rt.classList.add('active'); lt.classList.remove('active'); t.textContent='创建账号'; s.textContent='注册后可收藏常用工具'; b.textContent='注 册'; ft.textContent='已有账号？'; fl.textContent='去登录'; fl.onclick=()=>switchTab('login'); fr.style.display='none'; rf.forEach(f=>f.classList.add('show')); }
  document.getElementById('errorMsg').classList.remove('show');
}
function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim(), password = document.getElementById('passwordInput').value;
  if (!email || !password) { showError('请填写完整信息'); return; }
  if (password.length < 6) { showError('密码至少 6 位'); return; }
  if (authMode === 'register') {
    const regName = document.getElementById('regName').value.trim(), regConfirm = document.getElementById('regConfirm').value;
    if (!regName) { showError('请输入用户名'); return; }
    if (password !== regConfirm) { showError('两次密码不一致'); return; }
    const users = JSON.parse(localStorage.getItem('toolbox_users') || '{}');
    if (users[email]) { showError('该邮箱已注册'); return; }
    users[email] = { name: regName, email, password };
    localStorage.setItem('toolbox_users', JSON.stringify(users));
    showToast('注册成功，已自动登录'); loginUser(regName);
  } else {
    const users = JSON.parse(localStorage.getItem('toolbox_users') || '{}');
    const user = users[email] || users[email.toLowerCase()];
    if (!user || user.password !== password) {
      if (email === 'demo' && password === '123456') { showToast('登录成功'); loginUser('体验用户'); }
      else { showError('邮箱或密码错误（试试 demo / 123456）'); }
    } else { showToast('登录成功'); loginUser(user.name); }
  }
}
function loginUser(name) {
  currentUser = name;
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('userMenu').classList.add('show');
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  localStorage.setItem('toolbox_user', name);
  closeModal(); document.getElementById('authForm').reset();
}
function logout() {
  currentUser = null;
  document.getElementById('loginBtn').style.display = 'flex';
  document.getElementById('userMenu').classList.remove('show');
  localStorage.removeItem('toolbox_user'); showToast('已退出登录');
}
function socialLogin(p) { showToast(`正在通过 ${p} 登录...`); setTimeout(()=>loginUser(p+'用户'), 800); }
function showError(msg) { const el = document.getElementById('errorMsg'); el.textContent = msg; el.classList.add('show'); }

// ===== Theme =====
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('toolbox_theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  icon.innerHTML = isDark ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
}

// ===== Toast =====
let toastTimer;
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 2500); }

// ===== Init =====
function init() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  const savedUser = localStorage.getItem('toolbox_user');
  if (savedUser) loginUser(savedUser);
  setupB64DragDrop();
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
init();
