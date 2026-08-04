// ===== Bilibili 视频下载页面专用脚本 =====
// 技术原理：前端请求代理服务，代理服务再调用 B站官方 API 获取视频信息和 DASH 音视频流地址
// GitHub Pages 与 api.bilibili.com 不同源，浏览器会拦截前端直接读取响应，因此必须通过代理服务转发

// ===== State =====
let currentUser = null;
let biliVideoData = null;    // { bvid, cid, title, pic, owner, duration, stat, pages }
let biliPlayUrlData = null;  // { dash: { video[], audio[] }, accept_quality, accept_description }
let selectedQuality = 80;    // 默认 1080P

// 代理配置：
// 1. 推荐部署项目根目录的 cloudflare-worker.js，得到自己的 Worker 地址
// 2. 然后把下面的 window.BILI_PROXY_BASE 改成你的 Worker 地址，例如：https://xxx.workers.dev/?url=
// 3. 未配置时会临时使用公共代理，公共代理可能限流或不可用，不建议正式部署依赖
const CORS_PROXY = window.BILI_PROXY_BASE || 'https://api.allorigins.win/raw?url=';
const BILI_API_BASE = 'https://api.bilibili.com';
const BILI_PLAYURL_API = '/x/player/playurl';

// ===== BV号提取 =====
function extractBvid(input) {
  if (!input) return null;
  input = input.trim();
  // 直接是 BV 号
  const bvMatch = input.match(/BV[a-zA-Z0-9]{10}/);
  if (bvMatch) return bvMatch[0];
  // 从 URL 中提取
  const urlMatch = input.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]{10})/);
  if (urlMatch) return urlMatch[1];
  // b23.tv 短链无法在前端解析，提示用户
  if (input.includes('b23.tv')) {
    showToast('暂不支持短链，请先在浏览器中打开短链获取完整 URL');
    return null;
  }
  // 如果输入像 BV 号但格式不完整
  if (input.toUpperCase().startsWith('BV') && input.length >= 10) {
    return input.substring(0, 12);
  }
  return null;
}

// ===== 通过代理调用 API =====
async function biliFetch(apiPath) {
  const targetUrl = BILI_API_BASE + apiPath;
  const proxyUrl = buildProxyUrl(targetUrl);
  const resp = await fetch(proxyUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`请求失败: ${resp.status}`);
  return resp.json();
}

function buildProxyUrl(targetUrl) {
  if (CORS_PROXY.includes('{url}')) {
    return CORS_PROXY.replace('{url}', encodeURIComponent(targetUrl));
  }
  if (CORS_PROXY.includes('?')) {
    return CORS_PROXY + encodeURIComponent(targetUrl);
  }
  return CORS_PROXY.replace(/\/$/, '') + '/?url=' + encodeURIComponent(targetUrl);
}

// ===== 百分比进度条 =====
function setBiliProgress(percent, text) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const fill = document.getElementById('biliProgressFill');
  const percentEl = document.getElementById('biliProgressPercent');
  const textEl = document.getElementById('biliProgressText');
  if (fill) fill.style.width = safePercent + '%';
  if (percentEl) percentEl.textContent = safePercent + '%';
  if (textEl && text) textEl.textContent = text;
}

function startBiliLoading() {
  document.getElementById('biliLoading').style.display = 'block';
  document.getElementById('biliResult').style.display = 'none';
  document.getElementById('biliError').style.display = 'none';
  setBiliProgress(0, '正在准备解析...');
}

function stopBiliLoading() {
  document.getElementById('biliLoading').style.display = 'none';
}

// ===== 格式化数字 =====
function formatCount(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toString();
}

// ===== 格式化时长 =====
function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ===== 清晰度映射 =====
const QUALITY_MAP = {
  16:  '流畅 360P',
  32:  '清晰 480P',
  64:  '高清 720P',
  80:  '高清 1080P',
  112: '高清 1080P+',
  116: '高清 1080P60',
  120: '超清 4K',
  125: '真彩 HDR',
  126: '杜比视界',
  127: '超高清 8K',
  30216: '音频 64K',
  30232: '音频 132K',
  30280: '音频 192K',
};

// ===== 编码格式映射 =====
const CODEC_MAP = {
  'avc1': 'H.264 (AVC)',
  'hev1': 'H.265 (HEVC)',
  'av01': 'AV1',
  'mp4a': 'AAC',
};

function getCodecName(codec) {
  for (const key in CODEC_MAP) {
    if (codec.startsWith(key)) return CODEC_MAP[key];
  }
  return codec;
}

