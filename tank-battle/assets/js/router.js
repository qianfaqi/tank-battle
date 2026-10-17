/* ============================================================
   路由 + 初始化 + 场景选择
============================================================ */
var Router = {
  currentView: 'login',
  _transitioning: false,

  navigate(view) {
    if (this.currentView === view) return;
    var loginView = document.getElementById('view-login');
    var mainView  = document.getElementById('view-main');
    if (view === 'login') {
      if (loginView) loginView.classList.add('active');
      if (mainView)  mainView.classList.remove('active');
    } else {
      if (loginView) loginView.classList.remove('active');
      if (mainView)  mainView.classList.add('active');
      this._initMainApp();
    }
    this.currentView = view;
  },

  _initMainApp() {
    updateAuthUI();
    if (currentUser) {
      if (authToken && authToken.indexOf('local_') !== 0 && backendAvailable) fetchUserInfo();
      else if (userUnlockedTanks === null && authToken && authToken.indexOf('local_') === 0) fetchUserInfo();
    }
    switchScreen('screen-main');
    AudioManager.startMenuMusic();
  }
};

/* ========== 场景选择流程 ========== */
function openDualMenu(mode) {
  playClick();
  gameMode = mode; currentState = 'DUAL_MENU';
  if (mode === 'pve') {
    var titleEl = document.querySelector('#screen-dual h2');
    if (titleEl) titleEl.textContent = '🤖 人机对战';
    var blueTitle = document.getElementById('blue-card-title');
    var blueHint = document.getElementById('blue-ready-hint');
    var blueBtn = document.getElementById('btn-blue-ready');
    if (blueTitle) blueTitle.textContent = '🔵 AI 蓝方';
    if (blueHint) blueHint.textContent = 'AI 自动准备';
    if (blueBtn) blueBtn.style.display = 'none';
    blueReady = true;
    var blueCard = document.getElementById('blue-ready-card');
    if (blueCard) blueCard.classList.add('ready');
  } else {
    var titleEl2 = document.querySelector('#screen-dual h2');
    if (titleEl2) titleEl2.textContent = '⚔️ 双人对战';
    var blueTitle2 = document.getElementById('blue-card-title');
    if (blueTitle2) blueTitle2.textContent = '🔵 蓝方玩家';
    var blueHint2 = document.getElementById('blue-ready-hint');
    if (blueHint2) blueHint2.textContent = '点击准备';
    var blueBtn2 = document.getElementById('btn-blue-ready');
    if (blueBtn2) { blueBtn2.style.display = ''; blueBtn2.textContent = '准 备'; }
    blueReady = false;
    var blueCard2 = document.getElementById('blue-ready-card');
    if (blueCard2) blueCard2.classList.remove('ready');
  }
  redReady = false;
  var redCard = document.getElementById('red-ready-card');
  if (redCard) redCard.classList.remove('ready');
  var redBtn = document.getElementById('btn-red-ready');
  if (redBtn) redBtn.textContent = '准 备';
  switchScreen('screen-dual');
}

function toggleReady(team) {
  playClick();
  if (currentState !== 'DUAL_MENU') return;
  if (team === 'red') {
    redReady = !redReady;
    var card = document.getElementById('red-ready-card');
    var btn = document.getElementById('btn-red-ready');
    if (card) card.classList.toggle('ready', redReady);
    if (btn) btn.textContent = redReady ? '✅ 已准备' : '准 备';
  } else {
    if (gameMode === 'pve') return;
    blueReady = !blueReady;
    var card2 = document.getElementById('blue-ready-card');
    var btn2 = document.getElementById('btn-blue-ready');
    if (card2) card2.classList.toggle('ready', blueReady);
    if (btn2) btn2.textContent = blueReady ? '✅ 已准备' : '准 备';
  }
  if (redReady && blueReady) setTimeout(startTankSelect, 620);
}

