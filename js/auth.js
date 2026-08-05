// ===== 统一登录注册逻辑（本地 localStorage 存储）=====
let authMode = 'login';

// ===== 弹窗控制 =====
function openModal() {
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('errorMsg').classList.remove('show');
}

// ===== Tab 切换 =====
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

// ===== 用户存储 =====
function getUsers() {
  try { return JSON.parse(localStorage.getItem('toolbox_users') || '[]'); } catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem('toolbox_users', JSON.stringify(users));
}

// ===== 登录/注册处理 =====
function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const submitBtn = document.getElementById('submitBtn');
  if (!email || !password) { showError('请填写完整信息'); return; }
  if (password.length < 6) { showError('密码至少 6 位'); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = authMode === 'register' ? '注册中...' : '登录中...';

  if (authMode === 'register') {
    const regName = document.getElementById('regName').value.trim();
    const regConfirm = document.getElementById('regConfirm').value;
    if (!regName) { showError('请输入用户名'); submitBtn.disabled = false; submitBtn.textContent = '注 册'; return; }
    if (password !== regConfirm) { showError('两次密码不一致'); submitBtn.disabled = false; submitBtn.textContent = '注 册'; return; }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
      showError('该邮箱已注册');
      submitBtn.disabled = false;
      submitBtn.textContent = '注 册';
      return;
    }

    const user = { name: regName, email: email, password: password };
    users.push(user);
    saveUsers(users);
    localStorage.setItem('toolbox_current_user', JSON.stringify(user));
    showToast('注册成功，已自动登录');
    loginUser(user);
  } else {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      showError('邮箱或密码错误');
      submitBtn.disabled = false;
      submitBtn.textContent = '登 录';
      return;
    }
    localStorage.setItem('toolbox_current_user', JSON.stringify(user));
    showToast('登录成功');
    loginUser(user);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = authMode === 'register' ? '注 册' : '登 录';
}

// ===== 登录状态 UI 更新 =====
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

// ===== 退出登录 =====
function logout() {
  currentUser = null;
  localStorage.removeItem('toolbox_current_user');
  document.getElementById('loginBtn').style.display = 'flex';
  document.getElementById('userMenu').classList.remove('show');
  showToast('已退出登录');
}

// ===== 第三方登录占位 =====
function socialLogin(p) {
  showToast(`${p} 登录暂未开通`);
}

// ===== 错误提示 =====
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

// ===== 恢复登录会话 =====
function restoreSession() {
  try {
    const saved = localStorage.getItem('toolbox_current_user');
    if (saved) {
      const user = JSON.parse(saved);
      loginUser(user);
    } else {
      currentUser = null;
      document.getElementById('loginBtn').style.display = 'flex';
      document.getElementById('userMenu').classList.remove('show');
    }
  } catch {
    currentUser = null;
    document.getElementById('loginBtn').style.display = 'flex';
    document.getElementById('userMenu').classList.remove('show');
  }
}

restoreSession();