// ===== 主解析流程 =====
async function biliParse() {
  const input = document.getElementById('biliInput').value;
  const bvid = extractBvid(input);

  if (!bvid) {
    showToast('请输入有效的 BV 号或视频链接');
    return;
  }

  // 显示加载状态
  startBiliLoading();

  try {
    // Step 1: 获取视频信息（含 cid）
    setBiliProgress(15, '正在获取视频基础信息...');
    const viewResp = await biliFetch(`/x/web-interface/view?bvid=${bvid}`);

    if (viewResp.code !== 0) {
      throw new Error(viewResp.message || '视频信息获取失败');
    }

    const data = viewResp.data;
    biliVideoData = {
      bvid: data.bvid,
      aid: data.aid,
      cid: data.cid,
      title: data.title,
      pic: data.pic,
      desc: data.desc,
      duration: data.duration,
      owner: data.owner,
      stat: data.stat,
      pages: data.pages,
    };

    // Step 2: 使用 api.bilibili.com/x/player/playurl 获取播放地址（DASH 格式）
    setBiliProgress(55, '正在调用 api.bilibili.com/x/player/playurl...');
    const playUrlResp = await biliFetch(
      `${BILI_PLAYURL_API}?bvid=${bvid}&cid=${data.cid}&qn=120&fnver=0&fnval=16&fourk=1`
    );

    if (playUrlResp.code !== 0) {
      throw new Error(playUrlResp.message || '播放地址获取失败');
    }

    biliPlayUrlData = playUrlResp.data;

    // 渲染结果
    setBiliProgress(82, '正在整理清晰度和下载链接...');
    renderVideoInfo();
    renderQualityList();
    renderDownloadLinks();

    setBiliProgress(100, '解析完成');
    await new Promise(resolve => setTimeout(resolve, 350));
    stopBiliLoading();
    document.getElementById('biliResult').style.display = 'block';
    showToast('解析成功');

  } catch (err) {
    setBiliProgress(100, '解析失败');
    stopBiliLoading();
    document.getElementById('biliError').style.display = 'block';
    let errMsg = err.message || '未知错误';
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
      errMsg = '网络请求失败。GitHub Pages 无法直接读取 api.bilibili.com，请配置自己的代理地址后重试';
    }
    document.getElementById('biliErrorMsg').textContent = '解析失败：' + errMsg;
  }
}

// ===== 渲染视频信息 =====
function renderVideoInfo() {
  const d = biliVideoData;
  document.getElementById('biliCover').src = d.pic;
  document.getElementById('biliCover').onerror = function() {
    this.style.display = 'none';
  };
  document.getElementById('biliTitle').textContent = d.title;
  document.getElementById('biliAuthor').textContent = 'UP主: ' + d.owner.name;
  document.getElementById('biliDuration').textContent = '时长: ' + formatDuration(d.duration);
  document.getElementById('biliView').textContent = formatCount(d.stat.view);
  document.getElementById('biliReply').textContent = formatCount(d.stat.reply);
  document.getElementById('biliFav').textContent = formatCount(d.stat.favorite);
  document.getElementById('biliLike').textContent = formatCount(d.stat.like);
}

// ===== 渲染清晰度列表 =====
function renderQualityList() {
  const container = document.getElementById('biliQualityList');
  const acceptQuality = biliPlayUrlData.accept_quality || [];
  const acceptDesc = biliPlayUrlData.accept_description || [];

  container.innerHTML = acceptQuality.map((qn, i) => {
    const desc = acceptDesc[i] || QUALITY_MAP[qn] || `质量 ${qn}`;
    const isActive = qn === selectedQuality;
    return `<button class="bili-quality-btn ${isActive ? 'active' : ''}" onclick="selectQuality(${qn})">${desc}</button>`;
  }).join('');
}

// ===== 选择清晰度 =====
function selectQuality(qn) {
  selectedQuality = qn;
  renderQualityList();
  renderDownloadLinks();
}

// ===== 渲染下载链接 =====
function renderDownloadLinks() {
  const container = document.getElementById('biliDownloadLinks');
  const downloadArea = document.getElementById('biliDownloadArea');

  if (!biliPlayUrlData || !biliPlayUrlData.dash) {
    downloadArea.style.display = 'none';
    return;
  }

  downloadArea.style.display = 'block';

  const dash = biliPlayUrlData.dash;
  let html = '';

  // 视频流：筛选当前选中清晰度
  const videos = (dash.video || []).filter(v => v.id === selectedQuality);
  if (videos.length === 0) {
    // 如果没有精确匹配，取所有视频流
    const allVideos = dash.video || [];
    const availableQns = [...new Set(allVideos.map(v => v.id))];
    if (!availableQns.includes(selectedQuality)) {
      // 自动切换到可用的最高清晰度
      selectedQuality = availableQns[0] || 80;
      renderQualityList();
    }
  }

  const videoStreams = (dash.video || []).filter(v => v.id === selectedQuality);

  videoStreams.forEach((v, i) => {
    const codecName = getCodecName(v.codecs || '');
    const sizeInfo = v.width && v.height ? `${v.width}x${v.height}` : '';
    const codecLabel = videoStreams.length > 1 ? ` [${codecName}]` : '';
    const url = v.baseUrl || v.base_url || '';
    html += `
      <div class="bili-dl-item">
        <div class="bili-dl-info">
          <span class="bili-dl-type bili-dl-type-video">视频</span>
          <span class="bili-dl-label">${QUALITY_MAP[selectedQuality] || '未知'}${codecLabel} ${sizeInfo}</span>
        </div>
        <a class="bili-dl-link" href="${url}" target="_blank" rel="noopener" download="${biliVideoData.title}_video_${i}.m4s">下载</a>
      </div>
    `;
  });

  // 音频流：取最高质量
  const audioStreams = (dash.audio || []).sort((a, b) => (b.id || 0) - (a.id || 0));
  if (audioStreams.length > 0) {
    const a = audioStreams[0];
    const codecName = getCodecName(a.codecs || '');
    const url = a.baseUrl || a.base_url || '';
    html += `
      <div class="bili-dl-item">
        <div class="bili-dl-info">
          <span class="bili-dl-type bili-dl-type-audio">音频</span>
          <span class="bili-dl-label">${QUALITY_MAP[a.id] || '音频'} ${codecName}</span>
        </div>
        <a class="bili-dl-link" href="${url}" target="_blank" rel="noopener" download="${biliVideoData.title}_audio.m4s">下载</a>
      </div>
    `;
  }

  if (!html) {
    html = '<div style="text-align:center;padding:20px;color:var(--text-sub);font-size:12px;">未找到可下载的流</div>';
  }

  container.innerHTML = html;
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
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
init();