/* ---------- 坦克选择 ---------- */
function startTankSelect() {
  currentState = 'TANK_SELECT';
  redSelectedTank = null; blueSelectedTank = null;
  tankSelectTimeLeft = 20;
  switchScreen('screen-tank-select');
  renderTankChoices('red'); renderTankChoices('blue');
  var redStatus = document.getElementById('red-tank-status');
  var blueStatus = document.getElementById('blue-tank-status');
  if (redStatus) redStatus.textContent = '等待选择...';
  if (blueStatus) blueStatus.textContent = '等待选择...';
  var fillEl = document.getElementById('tank-timer-fill');
  var textEl = document.getElementById('tank-timer-text');
  if (fillEl) { fillEl.style.width = '100%'; fillEl.classList.remove('warning'); }
  if (textEl) textEl.textContent = '剩余时间: 20秒';

  if (gameMode === 'pve') {
    var availTanks = TANK_CONFIGS.filter(function (cfg) { return !DERIVATIVE_TANK_IDS.has(cfg.id) && !cfg.isBaseTank; });
    var aiTankId = availTanks[Math.floor(Math.random() * availTanks.length)].id;
    blueSelectedTank = aiTankId;
    if (blueStatus) blueStatus.textContent = '✅ AI已选择: ' + TANK_CONFIGS.find(function (t) { return t.id === aiTankId; }).name;
    var cards = document.getElementById('blue-tank-list').querySelectorAll('.tank-card');
    cards.forEach(function (c) { c.classList.remove('selected'); c.style.pointerEvents = 'none'; });
    var aiCard = Array.from(cards).find(function (c) { return c.dataset.tankId === aiTankId; });
    if (aiCard) aiCard.classList.add('selected');
  }
  if (tankSelectTimer) clearInterval(tankSelectTimer);
  tankSelectTimer = setInterval(function () {
    tankSelectTimeLeft--;
    if (fillEl) fillEl.style.width = (tankSelectTimeLeft / 20 * 100) + '%';
    if (textEl) textEl.textContent = '剩余时间: ' + tankSelectTimeLeft + '秒';
    if (tankSelectTimeLeft <= 5 && fillEl) fillEl.classList.add('warning');
    if (tankSelectTimeLeft <= 0) { clearInterval(tankSelectTimer); tankSelectTimer = null; finalizeTankSelect(); }
  }, 1000);
}

function renderTankChoices(team) {
  var container = document.getElementById(team === 'red' ? 'red-tank-list' : 'blue-tank-list');
  if (!container) return;
  container.innerHTML = '';
  TANK_CONFIGS.forEach(function (cfg) {
    if (DERIVATIVE_TANK_IDS.has(cfg.id) || cfg.isBaseTank) return;
    if (team === 'red' && !isTankUnlocked(cfg.id)) return;
    var card = document.createElement('div');
    card.className = 'tank-card'; card.dataset.tankId = cfg.id;
    var atk = Number.isInteger(cfg.attack) ? cfg.attack : cfg.attack.toFixed(1);
    var spd = Number.isInteger(cfg.speed) ? cfg.speed : cfg.speed.toFixed(1);
    card.innerHTML = '<div class="tank-icon">' + drawTankIconSVG(cfg, 55, 45) + '</div>' +
      '<div class="tank-name">' + cfg.name + '</div>' +
      '<div class="tank-stats">❤' + cfg.hp + ' ⚡' + spd + '格 🎯' + cfg.range + '格 ⚔' + atk + (cfg.attackCount > 1 ? '×' + cfg.attackCount : '') + '</div>' +
      '<div class="tank-special">' + (cfg.special ? getSpecialShort(cfg.special) : '无特殊') + '</div>';
    card.onclick = function () { playClick(); selectTank(team, cfg.id, card, container); };
    container.appendChild(card);
  });
}

function selectTank(team, tankId, cardEl, container) {
  if (currentState !== 'TANK_SELECT') return;
  if (team === 'red') { redSelectedTank = tankId; var el = document.getElementById('red-tank-status'); if (el) el.textContent = '✅ 已选择: ' + TANK_CONFIGS.find(function (t) { return t.id === tankId; }).name; }
  else { blueSelectedTank = tankId; var el2 = document.getElementById('blue-tank-status'); if (el2) el2.textContent = '✅ 已选择: ' + TANK_CONFIGS.find(function (t) { return t.id === tankId; }).name; }
  container.querySelectorAll('.tank-card').forEach(function (c) { c.classList.remove('selected'); });
  cardEl.classList.add('selected');
  if (redSelectedTank && blueSelectedTank) { clearInterval(tankSelectTimer); tankSelectTimer = null; setTimeout(finalizeTankSelect, 420); }
}

