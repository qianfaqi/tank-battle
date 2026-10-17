/* ============================================================
   战役系统（关卡/波次/剧情/教程）
============================================================ */

/* ---------- 战役进度（本地） ---------- */
var CampaignProgress = {
  key: 'tank_campaign_v2',
  data: { unlocked: 1, cleared: [] },
  load: function () {
    try {
      var s = localStorage.getItem(this.key);
      if (s) { var d = JSON.parse(s); if (d && typeof d.unlocked === 'number') this.data = { unlocked: d.unlocked || 1, cleared: Array.isArray(d.cleared) ? d.cleared : [] }; }
    } catch (e) {}
    var fixUnlocked = 1;
    (this.data.cleared || []).forEach(function (c, i) { if (c) fixUnlocked = Math.max(fixUnlocked, i + 2); });
    if (this.data.unlocked < fixUnlocked) this.data.unlocked = fixUnlocked;
    if (this.data.unlocked > 5) this.data.unlocked = 5;
  },
  save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
  isUnlocked: function (i) { return i < this.data.unlocked || devMode; },
  isCleared: function (i) { return !!this.data.cleared[i]; },
  markCleared: function (i) {
    if (devMode) return;
    while (this.data.cleared.length <= i) this.data.cleared.push(false);
    this.data.cleared[i] = true;
    if (this.data.unlocked < i + 2) this.data.unlocked = i + 2;
    if (this.data.unlocked > 5) this.data.unlocked = 5;
    this.save();
  }
};
CampaignProgress.load();

/* ---------- 战役运行时 ---------- */
var CampaignRun = {
  levelIndex: -1, level: null, waveIndex: 0, reinforceIndex: 0,
  active: false, tanyaArrived: false, playerPickedRespawn: null
};
var playerPickedTankId = null;

/* ---------- 战役菜单 ---------- */
function renderCampaignMenu() {
  var wrap = document.getElementById('campaign-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  CAMPAIGN_LEVELS.forEach(function (lv, i) {
    var unlocked = CampaignProgress.isUnlocked(i);
    var cleared = CampaignProgress.isCleared(i);
    var card = document.createElement('div');
    card.className = 'camp-level-card' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
    card.innerHTML = '<div class="lvl-badge">' + (unlocked ? (cleared ? '✓' : (i + 1)) : '🔒') + '</div>' +
      '<div class="lvl-info"><div class="lvl-title">' + lv.name + '</div><div class="lvl-sub">' + lv.subtitle + '</div></div>' +
      '<div class="lvl-status">' + (cleared ? '已通关' : (unlocked ? '可挑战' : '未解锁')) + '</div>';
    if (unlocked) card.onclick = function () { playClick(); startCampaignLevel(i); };
    wrap.appendChild(card);
  });
}

/* ---------- 开场动画 ---------- */
function playCampaignIntro(title, subtitle, cb) {
  var ov = document.getElementById('campaign-intro-overlay');
  if (!ov) { cb && cb(); return; }
  document.getElementById('intro-title-text').textContent = title;
  document.getElementById('intro-subtitle-text').textContent = subtitle;
  ov.classList.add('show');
  requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('visible'); }); });
  var ready = false;
  setTimeout(function () { ready = true; }, 3000);
  var onClick = function () {
    if (!ready) return;
    ov.removeEventListener('pointerdown', onClick);
    ov.classList.remove('visible');
    setTimeout(function () { ov.classList.remove('show'); cb && cb(); }, 700);
  };
  setTimeout(function () { ov.addEventListener('pointerdown', onClick); }, 300);
}

