// ===== Appwrite 统一登录注册逻辑 =====
let authMode = 'login';
let appwriteClient = null;
let appwriteAccount = null;
let appwriteDatabases = null;

function getAppwriteConfig() {
  const cfg = window.APPWRITE_CONFIG || {};
  const endpoint = (cfg.endpoint || '').trim();
  const projectId = (cfg.projectId || '').trim();
  const databaseId = (cfg.databaseId || '').trim();
  if (!endpoint || !projectId || projectId.includes('请填写')) return null;
  return { endpoint, projectId, databaseId };
}

function initAppwriteClient() {
  const cfg = getAppwriteConfig();
  if (!cfg || !window.Appwrite) return false;
  if (appwriteClient && appwriteAccount) return true;
  appwriteClient = new Appwrite.Client()
    .setEndpoint(cfg.endpoint)
    .setProject(cfg.projectId);
  appwriteAccount = new Appwrite.Account(appwriteClient);
  if (cfg.databaseId && Appwrite.Databases) {
    appwriteDatabases = new Appwrite.Databases(appwriteClient, cfg.databaseId);
  }
  return true;
}

// 获取 Databases 实例，供各页面读写用户数据使用
function getAppwriteDatabases() {
  if (!initAppwriteClient()) return null;
  return appwriteDatabases;
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('errorMsg').classList.remove('show');
}

function switchTab(mode) {
  authMode = mode;
  const lt = document.getElementById('loginTab'), rt = document.getElementById('registerTab');
  const t = document.getElementById('modalTitle'), s = document.getElementById('modalSub'), b = document.getElementById('submitBtn');
  const ft = document.getElementById('footerText'), fl = document.querySelector('.modal-footer a');
  const rf = document.querySelectorAll('.register-fields'), fr = document.getElementById('formRow');
  if (mode === 'login') {
    lt.classList.add('active'); rt.classList.remove('active');
    t.textContent = '欢迎回来'; s.textContent = '登录以同步你的工具收藏'; b.textContent = '登 录';
    ft.textContent = '还没有账号？'; fl.textContent = '立即注册'; fl.onclick = () => switchTab('register');
    fr.style.display = 'flex'; rf.forEach(f => f.classList.remove('show'));
  } else {
    rt.classList.add('active'); lt.classList.remove('active');
    t.textContent = '创建账号'; s.textContent = '注册后可收藏常用工具'; b.textContent = '注 册';
    ft.textContent = '已有账号？'; fl.textContent = '去登录'; fl.onclick = () => switchTab('login');
    fr.style.display = 'none'; rf.forEach(f => f.classList.add('show'));
  }
  document.getElementById('errorMsg').classList.remove('show');
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const submitBtn = document.getElementById('submitBtn');
  if (!email || !password) { showError('请填写完整信息'); return; }
  if (password.length < 6) { showError('密码至少 6 位'); return; }
  if (!initAppwriteClient()) {
    showError('请先在 js/appwrite-config.js 填写 Appwrite Endpoint 和 Project ID');
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = authMode === 'register' ? '注册中...' : '登录中...';
  try {
    if (authMode === 'register') {
      const regName = document.getElementById('regName').value.trim();
      const regConfirm = document.getElementById('regConfirm').value;
      if (!regName) { showError('请输入用户名'); return; }
      if (password !== regConfirm) { showError('两次密码不一致'); return; }
      await appwriteAccount.create(Appwrite.ID.unique(), email, password, regName);
      await appwriteAccount.createEmailPasswordSession(email, password);
      showToast('注册成功，已自动登录');
    } else {
      await appwriteAccount.createEmailPasswordSession(email, password);
      showToast('登录成功');
    }
    const user = await appwriteAccount.get();
    loginUser(user);
  } catch (err) {
    showError(getAppwriteErrorMessage(err, authMode === 'register' ? '注册失败' : '登录失败'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = authMode === 'register' ? '注 册' : '登 录';
  }
}

function getAppwriteErrorMessage(err, fallback) {
  const msg = err?.message || fallback;
  if (msg.includes('Invalid credentials')) return '邮箱或密码错误';
  if (msg.includes('already exists')) return '该邮箱已注册';
  if (msg.includes('Password')) return '密码格式不符合要求';
  if (msg.includes('Network')) return '网络连接失败，请稍后重试';
  return msg;
}

function loginUser(user) {
  const name = user?.name || user?.email || '用户';
  currentUser = user;
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('userMenu').classList.add('show');
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
  closeModal();
  document.getElementById('authForm').reset();
}

async function logout() {
  currentUser = null;
  if (initAppwriteClient()) {
    try { await appwriteAccount.deleteSession('current'); } catch (_) {}
  }
  document.getElementById('loginBtn').style.display = 'flex';
  document.getElementById('userMenu').classList.remove('show');
  showToast('已退出登录');
}

function socialLogin(p) {
  showToast(`${p} 登录需要先在 Appwrite 控制台配置 OAuth`);
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

async function restoreAppwriteSession() {
  if (!initAppwriteClient()) return;
  try {
    const user = await appwriteAccount.get();
    loginUser(user);
  } catch (_) {
    currentUser = null;
    document.getElementById('loginBtn').style.display = 'flex';
    document.getElementById('userMenu').classList.remove('show');
  }
}

restoreAppwriteSession();