function finalizeTankSelect() {
  if (!redSelectedTank) {
    var avail = TANK_CONFIGS.filter(function (t) { return !DERIVATIVE_TANK_IDS.has(t.id) && !t.isBaseTank && isTankUnlocked(t.id); });
    redSelectedTank = avail.length ? avail[0].id : 'basic';
  }
  if (!blueSelectedTank) blueSelectedTank = 'basic';
  if (tankSelectTimer) { clearInterval(tankSelectTimer); tankSelectTimer = null; }
  currentState = 'MAP_SELECT';
  startMapSelect();
}

function backFromTankSelect() {
  playClick();
  if (currentState !== 'TANK_SELECT') return;
  if (tankSelectTimer) { clearInterval(tankSelectTimer); tankSelectTimer = null; }
  redSelectedTank = null; blueSelectedTank = null;
  switchScreen('screen-dual');
}

/* ---------- 地图选择 ---------- */
function startMapSelect() {
  redSelectedMap = null; blueSelectedMap = null;
  mapSelectTimeLeft = 10;
  currentState = 'MAP_SELECT';
  switchScreen('screen-map-select');
  renderMapChoices('red'); renderMapChoices('blue');
  var redStatus = document.getElementById('red-map-status');
  var blueStatus = document.getElementById('blue-map-status');
  if (redStatus) redStatus.textContent = '等待选择...';
  if (blueStatus) blueStatus.textContent = '等待选择...';
  if (gameMode === 'pve') {
    var availMaps = MAP_CONFIGS.filter(function (m) { return !CAMPAIGN_ONLY_MAP_IDS.has(m.id); });
    var aiMapId = availMaps[Math.floor(Math.random() * availMaps.length)].id;
    blueSelectedMap = aiMapId;
    if (blueStatus) blueStatus.textContent = '✅ AI已选择: ' + MAP_CONFIGS.find(function (m) { return m.id === aiMapId; }).name;
    var cards = document.getElementById('blue-map-list').querySelectorAll('.map-card');
    cards.forEach(function (c) { c.classList.remove('selected'); });
    var aiCard = Array.from(cards).find(function (c) { return c.dataset.mapId === aiMapId; });
    if (aiCard) aiCard.classList.add('selected');
  }
  if (mapSelectTimer) clearInterval(mapSelectTimer);
  mapSelectTimer = setInterval(function () {
    mapSelectTimeLeft--;
    if (mapSelectTimeLeft <= 0) { clearInterval(mapSelectTimer); mapSelectTimer = null; finalizeMapSelect(); }
  }, 1000);
}

function renderMapChoices(team) {
  var container = document.getElementById(team === 'red' ? 'red-map-list' : 'blue-map-list');
  if (!container) return;
  container.innerHTML = '';
  MAP_CONFIGS.forEach(function (cfg) {
    if (CAMPAIGN_ONLY_MAP_IDS.has(cfg.id)) return;
    var card = document.createElement('div');
    card.className = 'map-card'; card.dataset.mapId = cfg.id;
    var cid = 'map-canvas-' + team + '-' + cfg.id;
    card.innerHTML = '<div class="map-thumb"><canvas id="' + cid + '"></canvas></div>' +
      '<div class="map-name">' + cfg.name + '</div>' +
      '<div class="tank-special" style="font-style:normal;">' + (cfg.tags || []).join(' ') + '</div>';
    card.onclick = function () { playClick(); selectMap(team, cfg.id, card, container); };
    container.appendChild(card);
    setTimeout(function () { renderMapThumb25D(document.getElementById(cid), cfg); }, 30);
  });
}