/* ---------- 战役选坦克 ---------- */
function openTankSelectScreen(onPicked) {
  currentState = 'TANK_SELECT';
  switchScreen('screen-tank-select');
  var listEl = document.getElementById('red-tank-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  var blueListEl = document.getElementById('blue-tank-list');
  if (blueListEl) blueListEl.innerHTML = '';
  document.getElementById('red-tank-status').textContent = '请选择出战坦克';
  var blueStatus = document.getElementById('blue-tank-status');
  if (blueStatus) blueStatus.textContent = 'AI 已就绪';

  var pool = (CampaignRun.level && CampaignRun.level.id === 'camp_05') ? ['basic', 'armored_car', 'heavy_tank', 'fast_tank'] : ['basic', 'armored_car', 'water_ghost'];
  if (devMode) pool = TANK_CONFIGS.map(function (t) { return t.id; });
  else if (userUnlockedTanks !== null) {
    pool = pool.filter(function (id) { return userUnlockedTanks.indexOf(id) >= 0 || INITIAL_TANKS.indexOf(id) >= 0; });
    userUnlockedTanks.forEach(function (id) {
      if (pool.indexOf(id) < 0 && TANK_CONFIGS.find(function (t) { return t.id === id; })) pool.push(id);
    });
  }

  pool.forEach(function (id) {
    var cfg = TANK_CONFIGS.find(function (t) { return t.id === id; }); if (!cfg) return;
    var card = document.createElement('div');
    card.className = 'tank-card'; card.dataset.tankId = id;
    var atk = Number.isInteger(cfg.attack) ? cfg.attack : cfg.attack.toFixed(1);
    card.innerHTML = '<div class="tank-icon">' + drawTankIconSVG(cfg, 55, 45) + '</div>' +
      '<div class="tank-name">' + cfg.name + '</div>' +
      '<div class="tank-stats">❤' + cfg.hp + ' ⚡' + cfg.speed + ' 🎯' + cfg.range + ' ⚔' + atk + '</div>' +
      '<div class="tank-special">' + (cfg.special ? getSpecialShort(cfg.special) : '无特殊') + '</div>';
    card.onclick = function () {
      playClick();
      listEl.querySelectorAll('.tank-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      playerPickedTankId = id;
      setTimeout(function () { onPicked && onPicked(id); }, 420);
    };
    listEl.appendChild(card);
  });
}

/* ---------- 启动关卡 ---------- */
function startCampaignLevel(i) {
  var level = CAMPAIGN_LEVELS[i]; if (!level) return;
  CampaignRun.levelIndex = i; CampaignRun.level = level;
  CampaignRun.waveIndex = 0; CampaignRun.reinforceIndex = 0;
  CampaignRun.active = false; CampaignRun.tanyaArrived = false;
  playerPickedTankId = null;
  playCampaignIntro(level.name || '关卡', level.subtitle || '', function () {
    Dialogue.brief(level.brief, function () {
      Dialogue.play(level.intro, function () {
        if (level.baseTankSelect) {
          openTankSelectScreen(function (pickedId) {
            playerPickedTankId = pickedId;
            if (level.afterSelect && level.afterSelect.length) Dialogue.play(level.afterSelect, function () { loadCampaignBattle(level); });
            else loadCampaignBattle(level);
          });
        } else loadCampaignBattle(level);
      });
    });
  });
}

function loadCampaignBattle(level) {
  playClick();
  gameMode = 'campaign'; campaignRunning = true; currentState = 'GAME_PLAY';
  finalMap = MAP_CONFIGS.find(function (m) { return m.id === level.mapId; }) || MAP_CONFIGS[0];
  gameMap = finalMap;
  gridData = initGridData(finalMap);
  ISO.ready = false;
  switchScreen('screen-game');
  setTimeout(function () { isoLayout(); drawGameCanvas(performance.now()); }, 60);

  redUnits = []; blueUnits = []; defenseBuildings = [];
  redHQ = null; blueHQ = null;
  basePosRef = { red: null, blue: null }; baseTankRef = { red: null, blue: null };
  totalTurns = 0; redDamageDealt = 0; blueDamageDealt = 0;
  effects = []; floatingTexts = []; projectiles = []; radiationSources = [];
  trackMarkPool = []; wakeTrailPool = []; healBeams = []; flameJets = []; deathFireExplosions = [];
  buildAnims = []; meleeAnims = [];
  inputLocked = false; isEndingTurn = false; aiRunning = false; aiFocusTarget = null;

  var redBasePos = null, blueBasePos = null;
  for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) {
    if (gridData[r][c].isRedBase) redBasePos = { row: r, col: c };
    if (gridData[r][c].isBlueBase) blueBasePos = { row: r, col: c };
  }
  if (redBasePos) {
    gridData[redBasePos.row][redBasePos.col].isHQ = 'red';
    basePosRef.red = redBasePos;
    redHQ = { pos: redBasePos, hp: 6, maxHp: 6, baseTank: null, burnTurns: 0 };
  }
  if (blueBasePos) {
    gridData[blueBasePos.row][blueBasePos.col].isHQ = 'blue';
    basePosRef.blue = blueBasePos;
    blueHQ = { pos: blueBasePos, hp: 6, maxHp: 6, baseTank: null, burnTurns: 0 };
  }
  for (var si = 0; si < finalMap.specialTerrain.length; si++) {
    var st = finalMap.specialTerrain[si];
    if (!DEF_BUILDING_IDS.has(st.type)) continue;
    var p = posToIndex(st.pos);
    if (!p || p.row < 0 || p.col < 0 || p.row >= ROWS.length || p.col >= COLS) continue;
    var cfg = DEF_BUILDINGS[st.type];
    var defaultDir = (st.team || 'red') === 'red' ? 90 : 270;
    defenseBuildings.push({ cfg: cfg, team: st.team || 'red', row: p.row, col: p.col, hp: cfg.hp, maxHp: cfg.hp, alive: true, turretDir: defaultDir, anim: { turretDir: defaultDir, flash: 0, recoil: 0 } });
  }

  (level.playerInitial || []).forEach(function (init) {
    var cfg = TANK_CONFIGS.find(function (t) { return t.id === init.tank; }); if (!cfg) return;
    var p = posToIndex(init.pos);
    if (!p || p.row < 0 || p.row >= ROWS.length || p.col < 0 || p.col >= COLS) return;
    var u = new Unit(cfg, level.playerTeam, { row: p.row, col: p.col });
    if (level.playerTeam === 'red') redUnits.push(u); else blueUnits.push(u);
    initUnitAnim(u);
  });

  if (level.baseTankSelect && playerPickedTankId && basePosRef.blue) {
    var bp2 = basePosRef.blue;
    var frontR = bp2.row - 1, fc = bp2.col;
    if (frontR >= 0 && frontR < ROWS.length && fc >= 0 && fc < COLS) {
      var cfg2 = TANK_CONFIGS.find(function (t) { return t.id === playerPickedTankId; });
      if (cfg2 && !getUnitAt(frontR, fc)) {
        var u2 = new Unit(cfg2, level.playerTeam, { row: frontR, col: fc });
        u2.isPlayerPicked = true;
        if (level.playerTeam === 'red') redUnits.push(u2); else blueUnits.push(u2);
        initUnitAnim(u2);
      }
    }
  }

  if (level.type === 'scouting') { initFog(); updateFog(); }

  CampaignRun.active = true;
  currentTeam = level.playerTeam;
  currentUnit = (level.playerTeam === 'blue' ? blueUnits : redUnits).find(function (u) { return u.alive && u.pos; }) || null;
  selectedAction = null; highlightedCells = []; highlightedBuildCells = [];

  setTimeout(function () {
    updateGameUI(); drawGameCanvas(performance.now());
    startRenderLoop(); updateCampaignTopbar();
  }, 80);

  document.getElementById('action-hint').textContent = '⚔️ ' + (level.type === 'scouting' ? '侦查任务 - 点亮全部迷雾' : '战役 - 点击己方单位操作');
  AudioManager.startCampaignMusic();
  if (level.isTutorial) setTimeout(function () { startTutorial(level.tutorial); }, 800);
  else showOverlay('🔵 战斗开始', 1200);
}

/* ---------- 战役胜负 ---------- */
function checkCampaignWin() {
  if (!CampaignRun.active) return;
  var level = CampaignRun.level; if (!level) return;
  if (level.type === 'attack') {
    var hqDead = !redHQ || redHQ.hp <= 0;
    var defsDead = defenseBuildings.every(function (b) { return !b.alive; });
    if (hqDead && defsDead) campaignFinish(true);
  } else if (level.type === 'defense') {
    if (level.waves && level.waves.length > 0) {
      var allSpawned = CampaignRun.waveIndex >= level.waves.length;
      var redAlive = redUnits.filter(function (u) { return u.alive; }).length;
      if (allSpawned && redAlive === 0) campaignFinish(true);
    }
  } else if (level.type === 'scouting') {
    if (fogExploredCount >= fogTotalCount) campaignFinish(true);
  }
}
function checkScoutingWin() {
  if (!CampaignRun.active) return;
  if (CampaignRun.level && CampaignRun.level.type === 'scouting' && fogExploredCount >= fogTotalCount) campaignFinish(true);
}
function campaignCheckWaves() {
  if (!CampaignRun.active) return;
  var level = CampaignRun.level; if (!level) return;
  while (CampaignRun.waveIndex < level.waves.length) {
    var next = level.waves[CampaignRun.waveIndex];
    if (totalTurns + 1 >= next.turn) { spawnWave(level, next, level.enemyTeam); CampaignRun.waveIndex++; }
    else break;
  }
  var reinforcements = level.reinforcements || [];
  while (CampaignRun.reinforceIndex < reinforcements.length) {
    var next2 = reinforcements[CampaignRun.reinforceIndex];
    if (totalTurns + 1 >= next2.turn) { spawnWave(level, next2, level.playerTeam); CampaignRun.reinforceIndex++; }
    else break;
  }
}
function spawnWave(level, wave, team) {
  var spawned = 0;
  var mult = (level.id === 'camp_05' && team === level.enemyTeam) ? 2 : 1;
  for (var m = 0; m < mult; m++) {
    for (var i = 0; i < (wave.spawns || []).length; i++) {
      var sp = wave.spawns[i];
      var cfg = TANK_CONFIGS.find(function (t) { return t.id === sp.tank; }); if (!cfg) continue;
      var p = posToIndex(sp.pos);
      if (!p || p.row < 0 || p.row >= ROWS.length || p.col < 0 || p.col >= COLS) continue;
      var exist = getUnitAt(p.row, p.col);
      var cell = null;
      if (exist && exist.team === team && m === 0) { destroyUnit(exist); cell = { row: p.row, col: p.col }; }
      else if (!exist && !isBlocked(p.row, p.col) && !isCellBase(p.row, p.col)) cell = { row: p.row, col: p.col };
      else cell = findFreeSpawnCell(p.row, p.col);
      if (!cell) continue;
      var u = new Unit(cfg, team, { row: cell.row, col: cell.col });
      if (team === 'red') redUnits.push(u); else blueUnits.push(u);
      initUnitAnim(u); u.anim.born = performance.now();
      effects.push({ type: 'build_ring', row: cell.row, col: cell.col, startTime: performance.now(), duration: 900 });
      spawned++;
    }
  }
  if (spawned > 0) {
    var msg = team === level.enemyTeam ? '⚠️ 红方进攻抵达！' : '🛡 蓝方增援抵达！';
    showOverlay(msg + ' (' + spawned + ' 单位)', 1600);
    if (level.id === 'camp_05' && team === level.playerTeam && !CampaignRun.tanyaArrived) {
      CampaignRun.tanyaArrived = true;
      setTimeout(function () {
        Dialogue.play([
          { speaker: '谭雅', role: '蓝方前线副官', text: '我来晚了，指挥官，让我与你一起战斗吧。' },
          { speaker: '谭雅', role: '蓝方前线副官', text: '巨炮坦克的范围伤害会把敌人撕成碎片。' },
          { speaker: '谭雅', role: '蓝方前线副官', text: '尽情释放您的指挥艺术吧。' }
        ]);
      }, 900);
    }
  }
  updateGameUI(); drawGameCanvas(performance.now());
}
function findFreeSpawnCell(row, col) {
  function check(r, c) {
    if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) return null;
    var t = gridData[r][c].terrain;
    if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt' || t === 'river') return null;
    if (isCellBase(r, c) || getUnitAt(r, c) || getDefenseAt(r, c)) return null;
    return { row: r, col: c };
  }
  var hit = check(row, col); if (hit) return hit;
  var dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1],[0,2],[0,-2],[2,0],[-2,0]];
  for (var i = 0; i < dirs.length; i++) { hit = check(row + dirs[i][0], col + dirs[i][1]); if (hit) return hit; }
  return null;
}

