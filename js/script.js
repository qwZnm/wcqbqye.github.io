// ===== 首页脚本（Base64/图片信息已拆分至独立页面）=====

// ===== 10 精选工具（Bilibili 暂时维护中）=====
const tools = [
  { icon:'📺', name:'Bilibili 视频下载', desc:'维护中 · 暂不开放', tool:'bilibili' },
  { icon:'🖼️', name:'读取图片信息', desc:'尺寸/格式 · EXIF 元数据 · GPS 信息', tool:'imginfo' },
  { icon:'🔠', name:'Base64 编解码', desc:'文本 ↔ Base64 · 文件 ↔ Base64 · UTF-8 安全', tool:'base64' },
  { icon:'🌸', name:'随机二次元图片', desc:'随机头像 · 随机动漫 · 一键刷新', tool:'qrcode' },
  { icon:'🗜️', name:'图片压缩', desc:'批量压缩 · JPG/PNG/WebP/AVIF', tool:'imgcompress' },
  { icon:'📑', name:'PDF 合并', desc:'多个 PDF · 拖拽排序 · 本地处理', tool:'pdfmerge' },
  { icon:'🔐', name:'密码生成', desc:'强度评级 · 排除易混淆 · 历史记录', tool:'password' },
  { icon:'🕤', name:'时间戳转换', desc:'秒/毫秒互转 · 多时区切换', tool:'timestamp' },
  { icon:'🧮', name:'计算器', desc:'基础 + 科学函数 · 百分比/括号/记忆', tool:'calculator' },
  { icon:'{}', name:'JSON 格式化', desc:'语法高亮 · 格式化/压缩 · JSONPath 查询', tool:'json' },
];

// ===== Tool Templates（Base64/图片信息已移至独立页面）=====
const toolTemplates = {
  qrcode: {
    icon:'🌸',
    title:'随机二次元图片',
    subtitle:'随机二次元头像 · 随机二次元动漫 · 每次刷新都有新图片',
    render: () => `
      <div class="anime-random-wrap">
        <div class="anime-random-actions">
          <button class="arrow-btn" onclick="refreshAnimeImages()">刷新图片</button>
          <span>图片来自随机二次元接口，加载速度取决于接口响应。</span>
        </div>
        <div class="anime-random-grid">
          <div class="anime-random-card">
            <div class="anime-random-title">随机二次元头像</div>
            <img id="animeAvatarImg" alt="随机二次元头像">
          </div>
          <div class="anime-random-card">
            <div class="anime-random-title">随机二次元动漫</div>
            <img id="animeAutoImg" alt="随机二次元动漫">
          </div>
        </div>
      </div>`
  },
  imgcompress: { icon:'🗜️', title:'图片压缩', subtitle:'批量压缩 · JPG/PNG/WebP/AVIF', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  pdfmerge: { icon:'📑', title:'PDF 合并', subtitle:'多个 PDF · 拖拽排序 · 本地处理', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  password: { icon:'🔐', title:'密码生成', subtitle:'强度评级 · 排除易混淆 · 历史记录', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  timestamp: { icon:'🕤', title:'时间戳转换', subtitle:'秒/毫秒互转 · 多时区切换', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  calculator: { icon:'🧮', title:'计算器', subtitle:'基础 + 科学函数 · 百分比/括号/记忆', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  json: { icon:'{}', title:'JSON 格式化', subtitle:'语法高亮 · 格式化/压缩 · JSONPath 查询', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
};

// ===== State =====
let currentUser = null;
let currentTool = null;

// ===== Render Tools Grid =====
function filterTools() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const grid = document.getElementById('toolsGrid');
  const noResult = document.getElementById('noResult');
  let filtered = query ? tools.filter(t => t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)) : tools;
  if (filtered.length === 0) { grid.innerHTML = ''; noResult.style.display = 'block'; return; }
  noResult.style.display = 'none';
  grid.innerHTML = filtered.map((t, i) =>
    `<div class="tool-card" onclick="openTool('${t.tool}')" style="animation:fadeIn .3s ease ${i*0.03}s both">
      <div class="tool-icon">${t.icon}</div><div class="tool-name">${t.name}</div><div class="tool-desc">${t.desc}</div>
    </div>`
  ).join('');
}

// ===== SPA Navigation =====
function openTool(toolId) {
  // Bilibili 工具维护中：不跳转、不进入工具页
  if (toolId === 'bilibili') {
    showToast('Bilibili 视频下载维护中，暂不开放');
    return;
  }

  if (!currentUser) { showToast('请先登录后使用工具'); openModal(); return; }

  // Base64 已拆分为独立页面，直接跳转
  if (toolId === 'base64') {
    window.location.href = 'base64.html';
    return;
  }

  // 读取图片信息已拆分为独立页面，直接跳转
  if (toolId === 'imginfo') {
    window.location.href = 'imginfo.html';
    return;
  }

  const tpl = toolTemplates[toolId];
  if (!tpl) { showToast('工具不存在'); return; }
  currentTool = toolId;
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('toolView').style.display = 'block';
  document.getElementById('backBtn').style.display = 'flex';
  document.getElementById('searchBox').style.display = 'none';
  document.getElementById('toolTitleIcon').textContent = tpl.icon;
  document.getElementById('toolTitle').textContent = tpl.title;
  document.getElementById('toolSubtitle').textContent = tpl.subtitle;
  document.getElementById('toolBody').innerHTML = tpl.render();
  if (toolId === 'qrcode') refreshAnimeImages();
  window.scrollTo(0, 0);
}

function goHome() {
  currentTool = null;
  document.getElementById('toolView').style.display = 'none';
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('searchBox').style.display = 'block';
  history.replaceState(null, '', '#');
}

function switchToolTab(panelId) {
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(panelId).classList.add('active');
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

// ===== Random Aword =====
async function loadRandomAword() {
  const el = document.getElementById('awordText');
  if (!el) return;
  try {
    const res = await fetch(`https://api.sretna.cn/api/aword/auto?t=${Date.now()}`, { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    let text = '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      text = data.text || data.content || data.data || data.msg || data.hitokoto || '';
    } else {
      text = await res.text();
    }
    el.textContent = String(text).trim() || '愿你今天也拥有好心情。';
  } catch (err) {
    el.textContent = '一言暂时加载失败，请稍后再试。';
  }
}

// ===== Random Anime Images =====
function refreshAnimeImages() {
  const avatar = document.getElementById('animeAvatarImg');
  const anime = document.getElementById('animeAutoImg');
  const now = Date.now();
  if (avatar) avatar.src = `https://api.sretna.cn/api/anime/tx?t=${now}`;
  if (anime) anime.src = `https://api.sretna.cn/api/anime/auto?t=${now + 1}`;
}

// ===== Init =====
function init() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  const savedUser = localStorage.getItem('toolbox_user');
  if (savedUser) loginUser(savedUser);
  filterTools();
  loadRandomAword();
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); if (currentTool) goHome(); } });
init();