function selectMap(team, mapId, cardEl, container) {
  if (currentState !== 'MAP_SELECT') return;
  if (team === 'red') { redSelectedMap = mapId; var el = document.getElementById('red-map-status'); if (el) el.textContent = '✅ 已选择: ' + MAP_CONFIGS.find(function (m) { return m.id === mapId; }).name; }
  else { blueSelectedMap = mapId; var el2 = document.getElementById('blue-map-status'); if (el2) el2.textContent = '✅ 已选择: ' + MAP_CONFIGS.find(function (m) { return m.id === mapId; }).name; }
  container.querySelectorAll('.map-card').forEach(function (c) { c.classList.remove('selected'); });
  cardEl.classList.add('selected');
  if (redSelectedMap && blueSelectedMap) { clearInterval(mapSelectTimer); mapSelectTimer = null; setTimeout(finalizeMapSelect, 420); }
}

function finalizeMapSelect() {
  if (!redSelectedMap) {
    var avail = MAP_CONFIGS.filter(function (m) { return !CAMPAIGN_ONLY_MAP_IDS.has(m.id); });
    redSelectedMap = avail.length ? avail[0].id : MAP_CONFIGS[0].id;
  }
  if (!blueSelectedMap) blueSelectedMap = redSelectedMap;
  if (mapSelectTimer) { clearInterval(mapSelectTimer); mapSelectTimer = null; }
  if (gameMode === 'pve') finalMap = MAP_CONFIGS.find(function (m) { return m.id === redSelectedMap; }) || MAP_CONFIGS[0];
  else {
    if (redSelectedMap === blueSelectedMap) finalMap = MAP_CONFIGS.find(function (m) { return m.id === redSelectedMap; });
    else { var ids = [redSelectedMap, blueSelectedMap]; finalMap = MAP_CONFIGS.find(function (m) { return m.id === ids[Math.floor(Math.random() * 2)]; }); }
  }
  currentState = 'BASE_SELECT';
  startBaseSelect();
}

function backFromMapSelect() {
  playClick();
  if (currentState !== 'MAP_SELECT') return;
  if (mapSelectTimer) { clearInterval(mapSelectTimer); mapSelectTimer = null; }
  redSelectedMap = null; blueSelectedMap = null;
  currentState = 'TANK_SELECT';
  startTankSelect();
}

/* ---------- 基地选择 ---------- */
function startBaseSelect() {
  redSelectedBase = null; blueSelectedBase = null;
  baseSelectTimeLeft = 10;
  currentState = 'BASE_SELECT';
  gameMap = finalMap;
  gridData = initGridData(finalMap);
  switchScreen('screen-base-select');
  var redStatus = document.getElementById('red-base-status');
  var blueStatus = document.getElementById('blue-base-status');
  if (redStatus) redStatus.textContent = '等待选择...';
  if (blueStatus) blueStatus.textContent = '等待选择...';
  var fillEl = document.getElementById('base-timer-fill');
  var textEl = document.getElementById('base-timer-text');
  if (fillEl) { fillEl.style.width = '100%'; fillEl.classList.remove('warning'); }
  if (textEl) textEl.textContent = '剩余时间: 10秒';

  if (gameMode === 'pve') {
    var bases = [];
    for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) if (gridData[r][c].isBlueBase) bases.push(indexToPos(r, c));
    if (bases.length) {
      blueSelectedBase = bases[Math.floor(Math.random() * bases.length)];
      if (blueStatus) blueStatus.textContent = '✅ AI已选择: ' + blueSelectedBase;
    }
  }
  if (baseSelectTimer) clearInterval(baseSelectTimer);
  baseSelectTimer = setInterval(function () {
    baseSelectTimeLeft--;
    if (fillEl) fillEl.style.width = (baseSelectTimeLeft / 10 * 100) + '%';
    if (textEl) textEl.textContent = '剩余时间: ' + baseSelectTimeLeft + '秒';
    if (baseSelectTimeLeft <= 3 && fillEl) fillEl.classList.add('warning');
    if (baseSelectTimeLeft <= 0) { clearInterval(baseSelectTimer); baseSelectTimer = null; finalizeBaseSelect(); }
  }, 1000);

  drawBaseSelectCanvas();
  var canvas = document.getElementById('base-select-canvas');
  if (canvas) {
    canvas.onclick = function (e) {
      if (currentState !== 'BASE_SELECT') return;
      var cell = baseCanvasToCell(e.clientX, e.clientY);
      if (!cell) return;
      var pos = indexToPos(cell.row, cell.col);
      if (gridData[cell.row][cell.col].isRedBase && !redSelectedBase) {
        playClick(); redSelectedBase = pos;
        if (redStatus) redStatus.textContent = '✅ 已选择: ' + pos;
      }
      if (gridData[cell.row][cell.col].isBlueBase && !blueSelectedBase && gameMode !== 'pve') {
        playClick(); blueSelectedBase = pos;
        if (blueStatus) blueStatus.textContent = '✅ 已选择: ' + pos;
      }
      drawBaseSelectCanvas();
      if (redSelectedBase && blueSelectedBase) { clearInterval(baseSelectTimer); baseSelectTimer = null; setTimeout(finalizeBaseSelect, 420); }
    };
  }
}