function updateCampaignTopbar() {
  var el = document.getElementById('campaign-topbar'); if (!el) return;
  if (!campaignRunning || !CampaignRun.level) { el.classList.remove('show'); el.textContent = ''; return; }
  var level = CampaignRun.level;
  var mapCfg = MAP_CONFIGS.find(function (m) { return m.id === level.mapId; });
  var typeLabels = { defense: '防卫战', attack: '攻坚战', scouting: '侦查任务' };
  el.textContent = '📍 ' + (mapCfg ? mapCfg.name : level.mapId) + ' · ' + (typeLabels[level.type] || level.type);
  el.classList.add('show');
}

/* ---------- 战役结算 ---------- */
function campaignFinish(isVictory) {
  if (!CampaignRun.active) return;
  CampaignRun.active = false;
  currentState = 'GAME_OVER';
  inputLocked = true;
  var level = CampaignRun.level;
  var idx = CampaignRun.levelIndex;
  if (isVictory) {
    var wasCleared = CampaignProgress.isCleared(idx);
    CampaignProgress.markCleared(idx);
    if (!devMode && currentUser) reportCampaignClear(idx);
    playVictory();
    setTimeout(function () {
      Dialogue.play(level.victory, function () {
        showCampaignSettlement(true);
        if (!wasCleared) setTimeout(function () { showOverlay('🎉 恭喜通关！新关卡已解锁', 2200); }, 1500);
      });
    }, 800);
  } else {
    setTimeout(function () { Dialogue.play(level.defeat, function () { showCampaignSettlement(false); }); }, 800);
  }
}
function showCampaignSettlement(isVictory) {
  var ov = document.getElementById('modal-settlement');
  document.getElementById('settlement-title').textContent = isVictory ? '🏆 任务完成！' : '💀 任务失败';
  var level = CampaignRun.level || {};
  var idx = CampaignRun.levelIndex;
  var stats = document.getElementById('settlement-stats');
  if (level.type === 'scouting') {
    stats.innerHTML = '<div><span>🔍 侦查进度</span><span>' + fogExploredCount + ' / ' + fogTotalCount + '</span></div>' +
      '<div><span>⏱ 总回合数</span><span>' + totalTurns + '</span></div>';
  } else {
    stats.innerHTML = '<div><span>🔴 红方总伤害</span><span>' + redDamageDealt.toFixed(1) + '</span></div>' +
      '<div><span>🔵 蓝方总伤害</span><span>' + blueDamageDealt.toFixed(1) + '</span></div>' +
      '<div><span>⏱ 总回合数</span><span>' + totalTurns + '</span></div>';
  }
  var btnRow = document.getElementById('settlement-buttons');
  btnRow.innerHTML = '';
  var hasNext = isVictory && (idx + 1) < CAMPAIGN_LEVELS.length;
  if (hasNext) {
    var nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-gold'; nextBtn.textContent = '▶ 进入下一关：' + CAMPAIGN_LEVELS[idx + 1].name;
    nextBtn.onclick = function () { ov.classList.remove('show'); cleanupBattle(); stopRenderLoop(); startCampaignLevel(idx + 1); };
    btnRow.appendChild(nextBtn);
  }
  var restartBtn = document.createElement('button');
  restartBtn.className = 'btn btn-blue'; restartBtn.textContent = '🔄 重新开始';
  restartBtn.onclick = function () { ov.classList.remove('show'); cleanupBattle(); stopRenderLoop(); startCampaignLevel(idx); };
  btnRow.appendChild(restartBtn);
  var backBtn = document.createElement('button');
  backBtn.className = 'btn btn-outline'; backBtn.textContent = '🏠 返回战役菜单';
  backBtn.onclick = function () { ov.classList.remove('show'); cleanupBattle(); stopRenderLoop(); switchScreen('screen-campaign'); renderCampaignMenu(); AudioManager.startMenuMusic(); };
  btnRow.appendChild(backBtn);
  ov.classList.add('show');
  stopRenderLoop();
}
async function reportCampaignClear(idx) {
  if (!authToken || !backendAvailable) return;
  try {
    var res = await fetch('/api/game/campaign-clear', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ levelIndex: idx }) });
    var data = await res.json();
    if (data.success) { userUnlockedTanks = data.unlockedTanks; userStats = data.stats; }
  } catch (e) {}
}

