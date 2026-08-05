// ===== 首页脚本（Base64/图片信息已拆分至独立页面）=====

// ===== 10 精选工具（Bilibili 暂时维护中）=====
const tools = [
  { icon:'📺', name:'Bilibili 视频下载', desc:'维护中 · 暂不开放', tool:'bilibili' },
  { icon:'🖼️', name:'读取图片信息', desc:'尺寸/格式 · EXIF 元数据 · GPS 信息', tool:'imginfo' },
  { icon:'🔠', name:'Base64 编解码', desc:'文本 ↔ Base64 · 文件 ↔ Base64 · UTF-8 安全', tool:'base64' },
  { icon:'🌸', name:'随机二次元图片', desc:'随机头像 · 随机动漫 · 一键刷新', tool:'qrcode' },
  { icon:'🗜️', name:'图片压缩', desc:'批量压缩 · JPG/PNG/WebP/AVIF', tool:'imgcompress' },
  { icon:'🎞️', name:'音视频工具箱', desc:'剪切音视频 · 音频转 WAV · 视频音频合并', tool:'media' },
  { icon:'🌐', name:'在线翻译', desc:'中英互译 · 自动识别 · 一键复制', tool:'translator' },
  { icon:'🕤', name:'时间戳转换', desc:'秒/毫秒互转 · 多时区切换', tool:'timestamp' },
  { icon:'🔐', name:'字符串加解密', desc:'Hash 加密 · Base64 编解码 · URL 编解码', tool:'crypto' },
  { icon:'{}', name:'JSON 格式化', desc:'语法高亮 · 格式化/压缩 · JSONPath 查询', tool:'json' },
];