function getBaseSelectLayout() {
  var wrap = document.getElementById('base-select-canvas-wrap');
  var availW = Math.max(220, Math.min((wrap && wrap.clientWidth) || 400, 520));
  var R = ROWS.length, C = COLS;
  var tw = 2 * availW / (R + C); tw = Math.max(24, Math.min(tw, 76));
  var th = tw * 0.5, Z = tw * 0.34;
  return { ox: R * tw / 2, oy: th * 0.5 + Z * 0.9, tw: tw, th: th, Z: Z, W: (R + C) * tw / 2, H: (R + C) * th / 2 + Z * 1.8 + th * 0.5 };
}
function baseCanvasToCell(clientX, clientY) {
  var canvas = document.getElementById('base-select-canvas'); if (!canvas) return null;
  var rect = canvas.getBoundingClientRect(), layout = getBaseSelectLayout();
  var px = (clientX - rect.left) / rect.width * layout.W;
  var py = (clientY - rect.top) / rect.height * layout.H;
  var dx = (px - layout.ox) / (layout.tw / 2), dy = (py - layout.oy) / (layout.th / 2);
  var col = Math.round((dx + dy) / 2), row = Math.round((dy - dx) / 2);
  if (row < 0 || row >= ROWS.length || col < 0 || col >= COLS) return null;
  return { row: row, col: col };
}
function drawBaseSelectCanvas() {
  var canvas = document.getElementById('base-select-canvas'); if (!canvas) return;
  var layout = getBaseSelectLayout();
  var tw = layout.tw, th = layout.th, Z = layout.Z, ox = layout.ox, oy = layout.oy, W = layout.W, H = layout.H;
  var R = ROWS.length, C = COLS, dpr = 2;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  var bg = ctx.createRadialGradient(W / 2, H * 0.15, 10, W / 2, H * 0.65, Math.max(W, H));
  bg.addColorStop(0, '#12273c'); bg.addColorStop(0.6, '#0a1622'); bg.addColorStop(1, '#05080d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  var proj = function (r, c, y) { y = y || 0; return { x: ox + (c - r) * tw / 2, y: oy + (c + r) * th / 2 - y * Z }; };
  var time = performance.now() / 1000;
  for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
    var p = proj(r, c);
    var terrain = gridData[r][c].terrain, isHQ = gridData[r][c].isHQ;
    var pos = indexToPos(r, c);
    var hKey = 'plain';
    if (terrain === 'river') hKey = 'river';
    else if (terrain === 'obstacle' || terrain === 'obstacle_dmg' || terrain === 'obstacle_crt') hKey = 'obstacle';
    else if (terrain === 'jump_pad') hKey = 'jump_pad';
    else if (terrain === 'bridge' || terrain === 'bridge_dmg' || terrain === 'bridge_crt') hKey = 'bridge';
    else if (terrain === 'base_red' || terrain === 'base_blue') hKey = 'base';
    var h = TILE_H[hKey] || 0.10;
    var isSel = null;
    if (pos === redSelectedBase) isSel = 'red';
    if (pos === blueSelectedBase) isSel = 'blue';
    var palette = isSel === 'red' ? ['#ff5566', '#b03340', '#882430']
      : isSel === 'blue' ? ['#55aaff', '#3070b0', '#204878'] : tilePalette(terrain, isHQ, time, r, c);
    var lift = h * Z, hw = tw / 2, hh = th / 2;
    ctx.fillStyle = palette[1];
    ctx.beginPath(); ctx.moveTo(p.x + hw, p.y); ctx.lineTo(p.x, p.y + hh); ctx.lineTo(p.x, p.y + hh - lift); ctx.lineTo(p.x + hw, p.y - lift); ctx.closePath(); ctx.fill();
    ctx.fillStyle = palette[2];
    ctx.beginPath(); ctx.moveTo(p.x, p.y + hh); ctx.lineTo(p.x - hw, p.y); ctx.lineTo(p.x - hw, p.y - lift); ctx.lineTo(p.x, p.y + hh - lift); ctx.closePath(); ctx.fill();
    ctx.fillStyle = palette[0]; isoDiamond(ctx, p.x, p.y, tw, th, lift); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    var topY = p.y - lift - 4;
    ctx.font = (tw * 0.3) + 'px ' + CJK_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (terrain === 'obstacle' || terrain === 'obstacle_dmg' || terrain === 'obstacle_crt') ctx.fillText('✖', p.x, topY);
    else if (terrain === 'bridge' || terrain === 'bridge_dmg' || terrain === 'bridge_crt') ctx.fillText('🌉', p.x, topY);
    else if (terrain === 'jump_pad') ctx.fillText('➤', p.x, topY);
    else if ((terrain === 'base_red' || terrain === 'base_blue') && !isSel) ctx.fillText('🚩', p.x, topY);
    else if (isSel) ctx.fillText('🏠', p.x, topY);
    else if (terrain === 'river') ctx.fillText('≈', p.x, topY);
  }
}
function finalizeBaseSelect() {
  if (currentState !== 'BASE_SELECT') return;
  if (!redSelectedBase) {
    var b = [];
    for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) if (gridData[r][c].isRedBase) b.push(indexToPos(r, c));
    redSelectedBase = b[0] || 'A2';
  }
  if (!blueSelectedBase) {
    var b2 = [];
    for (var r2 = 0; r2 < ROWS.length; r2++) for (var c2 = 0; c2 < COLS; c2++) if (gridData[r2][c2].isBlueBase) b2.push(indexToPos(r2, c2));
    blueSelectedBase = b2[0] || (ROWS[ROWS.length - 1] + '2');
  }
  if (baseSelectTimer) { clearInterval(baseSelectTimer); baseSelectTimer = null; }
  startGame();
}
function backFromBaseSelect() {
  playClick();
  if (currentState !== 'BASE_SELECT') return;
  if (baseSelectTimer) { clearInterval(baseSelectTimer); baseSelectTimer = null; }
  redSelectedBase = null; blueSelectedBase = null;
  redSelectedMap = null; blueSelectedMap = null;
  currentState = 'MAP_SELECT';
  startMapSelect();
}

