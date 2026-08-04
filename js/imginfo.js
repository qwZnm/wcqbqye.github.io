// ===== 读取图片信息页面专用脚本 =====
// 浏览器端只读取本地文件，不上传图片；更完整的 EXIF 可使用 python/read_img.py。

let currentUser = null;
let currentImageInfo = null;

const EXIF_TAGS = {
  0x010F: '相机制造商',
  0x0110: '相机型号',
  0x0131: '软件',
  0x0132: '修改时间',
  0x829A: '曝光时间',
  0x829D: '光圈值',
  0x8827: 'ISO',
  0x9003: '拍摄时间',
  0x9204: '曝光补偿',
  0x920A: '焦距',
  0xA002: 'EXIF 宽度',
  0xA003: 'EXIF 高度',
  0xA403: '白平衡',
};

function setupImageDrop() {
  const zone = document.getElementById('imgDropZone');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
  });
}

async function handleImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const imageMeta = await readImageDimensions(file);
    const exif = parseExif(arrayBuffer);
    const gps = parseGps(exif.rawTags || {});

    currentImageInfo = {
      file: {
        name: file.name,
        type: file.type || '未知',
        size: file.size,
        sizeText: formatSize(file.size),
        lastModified: new Date(file.lastModified).toLocaleString('zh-CN'),
      },
      image: imageMeta,
      exif: exif.fields,
      gps,
    };

    renderImageInfo(file, currentImageInfo);
    showToast('图片信息读取完成');
  } catch (err) {
    showToast('读取失败：' + (err.message || '未知错误'));
  }
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const info = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth && img.naturalHeight ? (img.naturalWidth / img.naturalHeight).toFixed(4) : '-',
      };
      URL.revokeObjectURL(url);
      resolve(info);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片预览加载失败'));
    };
    img.src = url;
  });
}

function parseExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const result = { fields: {}, rawTags: {} };

  // 仅 JPEG 通常包含标准 EXIF
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
    result.fields['EXIF 状态'] = '当前格式未检测到标准 JPEG EXIF';
    return result;
  }

  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    const length = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xFFE1) {
      const exifHeader = getAscii(view, offset, 6);
      if (exifHeader !== 'Exif\0\0') break;
      const tiffOffset = offset + 6;
      const little = view.getUint16(tiffOffset, false) === 0x4949;
      const firstIfdOffset = view.getUint32(tiffOffset + 4, little);
      readIfd(view, tiffOffset + firstIfdOffset, tiffOffset, little, result);
      return result;
    }
    offset += length - 2;
  }

  result.fields['EXIF 状态'] = '未检测到 EXIF 信息';
  return result;
}

function readIfd(view, ifdOffset, tiffOffset, little, result) {
  if (ifdOffset <= 0 || ifdOffset + 2 > view.byteLength) return;
  const entries = view.getUint16(ifdOffset, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) continue;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const count = view.getUint32(entry + 4, little);
    const valueOffset = entry + 8;
    const value = readExifValue(view, type, count, valueOffset, tiffOffset, little);
    result.rawTags[tag] = value;

    if (EXIF_TAGS[tag]) {
      result.fields[EXIF_TAGS[tag]] = formatExifValue(value);
    }

    // EXIF 子 IFD
    if (tag === 0x8769 && typeof value === 'number') {
      readIfd(view, tiffOffset + value, tiffOffset, little, result);
    }
    // GPS 子 IFD
    if (tag === 0x8825 && typeof value === 'number') {
      readGpsIfd(view, tiffOffset + value, tiffOffset, little, result);
    }
  }
}

function readGpsIfd(view, ifdOffset, tiffOffset, little, result) {
  if (ifdOffset <= 0 || ifdOffset + 2 > view.byteLength) return;
  const entries = view.getUint16(ifdOffset, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) continue;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const count = view.getUint32(entry + 4, little);
    const value = readExifValue(view, type, count, entry + 8, tiffOffset, little);
    result.rawTags['GPS_' + tag] = value;
  }
}

function readExifValue(view, type, count, valueOffset, tiffOffset, little) {
  const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 1;
  const totalSize = typeSize * count;
  const dataOffset = totalSize <= 4 ? valueOffset : tiffOffset + view.getUint32(valueOffset, little);
  if (dataOffset < 0 || dataOffset >= view.byteLength) return null;

  if (type === 2) return getAscii(view, dataOffset, count).replace(/\0+$/, '');
  if (type === 3) return count === 1 ? view.getUint16(dataOffset, little) : readArray(view, dataOffset, count, 2, little);
  if (type === 4) return count === 1 ? view.getUint32(dataOffset, little) : readArray(view, dataOffset, count, 4, little);
  if (type === 5) return readRationalArray(view, dataOffset, count, little, false);
  if (type === 9) return view.getInt32(dataOffset, little);
  if (type === 10) return readRationalArray(view, dataOffset, count, little, true);
  if (type === 1 || type === 7) return count === 1 ? view.getUint8(dataOffset) : readByteArray(view, dataOffset, count);
  return null;
}