/* ---------- 剧情对话系统 ---------- */
var Dialogue = {
  _queue: [], _idx: 0, _typing: false, _timer: null, _onComplete: null,
  _fullText: '', _charIndex: 0, TYPING_SPEED: 38,
  play: function (script, cb) {
    if (!script || !script.length) { cb && cb(); return; }
    this._queue = script.slice(); this._idx = 0; this._onComplete = cb || null;
    var ov = document.getElementById('dialogue-overlay'); if (ov) ov.classList.add('show');
    var slot = document.getElementById('brief-card-slot'); if (slot) slot.innerHTML = '';
    var box = document.getElementById('dialogue-box'); if (box) box.style.display = 'block';
    this._renderLine();
  },
  brief: function (lines, cb) {
    this._queue = []; this._onComplete = null;
    var ov = document.getElementById('dialogue-overlay'); if (ov) ov.classList.add('show');
    var box = document.getElementById('dialogue-box'); if (box) box.style.display = 'none';
    var slot = document.getElementById('brief-card-slot');
    if (slot) {
      slot.innerHTML = '<div class="brief-card"><h3>📋 任务简报</h3>' +
        (lines || []).map(function (l) { return '<div class="brief-line">' + l + '</div>'; }).join('') +
        '<div class="btnrow"><button class="btn btn-gold" id="brief-start-btn">▶ 开始任务</button></div></div>';
      var btn = document.getElementById('brief-start-btn');
      if (btn) btn.onclick = function () { playClick(); Dialogue._close(); cb && cb(); };
    }
  },
  _renderLine: function () {
    var line = this._queue[this._idx];
    if (!line) { this._finish(); return; }
    this._fullText = line.text || ''; this._charIndex = 0; this._typing = true;
    var speaker = line.speaker || '谭雅';
    var nameEl = document.getElementById('dialogue-name'); if (nameEl) nameEl.textContent = speaker;
    var roleEl = document.getElementById('dialogue-role');
    if (roleEl) roleEl.textContent = line.role || (speaker === '谭雅' ? '蓝方前线副官' : '');
    var st = getSpeakerStyle(speaker);
    var box = document.getElementById('dialogue-box'); if (box) box.style.borderColor = st.border;
    if (nameEl) nameEl.style.color = st.main;
    if (roleEl) roleEl.style.color = st.main;
    var portraitEl = document.getElementById('dialogue-portrait'); if (portraitEl) portraitEl.style.borderColor = st.main;
    var textEl = document.getElementById('dialogue-text');
    if (textEl) { textEl.style.color = st.text; textEl.innerHTML = '<span class="cursor"></span>'; }
    if (this._timer) clearInterval(this._timer);
    var self = this;
    this._timer = setInterval(function () {
      if (self._charIndex >= self._fullText.length) {
        clearInterval(self._timer); self._timer = null; self._typing = false;
        if (textEl) textEl.innerHTML = self._fullText + ' <span class="cursor"></span>';
        return;
      }
      self._charIndex++;
      if (textEl) textEl.innerHTML = self._fullText.slice(0, self._charIndex) + '<span class="cursor"></span>';
    }, this.TYPING_SPEED);
  },
  advance: function () {
    if (!this._typing) {
      this._idx++;
      if (this._idx >= this._queue.length) this._finish();
      else this._renderLine();
    } else {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      this._typing = false;
      var textEl = document.getElementById('dialogue-text');
      if (textEl) textEl.innerHTML = this._fullText + ' <span class="cursor"></span>';
    }
  },
  skipAll: function () {
    playClick();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._typing = false; this._idx = this._queue.length; this._finish();
  },
  _finish: function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._close();
    var cb = this._onComplete; this._onComplete = null; this._queue = [];
    cb && cb();
  },
  _close: function () { var ov = document.getElementById('dialogue-overlay'); if (ov) ov.classList.remove('show'); }
};
document.addEventListener('pointerdown', function (e) {
  var ov = document.getElementById('dialogue-overlay');
  if (!ov || !ov.classList.contains('show') || !Dialogue._queue.length) return;
  if (e.target && (e.target.id === 'dialogue-skip' || e.target.id === 'brief-start-btn')) return;
  Dialogue.advance();
}, true);