/* ---------- 联机（占位） ---------- */
function openOnlineMenu() {
  playClick(); currentState = 'ONLINE'; switchScreen('screen-online');
  var panel = document.getElementById('online-panel');
  if (!panel) return;
  panel.innerHTML = '<div style="background:linear-gradient(160deg,#1b2748,#121a30);border-radius:12px;padding:14px 16px;border:1px solid #2c3a60;">' +
    '<h4 style="color:var(--gold);margin-bottom:10px;font-size:.9rem;text-align:center;">🌐 联机对战</h4>' +
    '<p style="font-size:.82rem;color:var(--dim);line-height:1.8;text-align:center;">联机对战需要部署后端服务。<br>当前版本仅支持人机对战。</p></div>' +
    '<button class="btn-back" onclick="switchScreen(\'screen-main\')">🔙 返回</button>';
}

/* ---------- 模式辅助 ---------- */
function isTankUnlocked(tankId) {
  if (devMode && devTools.unlockAll) return true;
  if (userUnlockedTanks === null) return INITIAL_TANKS.indexOf(tankId) >= 0;
  return userUnlockedTanks.indexOf(tankId) >= 0;
}
function updateTrustButton() {
  var btn = document.getElementById('btn-trust'); if (!btn) return;
  var on = trustEnabled[currentTeam] || false;
  btn.textContent = '托管:' + (on ? '开' : '关');
  btn.classList.toggle('active', on);
}