function readArray(view, offset, count, size, little) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(size === 2 ? view.getUint16(offset + i * size, little) : view.getUint32(offset + i * size, little));
  }
  return arr;
}

function readByteArray(view, offset, count) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(view.getUint8(offset + i));
  return arr;
}

function readRationalArray(view, offset, count, little, signed) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const pos = offset + i * 8;
    const num = signed ? view.getInt32(pos, little) : view.getUint32(pos, little);
    const den = signed ? view.getInt32(pos + 4, little) : view.getUint32(pos + 4, little);
    arr.push({ num, den, value: den ? num / den : 0 });
  }
  return count === 1 ? arr[0] : arr;
}

function getAscii(view, offset, length) {
  let str = '';
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

function formatExifValue(value) {
  if (value == null) return '无';
  if (Array.isArray(value)) return value.map(formatExifValue).join(', ');
  if (typeof value === 'object' && 'num' in value && 'den' in value) {
    return value.den ? `${value.num}/${value.den} (${value.value.toFixed(4)})` : `${value.num}/0`;
  }
  return String(value);
}

function parseGps(rawTags) {
  const latRef = rawTags.GPS_1;
  const lat = rawTags.GPS_2;
  const lngRef = rawTags.GPS_3;
  const lng = rawTags.GPS_4;
  if (!latRef || !lat || !lngRef || !lng) return null;
  const latitude = gpsArrayToDecimal(lat, latRef);
  const longitude = gpsArrayToDecimal(lng, lngRef);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function gpsArrayToDecimal(arr, ref) {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const decimal = arr[0].value + arr[1].value / 60 + arr[2].value / 3600;
  const sign = String(ref).toUpperCase().includes('S') || String(ref).toUpperCase().includes('W') ? -1 : 1;
  return Number((decimal * sign).toFixed(8));
}

function renderImageInfo(file, info) {
  const result = document.getElementById('imgResult');
  const preview = document.getElementById('imgPreview');
  preview.src = URL.createObjectURL(file);
  preview.onload = () => URL.revokeObjectURL(preview.src);

  document.getElementById('imgName').textContent = info.file.name;
  document.getElementById('imgDesc').textContent = `${info.image.width} × ${info.image.height} · ${info.file.type} · ${info.file.sizeText}`;

  renderGrid('basicInfoGrid', {
    '文件名': info.file.name,
    '文件类型': info.file.type,
    '文件大小': info.file.sizeText,
    '修改时间': info.file.lastModified,
    '图片宽度': info.image.width + ' px',
    '图片高度': info.image.height + ' px',
    '宽高比': info.image.ratio,
  });

  renderGrid('exifInfoGrid', Object.keys(info.exif).length ? info.exif : { 'EXIF 状态': '未读取到常见 EXIF 信息' });
  renderGrid('gpsInfoGrid', info.gps ? {
    '纬度': info.gps.latitude,
    '经度': info.gps.longitude,
    '地图': `https://www.google.com/maps?q=${info.gps.latitude},${info.gps.longitude}`,
  } : { 'GPS 状态': '未读取到 GPS 信息' });

  result.classList.add('show');
}

function renderGrid(id, data) {
  const grid = document.getElementById(id);
  grid.innerHTML = Object.entries(data).map(([label, value]) => `
    <div class="img-info-item">
      <div class="img-info-label">${escapeHtml(label)}</div>
      <div class="img-info-value">${escapeHtml(String(value ?? '无'))}</div>
    </div>
  `).join('');
}

function copyImageInfo() {
  if (!currentImageInfo) { showToast('没有可复制的信息'); return; }
  navigator.clipboard.writeText(JSON.stringify(currentImageInfo, null, 2)).then(() => showToast('已复制图片信息'));
}

function downloadImageInfo() {
  if (!currentImageInfo) { showToast('没有可导出的信息'); return; }
  const blob = new Blob([JSON.stringify(currentImageInfo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentImageInfo.file.name.replace(/\.[^.]+$/, '') + '_image_info.json';
  a.click();
  URL.revokeObjectURL(url);
}

function clearImageInfo() {
  currentImageInfo = null;
  document.getElementById('imgFileInput').value = '';
  document.getElementById('imgResult').classList.remove('show');
  document.getElementById('imgPreview').src = '';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
}

// ===== 登录弹窗与主题 =====
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

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('toolbox_theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('themeIcon');
  icon.innerHTML = isDark ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
}

let toastTimer;
function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 2500); }

function init() {
  const savedTheme = localStorage.getItem('toolbox_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
  }
  const savedUser = localStorage.getItem('toolbox_user');
  if (savedUser) loginUser(savedUser);
  setupImageDrop();
}
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
init();
