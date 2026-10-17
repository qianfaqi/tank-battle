/* ========== 用户系统（登录/注册/游客 + 云存档） ========== */
var LOCAL_ACCOUNT_KEY = 'tank_local_accounts';
var LOCAL_SESSION_KEY = 'tank_local_session';

function authHeaders() {
  return authToken
    ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }
    : { 'Content-Type': 'application/json' };
}

/* ---- 后端探测 ---- */
async function detectBackend() {
  try {
    var res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
    });
    backendAvailable = (res.status !== 404 && res.status !== 0);
  } catch (e) { backendAvailable = false; }
  return backendAvailable;
}

/* ---- 本地账号存储（游客模式） ---- */
function getLocalAccounts() {
  try { var s = localStorage.getItem(LOCAL_ACCOUNT_KEY); return s ? JSON.parse(s) : {}; }
  catch (e) { return {}; }
}
function saveLocalAccounts(accounts) { try { localStorage.setItem(LOCAL_ACCOUNT_KEY, JSON.stringify(accounts)); } catch (e) {} }
function getLocalSession() { try { var s = localStorage.getItem(LOCAL_SESSION_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function saveLocalSession(session) {
  try { if (session) localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(LOCAL_SESSION_KEY); } catch (e) {}
}
function localHash(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return 'lh_' + Math.abs(h).toString(36);
}

/* ========== Auth 模块 ========== */
var Auth = {
  tab: 'login',

  switchTab: function (tab) {
    this.tab = tab;
    document.querySelectorAll('.login-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    var submit = document.getElementById('login-submit');
    if (submit) submit.textContent = tab === 'login' ? '登 录' : '注 册';
    var err = document.getElementById('login-error');
    if (err) err.textContent = '';
  },

  async submit() {
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;
    var errEl = document.getElementById('login-error');
    errEl.textContent = '';

    if (!username || !password) { errEl.textContent = '请填写用户名和密码'; return; }
    if (password.length < 6) { errEl.textContent = '密码至少6位'; return; }
    if (username.length < 3 || username.length > 20) { errEl.textContent = '用户名需3-20个字符'; return; }

    var btn = document.getElementById('login-submit');
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = '处理中...';

    try {
      var ok = this.tab === 'login' ? await this._doLogin(username, password) : await this._doRegister(username, password);
      if (ok) {
        Router.navigate('main');
      }
    } catch (e) {
      errEl.textContent = (e && e.message) || '网络错误';
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  },

  async _doLogin(username, password) {
    if (backendAvailable) {
      try {
        var res = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || '登录失败');
        authToken = data.token; currentUser = data.user;
        userUnlockedTanks = data.unlockedTanks || INITIAL_TANKS.slice();
        userStats = data.stats || {};
        localStorage.setItem('tank_token', authToken);
        isGuestMode = false;
        return true;
      } catch (e) {
        // 后端失败 → 尝试本地
        return this._localLogin(username, password);
      }
    }
    return this._localLogin(username, password);
  },

  _localLogin(username, password) {
    var accounts = getLocalAccounts();
    var acc = accounts[username];
    if (!acc) throw new Error('用户名不存在（可点"游客模式"继续）');
    if (acc.passwordHash !== localHash(password)) throw new Error('密码错误');
    authToken = 'local_' + username;
    currentUser = { username: username };
    userUnlockedTanks = acc.unlockedTanks || INITIAL_TANKS.slice();
    userStats = acc.stats || { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0, max_streak: 0, campaign_cleared: 0, unlocked_tanks: userUnlockedTanks.length };
    saveLocalSession({ username: username, token: authToken });
    localStorage.setItem('tank_token', authToken);
    isGuestMode = true;
    return true;
  },

  async _doRegister(username, password) {
    if (backendAvailable) {
      try {
        var res = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || '注册失败');
        authToken = data.token; currentUser = data.user;
        userUnlockedTanks = data.unlockedTanks || INITIAL_TANKS.slice();
        userStats = data.stats || {};
        localStorage.setItem('tank_token', authToken);
        isGuestMode = false;
        return true;
      } catch (e) {
        return this._localRegister(username, password);
      }
    }
    return this._localRegister(username, password);
  },

  _localRegister(username, password) {
    var accounts = getLocalAccounts();
    if (accounts[username]) throw new Error('用户名已存在');
    accounts[username] = {
      username: username, passwordHash: localHash(password), createdAt: Date.now(),
      unlockedTanks: INITIAL_TANKS.slice(),
      stats: { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0, max_streak: 0, current_streak: 0, campaign_cleared: 0, unlocked_tanks: INITIAL_TANKS.length }
    };
    saveLocalAccounts(accounts);
    authToken = 'local_' + username;
    currentUser = { username: username };
    userUnlockedTanks = INITIAL_TANKS.slice();
    userStats = accounts[username].stats;
    saveLocalSession({ username: username, token: authToken });
    localStorage.setItem('tank_token', authToken);
    isGuestMode = true;
    return true;
  },

  guest() {
    playClick();
    var guestName = 'Guest_' + Math.random().toString(36).slice(2, 7);
    var accounts = getLocalAccounts();
    if (!accounts[guestName]) {
      accounts[guestName] = {
        username: guestName, passwordHash: '', createdAt: Date.now(),
        unlockedTanks: INITIAL_TANKS.slice(),
        stats: { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0, max_streak: 0, current_streak: 0, campaign_cleared: 0, unlocked_tanks: INITIAL_TANKS.length }
      };
      saveLocalAccounts(accounts);
    }
    authToken = 'local_' + guestName;
    currentUser = { username: guestName };
    userUnlockedTanks = accounts[guestName].unlockedTanks || INITIAL_TANKS.slice();
    userStats = accounts[guestName].stats;
    saveLocalSession({ username: guestName, token: authToken });
    localStorage.setItem('tank_token', authToken);
    isGuestMode = true;
    Router.navigate('main');
  }
};

/* ========== 账号管理 / 登出 ========== */
async function doLogout() {
  playClick();
  if (backendAvailable && authToken && authToken.indexOf('local_') !== 0) {
    try { await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }); } catch (e) {}
  }
  authToken = null; currentUser = null; userUnlockedTanks = null;
  userStats = { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0, max_streak: 0, campaign_cleared: 0, unlocked_tanks: 0 };
  localStorage.removeItem('tank_token');
  saveLocalSession(null);
  isGuestMode = false;
  closeModal('modal-account');
  Router.navigate('login');
}

async function fetchUserInfo() {
  if (!authToken) return;
  if (authToken.indexOf('local_') === 0) {
    var username = authToken.replace('local_', '');
    var accounts = getLocalAccounts();
    var acc = accounts[username];
    if (!acc) { doLogout(); return; }
    currentUser = { username: username };
    userUnlockedTanks = acc.unlockedTanks || INITIAL_TANKS.slice();
    userStats = acc.stats || {};
    renderAuthStats();
    updateAuthUI();
    return;
  }
  if (!backendAvailable) return;
  try {
    var res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (!res.ok) { if (res.status === 401) doLogout(); return; }
    var data = await res.json();
    currentUser = data.user;
    userUnlockedTanks = data.unlockedTanks;
    userStats = data.stats;
    renderAuthStats(); updateAuthUI();
  } catch (e) {}
}

function openAccountModal() {
  playClick(); openModal('modal-account');
  var userPanel = document.getElementById('auth-user-panel');
  var guestPanel = document.getElementById('auth-guest-panel');
  if (currentUser) {
    if (userPanel) userPanel.style.display = 'flex';
    if (guestPanel) guestPanel.style.display = 'none';
    document.getElementById('auth-current-user').textContent = currentUser.username + (isGuestMode ? '（游客）' : '');
    renderAuthStats(); fetchUserInfo();
  } else {
    if (userPanel) userPanel.style.display = 'none';
    if (guestPanel) guestPanel.style.display = 'flex';
  }
}

function renderAuthStats() {
  var el = document.getElementById('auth-stats'); if (!el) return;
  var s = userStats || {};
  var unlocked = userUnlockedTanks ? userUnlockedTanks.length : 0;
  el.innerHTML =
    '<div>🏆 胜场：' + (s.total_wins || 0) + '</div>' +
    '<div>💀 败场：' + (s.total_losses || 0) + '</div>' +
    '<div>🎮 总场次：' + (s.total_games || 0) + '</div>' +
    '<div>⚔️ 总伤害：' + ((s.total_damage || 0)).toFixed(1) + '</div>' +
    '<div>📜 通关战役：' + (s.campaign_cleared || 0) + ' / 5</div>' +
    '<div>🔓 已解锁坦克：' + unlocked + ' / ' + TANK_CONFIGS.length + '</div>';
}

function updateAuthUI() {
  var userEl = document.getElementById('topbar-username');
  var avatarEl = document.getElementById('topbar-avatar');
  if (userEl) userEl.textContent = currentUser ? currentUser.username + (isGuestMode ? '(游客)' : '') : '未登录';
  if (avatarEl) avatarEl.textContent = currentUser ? '👤' : '👤';
}

/* ========== 战绩上报 ========== */
async function reportGameResult(winnerTeam) {
  if (devMode) return;
  if (!authToken) return;
  if (gameMode === 'campaign' || onlineRunning) return;

  var isPve = gameMode === 'pve';
  var playerTeam = 'red';
  var playerWon = winnerTeam === playerTeam;
  var result = playerWon ? 'win' : 'loss';
  var tankUsed = redSelectedTank || 'basic';
  var dmg = redDamageDealt || 0;

  if (authToken.indexOf('local_') === 0) {
    var username = authToken.replace('local_', '');
    var accounts = getLocalAccounts();
    var acc = accounts[username]; if (!acc) return;
    var s = acc.stats || {};
    s.total_games = (s.total_games || 0) + 1;
    s.total_damage = (s.total_damage || 0) + dmg;
    if (playerWon) {
      s.total_wins = (s.total_wins || 0) + 1;
      s.current_streak = (s.current_streak || 0) + 1;
      if (s.current_streak > (s.max_streak || 0)) s.max_streak = s.current_streak;
    } else {
      s.total_losses = (s.total_losses || 0) + 1; s.current_streak = 0;
    }
    acc.stats = s;
    var newUnlock = (isPve && playerWon) ? tryUnlockRandomTank(acc) : null;
    acc.stats.unlocked_tanks = acc.unlockedTanks.length;
    saveLocalAccounts(accounts);
    userStats = acc.stats; userUnlockedTanks = acc.unlockedTanks;
    renderAuthStats();
    if (newUnlock) {
      var newCfg = TANK_CONFIGS.find(function (t) { return t.id === newUnlock; });
      setTimeout(function () { showOverlay('🎉 解锁新坦克：' + (newCfg ? newCfg.name : newUnlock) + '！', 2500); playUnlock(); }, 2500);
    }
    return;
  }

  if (!backendAvailable) return;
  try {
    var res = await fetch('/api/game/unlock', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ mode: gameMode, result: result, tankUsed: tankUsed, damageDealt: dmg, turnCount: totalTurns || 0 })
    });
    var data = await res.json();
    if (data.success) {
      userUnlockedTanks = data.unlockedTanks; userStats = data.stats; renderAuthStats();
      if (data.newUnlock && result === 'win' && isPve) {
        var cfg = TANK_CONFIGS.find(function (t) { return t.id === data.newUnlock; });
        setTimeout(function () { showOverlay('🎉 解锁新坦克：' + (cfg ? cfg.name : data.newUnlock) + '！', 2500); playUnlock(); }, 2500);
      }
    }
  } catch (e) {}
}

