// ===== 首页脚本（Base64/图片信息已拆分至独立页面）=====

// ===== 10 精选工具（Bilibili 暂时维护中）=====
const tools = [
  { icon:'📺', name:'Bilibili 视频下载', desc:'维护中 · 暂不开放', tool:'bilibili' },
  { icon:'🖼️', name:'读取图片信息', desc:'尺寸/格式 · EXIF 元数据 · GPS 信息', tool:'imginfo' },
  { icon:'🔠', name:'Base64 编解码', desc:'文本 ↔ Base64 · 文件 ↔ Base64 · UTF-8 安全', tool:'base64' },
  { icon:'🌸', name:'随机二次元图片', desc:'随机头像 · 随机动漫 · 一键刷新', tool:'qrcode' },
  { icon:'🗜️', name:'图片压缩', desc:'批量压缩 · JPG/PNG/WebP/AVIF', tool:'imgcompress' },
  { icon:'🎞️', name:'FFmpeg 工具箱', desc:'剪切音视频 · 音频转格式 · 视频音频合并', tool:'ffmpeg' },
  { icon:'🌐', name:'在线翻译', desc:'中英互译 · 自动识别 · 一键复制', tool:'password' },
  { icon:'🕤', name:'时间戳转换', desc:'秒/毫秒互转 · 多时区切换', tool:'timestamp' },
  { icon:'🧮', name:'计算器', desc:'基础 + 科学函数 · 百分比/括号/记忆', tool:'calculator' },
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
  password: {
    icon:'🌐',
    title:'在线翻译',
    subtitle:'基于上传的 Python 翻译脚本思路优化 · 自动识别中英文 · 支持中英互译',
    render: () => `
      <div class="translator-wrap">
        <div class="translator-toolbar">
          <select id="transSourceLang" class="translator-select">
            <option value="auto">自动识别</option>
            <option value="zh-CN">中文</option>
            <option value="en">英文</option>
            <option value="ja">日文</option>
            <option value="ko">韩文</option>
            <option value="fr">法文</option>
            <option value="de">德文</option>
          </select>
          <button class="translator-swap" onclick="swapTranslateLangs()" title="交换语言">⇄</button>
          <select id="transTargetLang" class="translator-select">
            <option value="en">英文</option>
            <option value="zh-CN">中文</option>
            <option value="ja">日文</option>
            <option value="ko">韩文</option>
            <option value="fr">法文</option>
            <option value="de">德文</option>
          </select>
        </div>
        <div class="translator-grid">
          <div class="translator-panel">
            <div class="translator-panel-head">
              <span>原文</span>
              <button class="link-btn" onclick="clearTranslator()">清空</button>
            </div>
            <textarea id="transInput" class="translator-textarea" placeholder="输入要翻译的文本，例如：你好 / hello" oninput="translatorAutoHint()"></textarea>
            <div class="translator-hint" id="transHint">输入中文会默认译为英文；输入英文会默认译为中文。</div>
          </div>
          <div class="translator-panel">
            <div class="translator-panel-head">
              <span>译文</span>
              <button class="link-btn" onclick="copyTranslation()">复制结果</button>
            </div>
            <textarea id="transOutput" class="translator-textarea translator-output" placeholder="翻译结果会显示在这里" readonly></textarea>
            <div class="translator-hint" id="transStatus">在线翻译会优先使用浏览器可访问的翻译接口。</div>
          </div>
        </div>
        <div class="translator-actions">
          <button class="arrow-btn" onclick="runTranslate()">开始翻译</button>
          <button class="action-btn" onclick="fillTranslateDemo()">示例</button>
        </div>
        <div class="translator-note">
          前端使用在线翻译接口，命令行版已放在 <code>python/translator.py</code>。
        </div>
      </div>`
  },
  timestamp: { icon:'🕤', title:'时间戳转换', subtitle:'秒/毫秒互转 · 多时区切换', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  calculator: { icon:'🧮', title:'计算器', subtitle:'基础 + 科学函数 · 百分比/括号/记忆', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
  json: { icon:'{}', title:'JSON 格式化', subtitle:'语法高亮 · 格式化/压缩 · JSONPath 查询', render: () => '<div style="text-align:center;padding:60px 20px;color:var(--text-sub);">该工具正在开发中...</div>' },
};

// ===== State =====
let currentUser = null;
let currentTool = null;
const pythonSourceMap = {
  password: { href: 'python/translator.py', filename: 'translator.py' }
};

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

  // FFmpeg 已拆分为独立页面，进入页面即加载单线程 WASM 内核
  if (toolId === 'ffmpeg') {
    window.location.href = 'ffmpeg.html';
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

// ===== Translator Tool =====
function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function translatorAutoHint() {
  const input = document.getElementById('transInput');
  const source = document.getElementById('transSourceLang');
  const target = document.getElementById('transTargetLang');
  const hint = document.getElementById('transHint');
  if (!input || !source || !target || !hint) return;
  const text = input.value.trim();
  if (!text || source.value !== 'auto') {
    hint.textContent = '输入中文会默认译为英文；输入英文会默认译为中文。';
    return;
  }
  if (containsChinese(text)) {
    target.value = 'en';
    hint.textContent = '检测到中文，已自动设置为译成英文。';
  } else {
    target.value = 'zh-CN';
    hint.textContent = '检测到非中文，已自动设置为译成中文。';
  }
}

function getTranslateLangs(text) {
  const source = document.getElementById('transSourceLang')?.value || 'auto';
  const target = document.getElementById('transTargetLang')?.value || 'zh-CN';
  if (source !== 'auto') return { source, target };
  return containsChinese(text) ? { source: 'zh-CN', target: target || 'en' } : { source: 'auto', target: target || 'zh-CN' };
}

async function fetchGoogleTranslate(text, source, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { cache: 'no-store' });
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
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`备用接口状态异常：${res.status}`);
  const data = await res.json();
  const translated = data?.responseData?.translatedText || '';
  if (!translated) throw new Error('备用接口结果为空');
  return translated;
}

function localFallbackTranslate(text, source, target) {
  const normalized = text.trim().toLowerCase();
  const zhToEn = {
    '你好': 'Hello',
    '你好，世界': 'Hello, world',
    '世界': 'World',
    '欢迎': 'Welcome',
    '欢迎使用': 'Welcome to use',
    '翻译': 'Translate',
    '在线翻译': 'Online translation',
    '工具': 'Tool',
    '工具箱': 'Toolbox',
    '谢谢': 'Thank you',
    '早上好': 'Good morning',
    '晚上好': 'Good evening',
    '再见': 'Goodbye',
    '我爱你': 'I love you',
    '中国': 'China',
    '英文': 'English',
    '中文': 'Chinese'
  };
  const enToZh = {
    'hello': '你好',
    'hello, world': '你好，世界',
    'world': '世界',
    'welcome': '欢迎',
    'translate': '翻译',
    'translation': '翻译',
    'online translation': '在线翻译',
    'tool': '工具',
    'toolbox': '工具箱',
    'thank you': '谢谢',
    'good morning': '早上好',
    'good evening': '晚上好',
    'goodbye': '再见',
    'i love you': '我爱你',
    'china': '中国',
    'english': '英文',
    'chinese': '中文'
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

async function runTranslate() {
  const input = document.getElementById('transInput');
  const output = document.getElementById('transOutput');
  const status = document.getElementById('transStatus');
  if (!input || !output || !status) return;
  const text = input.value.trim();
  if (!text) {
    showToast('请输入要翻译的内容');
    return;
  }
  translatorAutoHint();
  const { source, target } = getTranslateLangs(text);
  status.textContent = '正在翻译...';
  output.value = '';
  try {
    output.value = await fetchGoogleTranslate(text, source, target);
    status.textContent = `翻译完成：${source === 'auto' ? '自动识别' : source} → ${target}`;
  } catch (err) {
    try {
      output.value = await fetchMyMemoryTranslate(text, source, target);
      status.textContent = `翻译完成：已使用备用接口。`;
    } catch (fallbackErr) {
      const localResult = localFallbackTranslate(text, source, target);
      if (localResult) {
        output.value = localResult;
        status.textContent = '在线接口受限，已使用本地兜底词典。更完整翻译可使用 python/translator.py 命令行版。';
        showToast('已使用本地兜底翻译');
      } else {
        output.value = '';
        status.textContent = '在线翻译失败，可能是接口限流或网络限制。可使用 python/translator.py 命令行版重试。';
        showToast('翻译失败，请稍后重试');
      }
    }
  }
}

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
    output.value = '';
  }
  translatorAutoHint();
}

function clearTranslator() {
  const input = document.getElementById('transInput');
  const output = document.getElementById('transOutput');
  const status = document.getElementById('transStatus');
  if (input) input.value = '';
  if (output) output.value = '';
  if (status) status.textContent = '在线翻译会优先使用浏览器可访问的翻译接口。';
  translatorAutoHint();
}

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

function fillTranslateDemo() {
  const input = document.getElementById('transInput');
  if (!input) return;
  input.value = '你好，欢迎使用在线翻译工具。';
  translatorAutoHint();
}

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
  const savedUser = localStorage.getItem('toolbox_user');
  if (savedUser) loginUser(savedUser);
  filterTools();
  loadRandomAword();
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); if (currentTool) goHome(); } });
init();