/* ---------- 教程（简化版：直接进入战斗） ---------- */
function startTutorial(n) {
  showOverlay('📖 教程关卡 · 按提示操作', 2000);
}

/* ---------- 迷雾（侦查关用） ---------- */
function initFog() {
  fogState = []; fogTotalCount = 0; fogExploredCount = 0;
  for (var r = 0; r < ROWS.length; r++) {
    fogState[r] = [];
    for (var c = 0; c < COLS; c++) { fogState[r][c] = 0; fogTotalCount++; }
  }
}
function updateFog() {
  var changed = false;
  for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) if (fogState[r][c] === 2) fogState[r][c] = 1;
  for (var ui = 0; ui < blueUnits.length; ui++) {
    var u = blueUnits[ui]; if (!u.alive || !u.pos) continue;
    var R = u.cfg.detectRange || 0; if (R <= 0) continue;
    for (var dr = -R; dr <= R; dr++) for (var dc = -R; dc <= R; dc++) {
      var nr = u.pos.row + dr, nc = u.pos.col + dc;
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
      if (fogState[nr][nc] < 2) { if (fogState[nr][nc] === 0) fogExploredCount++; fogState[nr][nc] = 2; changed = true; }
    }
  }
  if (changed) updateGameUI();
}

/* ---------- 返回战役菜单 ---------- */
function backFromCampaign() {
  playClick();
  showConfirm('确定退出当前战斗？进度不会保存。', function () {
    cleanupBattle(); stopRenderLoop(); switchScreen('screen-campaign'); renderCampaignMenu(); AudioManager.startMenuMusic();
  });
}