function tryUnlockRandomTank(account) {
  var unlocked = account.unlockedTanks || INITIAL_TANKS.slice();
  var pool = [];
  for (var i = 0; i < TANK_CONFIGS.length; i++) {
    var cfg = TANK_CONFIGS[i];
    if (unlocked.indexOf(cfg.id) >= 0) continue;
    if (cfg.id === 'base_tank') continue;
    if (DERIVATIVE_TANK_IDS.has(cfg.id)) continue; // 只从可选坦克中解锁
    var rarity = TANK_RARITY[cfg.id] || 5;
    var weight = Math.max(1, Math.round(10 - rarity * 1.2));
    for (var w = 0; w < weight; w++) pool.push(cfg.id);
  }
  if (!pool.length) return null;
  var picked = pool[Math.floor(Math.random() * pool.length)];
  if (!account.unlockedTanks) account.unlockedTanks = INITIAL_TANKS.slice();
  account.unlockedTanks.push(picked);
  return picked;
}

/* ========== 排行榜 ========== */
var currentLeaderboardSort = 'wins';
function openLeaderboardModal() { playClick(); openModal('modal-leaderboard'); switchLeaderboard(currentLeaderboardSort); }
async function switchLeaderboard(sortBy) {
  currentLeaderboardSort = sortBy;
  ['wins', 'damage', 'games'].forEach(function (s) {
    var b = document.getElementById('lb-sort-' + s); if (b) b.classList.toggle('active', s === sortBy);
  });
  var listEl = document.getElementById('leaderboard-list'); if (!listEl) return;
  listEl.innerHTML = '<p class="loading-text">加载中...</p>';

  if (backendAvailable) {
    try {
      var res = await fetch('/api/leaderboard?sort=' + sortBy + '&limit=20');
      var data = await res.json();
      if (!data.leaderboard || !data.leaderboard.length) { listEl.innerHTML = '<p class="empty-text">暂无数据</p>'; return; }
      listEl.innerHTML = data.leaderboard.map(function (row) {
        var medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : '#' + row.rank;
        var isMe = currentUser && row.username === currentUser.username;
        return '<div class="lb-row ' + (isMe ? 'me' : '') + '"><span class="medal">' + medal + '</span><span class="name">' + row.username + '</span><span class="stats">🏆' + row.wins + ' | ⚔️' + (row.damage || 0).toFixed(0) + ' | 🎮' + row.games + '</span></div>';
      }).join('');
      return;
    } catch (e) {}
  }
  var accounts = getLocalAccounts(); var rows = [];
  for (var un in accounts) {
    var s = accounts[un].stats || {};
    rows.push({ username: un, wins: s.total_wins || 0, games: s.total_games || 0, damage: s.total_damage || 0 });
  }
  if (!rows.length) { listEl.innerHTML = '<p class="empty-text">暂无本地数据</p>'; return; }
  rows.sort(function (a, b) { return sortBy === 'wins' ? b.wins - a.wins : sortBy === 'damage' ? b.damage - a.damage : b.games - a.games; });
  listEl.innerHTML = '<p style="text-align:center;color:var(--dim);font-size:.7rem;padding:6px;">📴 本地模式</p>' + rows.map(function (row, i) {
    var medal = (i + 1) === 1 ? '🥇' : (i + 1) === 2 ? '🥈' : (i + 1) === 3 ? '🥉' : '#' + (i + 1);
    var isMe = currentUser && row.username === currentUser.username;
    return '<div class="lb-row ' + (isMe ? 'me' : '') + '"><span class="medal">' + medal + '</span><span class="name">' + row.username + '</span><span class="stats">🏆' + row.wins + ' | ⚔️' + row.damage.toFixed(0) + ' | 🎮' + row.games + '</span></div>';
  }).join('');
}