// ===== Tool Templates（Base64/图片信息已移至独立页面）=====
const toolTemplates = {
  qrcode: {
    icon:'🌸',
    title:'随机二次元 API',
    subtitle:'先读取 JSON，再展示真实 CDN 图片。',
    render: () => `
      <div class="anime-random-wrap">
        <div class="api-hero">
          <div class="api-badge">免费 · 快速 · 随机</div>
          <h2>随机二次元图片 API</h2>
          <p>二次元壁纸 · 手机壁纸 · 电脑壁纸 · 随机头像</p>
        </div>
        <div class="api-stats">
          <div><strong>4</strong><span>动漫接口</span></div>
        </div>
        <div class="api-section-title">
          <span>图片 API</span>
          <em>4 个接口</em>
        </div>
        <div class="api-card-grid">
          <div class="api-card">
            <div class="api-card-top"><span>可用</span></div>
            <h3>自适应二次元动漫</h3>
            <p>随机返回横屏或竖屏动漫图。</p>
            <button class="api-test-btn" id="animeBtn_auto" onclick="testAnimeApi('auto')">生成图片</button>
            <div class="anime-img-box" id="animeDrawer_auto">
              <img id="animePreviewImg_auto" alt="自适应二次元动漫" referrerpolicy="no-referrer">
              <div class="anime-img-status" id="animePreviewStatus_auto">正在加载图片...</div>
            </div>
          </div>
          <div class="api-card">
            <div class="api-card-top"><span>可用</span><em>电脑动漫</em></div>
            <h3>电脑端二次元动漫</h3>
            <p>二次元电脑图片，宽屏高清，适合横向预览。</p>
            <button class="api-test-btn" id="animeBtn_pc" onclick="testAnimeApi('pc')">生成图片</button>
            <div class="anime-img-box" id="animeDrawer_pc">
              <img id="animePreviewImg_pc" alt="电脑端二次元动漫" referrerpolicy="no-referrer">
              <div class="anime-img-status" id="animePreviewStatus_pc">正在加载图片...</div>
            </div>
          </div>
          <div class="api-card">
            <div class="api-card-top"><span>可用</span><em>手机动漫</em></div>
            <h3>手机端二次元动漫</h3>
            <p>二次元手机壁纸，竖版图片，适合移动端预览。</p>
            <button class="api-test-btn" id="animeBtn_pe" onclick="testAnimeApi('pe')">生成图片</button>
            <div class="anime-img-box anime-img-box-portrait" id="animeDrawer_pe">
              <img id="animePreviewImg_pe" alt="手机端二次元动漫" referrerpolicy="no-referrer">
              <div class="anime-img-status" id="animePreviewStatus_pe">正在加载图片...</div>
            </div>
          </div>
          <div class="api-card">
            <div class="api-card-top"><span>可用</span><em>动漫头像</em></div>
            <h3>头像端二次元动漫</h3>
            <p>随机二次元方形头像，适合作为头像素材。</p>
            <button class="api-test-btn" id="animeBtn_tx" onclick="testAnimeApi('tx')">生成图片</button>
            <div class="anime-img-box anime-img-box-square" id="animeDrawer_tx">
              <img id="animePreviewImg_tx" alt="头像端二次元动漫" referrerpolicy="no-referrer">
              <div class="anime-img-status" id="animePreviewStatus_tx">正在加载图片...</div>
            </div>
          </div>
        </div>
      </div>`
  },
  imgcompress: { icon:'🗜️', title:'图片压缩', subtitle:'批量压缩 · JPG/PNG/WebP/AVIF', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  timestamp: { icon:'🕤', title:'时间戳转换', subtitle:'秒/毫秒互转 · 多时区切换', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  crypto: { icon:'🔐', title:'字符串加解密', subtitle:'Hash 加密 · Base64 编解码 · URL 编解码', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">正在打开字符串加解密...</div>' },
  json: { icon:'{}', title:'JSON 格式化', subtitle:'语法高亮 · 格式化/压缩 · JSONPath 查询', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
};

// ===== State =====
let currentUser = null;
let currentTool = null;
const pythonSourceMap = {};

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

  // 音视频工具箱已拆分为独立页面，使用浏览器原生 API 处理
  if (toolId === 'media') {
    window.location.href = 'media.html';
    return;
  }

  // 在线翻译已拆分为独立页面
  if (toolId === 'translator') {
    window.location.href = 'translator.html';
    return;
  }

  // 字符串加解密已拆分为独立页面
  if (toolId === 'crypto') {
    window.location.href = 'crypto.html';
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
  const pyBtn = document.getElementById('pythonDownloadBtn');
  const pySource = pythonSourceMap[toolId];
  if (pyBtn && pySource) {
    pyBtn.href = pySource.href;
    pyBtn.download = pySource.filename;
    pyBtn.style.display = 'inline-flex';
  } else if (pyBtn) {
    pyBtn.style.display = 'none';
  }
  window.scrollTo(0, 0);
}

function goHome() {
  currentTool = null;
  document.getElementById('toolView').style.display = 'none';
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('searchBox').style.display = 'block';
  const pyBtn = document.getElementById('pythonDownloadBtn');
  if (pyBtn) pyBtn.style.display = 'none';
  history.replaceState(null, '', '#');
}

function switchToolTab(panelId) {
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}

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

// ===== Random Anime API Preview =====
const animeApiMap = {
  auto: { title: '自适应二次元动漫', url: 'https://api.sretna.cn/api/anime/auto' },
  pc: { title: '电脑端二次元动漫', url: 'https://api.sretna.cn/api/anime/pc' },
  pe: { title: '手机端二次元动漫', url: 'https://api.sretna.cn/api/anime/pe' },
  tx: { title: '头像端二次元动漫', url: 'https://api.sretna.cn/api/anime/tx' }
};
async function loadAnimeImage(imgId, statusId, apiUrl) {
  const img = document.getElementById(imgId);
  const status = document.getElementById(statusId);
  if (!img || !status) return;

  const jsonUrl = `${apiUrl}?type=json&t=${Date.now()}`;
  img.removeAttribute('src');
  img.style.display = 'none';
  status.style.display = 'flex';
  status.textContent = '正在加载图片...';

  img.onload = () => {
    status.style.display = 'none';
    img.style.display = 'block';
  };
  img.onerror = () => {
    img.style.display = 'none';
    status.style.display = 'flex';
    status.textContent = '图片加载失败，请点击“重新生成”重试。';
  };

  try {
    const res = await fetch(jsonUrl, { cache: 'no-store' });
    const data = await res.json();
    if (!data || data.code !== '200' || !data.storage || !data.source || !data.sort || !data.image) {
      throw new Error('接口返回数据不完整');
    }
    const imageType = data.type || 'webp';
    const imageUrl = `https://${data.storage}/${data.source}/${data.sort}/${data.image}.${imageType}`;
    img.src = imageUrl;
  } catch (err) {
    img.style.display = 'none';
    status.style.display = 'flex';
    status.textContent = '图片接口读取失败，请点击“重新生成”重试。';
  }
}

function testAnimeApi(type) {
  const item = animeApiMap[type];
  if (!item) return;
  const drawer = document.getElementById(`animeDrawer_${type}`);
  const button = document.getElementById(`animeBtn_${type}`);
  if (drawer) drawer.classList.add('show');
  if (button) button.textContent = '重新生成';
  loadAnimeImage(`animePreviewImg_${type}`, `animePreviewStatus_${type}`, item.url);
}

function refreshAnimeImages() {
  Object.keys(animeApiMap).forEach(type => testAnimeApi(type));
}

// ===== Init =====
function init() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  restoreSession();
  filterTools();
  loadRandomAword();
  preloadAboutImages();
}

// ===== 预加载作者页面图片（首页空闲时下载并缓存）=====
function preloadAboutImages() {
  ['images/about-bg.jpg', 'images/author-avatar.jpg'].forEach(src => {
    const img = new Image();
    img.src = src;
  });
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); if (currentTool) goHome(); } });
init();