/* ---------- 窗口事件 ---------- */
var resizeTimer = null;
function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    ISO.ready = false;
    var cv = document.getElementById('game-canvas'); if (cv) { cv._w = 0; cv._h = 0; }
    if (currentState === 'GAME_PLAY' || currentState === 'GAME_OVER') { isoLayout(); drawGameCanvas(performance.now()); }
    else if (currentState === 'BASE_SELECT') drawBaseSelectCanvas();
  }, 120);
}
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

/* ---------- 画布点击/长按 ---------- */
(function bindCanvas() {
  var canvas = document.getElementById('game-canvas'); if (!canvas) return;
  var _lastTouchTs = 0;
  canvas.addEventListener('click', function (e) {
    if (currentState !== 'GAME_PLAY' || inputLocked) return;
    if (performance.now() - _lastTouchTs < 600) return;
    var cell = pickIsoCell(e.clientX, e.clientY, this);
    if (cell) handleMapClick(cell.row, cell.col);
  });
  canvas.addEventListener('touchend', function (e) {
    if (currentState !== 'GAME_PLAY' || inputLocked) return;
    e.preventDefault(); _lastTouchTs = performance.now();
    var t = e.changedTouches[0];
    var cell = pickIsoCell(t.clientX, t.clientY, this);
    if (cell) handleMapClick(cell.row, cell.col);
  }, { passive: false });
})();
function pickIsoCell(clientX, clientY, canvas) {
  var rect = canvas.getBoundingClientRect();
  var px = (clientX - rect.left) / rect.width * (canvas._w || ISO._w);
  var py = (clientY - rect.top) / rect.height * (canvas._h || ISO._h);
  var un = isoUnproject(px, py);
  var r = Math.round(un.row), c = Math.round(un.col);
  if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) return null;
  return { row: r, col: c };
}

/* ---------- 音频解锁 ---------- */
(function unlockAudio() {
  var unlock = function () {
    AudioManager.init();
    if (AudioManager.isBgPlaying && !AudioManager.currentMusic) {
      if (currentState === 'GAME_PLAY' || currentState === 'GAME_OVER') {
        if (campaignRunning) AudioManager.startCampaignMusic(); else AudioManager.startBattleMusic();
      } else AudioManager.startMenuMusic();
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
})();

/* ---------- 版本信息 ---------- */
function renderVersionHistory() {
  var el = document.getElementById('version-history'); if (!el) return;
  el.innerHTML = VERSION_HISTORY.map(function (v) {
    return '<div class="version-entry"><span class="version-tag ' + (v.tag || '') + '">' + v.version + '</span>' +
      '<span class="version-date">' + v.date + '</span>' +
      '<div class="version-details"><ul>' + v.details.map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul></div></div>';
  }).join('');
}
function openInfoModal() { playClick(); renderVersionHistory(); openModal('modal-info'); }
function openSettingsModal() { playClick(); openModal('modal-settings'); }

/* ---------- 模态框外部点击关闭 ---------- */
document.querySelectorAll('.modal-overlay').forEach(function (ov) {
  ov.addEventListener('click', function (e) {
    if (e.target === ov) {
      if (ov.id === 'modal-settlement') return;
      ov.classList.remove('show');
    }
  });
});

/* ---------- 初始化 ---------- */
async function init() {
  currentState = 'MAIN_MENU';
  syncMusicButton(); syncSfxButton();
  AudioManager.init();
  await detectBackend();
  if (authToken) {
    if (authToken.indexOf('local_') === 0) await fetchUserInfo();
    else if (backendAvailable) await fetchUserInfo();
    else { authToken = null; localStorage.removeItem('tank_token'); }
  }
  if (authToken && currentUser) {
    Router.currentView = 'main';
    document.getElementById('view-login').classList.remove('active');
    document.getElementById('view-main').classList.add('active');
    Router._initMainApp();
  } else {
    Router.currentView = 'login';
    document.getElementById('view-login').classList.add('active');
    document.getElementById('view-main').classList.remove('active');
  }
}
init();