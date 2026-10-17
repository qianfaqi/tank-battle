/* ============================================================
   游戏核心逻辑
   包含：移动/攻击/建造/治疗/自爆/钻地/核弹/回合切换
   ★ 修复：跳板 proceed 异步竞态、endTurn 中 AI 调度竞态
============================================================ */

/* ---------- 网格初始化 ---------- */
function initGridData(cfg) {
  var rows = cfg.rows || 10, cols = cfg.cols || 7;
  ROWS = getRowLetters(rows); COLS = cols;
  var g = [];
  for (var r = 0; r < rows; r++) {
    g[r] = [];
    for (var c = 0; c < cols; c++) {
      g[r][c] = { terrain: 'plain', occupant: null, isRedBase: false, isBlueBase: false, isHQ: null, hp: 0, maxHp: 0, buildFrom: null, burnTurns: 0 };
    }
  }
  var ranges = getRiverRanges(cfg);
  for (var ri = 0; ri < ranges.length; ri++) {
    var rr = ranges[ri];
    var rs = ROWS.indexOf(rr.rowStart), re = ROWS.indexOf(rr.rowEnd);
    for (var r2 = rs; r2 <= re; r2++) for (var c2 = rr.colStart - 1; c2 <= rr.colEnd - 1; c2++) {
      if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) g[r2][c2].terrain = 'river';
    }
  }
  for (var si = 0; si < cfg.specialTerrain.length; si++) {
    var st = cfg.specialTerrain[si];
    if (st.type === 'river_start' || st.type === 'river_end') continue;
    var p = posToIndex(st.pos);
    if (p.row < 0 || p.row >= rows || p.col < 0 || p.col >= cols) continue;
    if (st.type === 'base_red') { g[p.row][p.col].isRedBase = true; g[p.row][p.col].terrain = 'base_red'; }
    else if (st.type === 'base_blue') { g[p.row][p.col].isBlueBase = true; g[p.row][p.col].terrain = 'base_blue'; }
    else g[p.row][p.col].terrain = st.type;
  }
  for (var r3 = 0; r3 < rows; r3++) for (var c3 = 0; c3 < cols; c3++) {
    var t = g[r3][c3].terrain;
    if (t === 'obstacle') { g[r3][c3].hp = 5; g[r3][c3].maxHp = 5; }
    else if (t === 'bridge') { g[r3][c3].hp = 2.5; g[r3][c3].maxHp = 2.5; }
  }
  return g;
}

/* ---------- 单位销毁 ---------- */
function destroyUnit(unit) {
  if (!unit || !unit.alive) return;
  var dr = unit.pos ? unit.pos.row : -1, dc = unit.pos ? unit.pos.col : -1;
  var deathTeam = unit.team;
  unit.alive = false; unit.hp = 0;
  if (unit.pos) { var g = gridData[unit.pos.row] && gridData[unit.pos.row][unit.pos.col]; if (g) g.occupant = null; unit.pos = null; }
  unit.waitingJump = false; unit.jumpWaitTurns = 0; unit.jumpDest = null;
  unit.anim = null; unit.isUnderground = false; unit.burnTurns = 0;
  unit.waitingDigIn = false; unit.pendingDigOut = false;

  if (unit.cfg.isNuke && dr >= 0) {
    effects.push({ type: 'explosion_small', row: dr, col: dc, startTime: performance.now(), duration: 520 });
    radiationSources.push({ row: dr, col: dc, x: 3, team: unit.team, heldOnce: false });
    playExplosion();
  } else if (dr >= 0) {
    effects.push({ type: 'sink', row: dr, col: dc, startTime: performance.now(), duration: 800 });
  }

  if (isFireTank(unit) && dr >= 0) triggerFireTankDeathExplosion(unit, dr, dc);

  if (unit.cfg.isRobot || unit.cfg.isMissile || unit.cfg.isNuke) {
    var arr = unit.team === 'red' ? redUnits : blueUnits;
    var idx = arr.indexOf(unit); if (idx > -1) arr.splice(idx, 1);
  } else if (isNanoUnit(unit)) {
    var grp = unit.nanoGroupId;
    var arr2 = unit.team === 'red' ? redUnits : blueUnits;
    var survivors = arr2.filter(function (u) { return u.alive && isNanoUnit(u) && u.nanoGroupId === grp; });
    if (survivors.length === 0) {
      var rep = arr2.find(function (u) { return isNanoUnit(u) && u.nanoGroupId === grp && !u.alive; }) || unit;
      rep.respawnCountdown = 6; rep.isNanoReviving = true;
    }
  } else if (unit.cfg.isBaseTank) {
    unit.deadAsBase = true;
  } else {
    unit.respawnCountdown = 6;
    var arr3 = unit.team === 'red' ? redUnits : blueUnits;
    for (var i = arr3.length - 1; i >= 0; i--) {
      var child = arr3[i];
      if ((child.cfg.isRobot || child.cfg.isMissile || child.cfg.isNuke) && child.builder === unit) {
        if (child.alive && child.pos) {
          if (child.cfg.isNuke) radiationSources.push({ row: child.pos.row, col: child.pos.col, x: 3, team: child.team, heldOnce: false });
          effects.push({ type: 'sink', row: child.pos.row, col: child.pos.col, startTime: performance.now(), duration: 700 });
          var g2 = gridData[child.pos.row] && gridData[child.pos.row][child.pos.col];
          if (g2) g2.occupant = null;
        }
        child.alive = false; child.pos = null; child.anim = null;
        arr3.splice(i, 1);
      }
    }
  }
  if (unit.cfg.shield !== undefined) { unit.shield = unit.cfg.shield; unit.shieldLayers = unit.cfg.shieldLayers || 0; }
}

function triggerFireTankDeathExplosion(unit, row, col) {
  var R = unit.cfg.deathExplosionRadius || 2;
  var baseDmg = unit.cfg.deathExplosionDamage || 2;
  var burnTurns = unit.cfg.deathExplosionBurnTurns || 2;
  deathFireExplosions.push({ row: row, col: col, radius: R, startTime: performance.now(), duration: 3000, holdAfter: 2000 });
  playNukeExplosion();
  nukeScreenShakeUntil = Math.max(nukeScreenShakeUntil, performance.now() + 900);
  var all = redUnits.concat(blueUnits);
  for (var dr = -R; dr <= R; dr++) for (var dc = -R; dc <= R; dc++) {
    var r = row + dr, c = col + dc;
    if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) continue;
    if (Math.max(Math.abs(dr), Math.abs(dc)) > R) continue;
    var ring = Math.max(Math.abs(dr), Math.abs(dc));
    var dmg = ring <= 1 ? baseDmg : 1;
    var targets = all.filter(function (u) { return u.alive && u.pos && u.pos.row === r && u.pos.col === c && u !== unit; });
    for (var ti = 0; ti < targets.length; ti++) {
      var u = targets[ti];
      if (u.isUnderground) continue;
      if (hasDodge(u) && Math.random() < u.cfg.dodgeChance) { addFloatingText(r, c, 'MISS', '#7fffd4', 0); continue; }
      if (u.shield !== null && u.shield > 0) {
        var absorb = Math.min(u.shield, dmg); u.shield = Math.max(0, u.shield - dmg);
        addFloatingText(r, c, '-' + formatDamage(absorb), '#7fffd4', 0);
        if (isNanoUnit(u) && absorb > 0 && u.shield === 0 && u.alive) tryNanoSplit(u);
      } else {
        u.hp -= dmg; if (u.anim) u.anim.flash = 1;
        addFloatingText(r, c, '-' + formatDamage(dmg), '#ff6644', 0);
        if (u.hp <= 0) destroyUnit(u);
      }
      if (u.alive && !isFireTank(u)) u.burnTurns = Math.max(u.burnTurns, burnTurns);
    }
    if (redHQ && redHQ.pos && redHQ.pos.row === r && redHQ.pos.col === c && redHQ.hp > 0) {
      redHQ.hp -= dmg; addFloatingText(r, c, '-' + formatDamage(dmg), '#ff8080', 0);
      if (redHQ.hp <= 0) triggerHQDestroy('red');
    }
    if (blueHQ && blueHQ.pos && blueHQ.pos.row === r && blueHQ.pos.col === c && blueHQ.hp > 0) {
      blueHQ.hp -= dmg; addFloatingText(r, c, '-' + formatDamage(dmg), '#80c0ff', 0);
      if (blueHQ.hp <= 0) triggerHQDestroy('blue');
    }
    damageTerrainFromExplosion(r, c, dmg);
  }
  updateGameUI();
}

function tryNanoSplit(unit) {
  if (!isNanoUnit(unit) || !unit.alive) return;
  var nextId = unit.cfg.nanoNextId; if (!nextId) return;
  var nextCfg = TANK_CONFIGS.find(function (t) { return t.id === nextId; }) || (nextId === 'nano_2' ? NANO_2 : NANO_1);
  var arr = unit.team === 'red' ? redUnits : blueUnits;
  var grp = unit.nanoGroupId;
  var r0 = unit.pos.row, c0 = unit.pos.col;
  var cand = [];
  for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    var nr = r0 + dr, nc = c0 + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    var t = gridData[nr][nc].terrain;
    if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt' || t === 'river') continue;
    if (isCellBase(nr, nc)) continue;
    if (getUnitAt(nr, nc)) continue;
    cand.push({ row: nr, col: nc });
  }
  var newUnits = [];
  function spawnOne(pos) {
    var u = new Unit(nextCfg, unit.team, { row: pos.row, col: pos.col });
    u.nanoGroupId = grp; u.freshBuild = false;
    u.moveStepsLeft = nextCfg.speed; u.attackCountLeft = nextCfg.attackCount;
    arr.push(u);
    gridData[pos.row][pos.col].occupant = unit.team === 'red' ? 'red_tank' : 'blue_tank';
    initUnitAnim(u); newUnits.push(u);
  }
  if (cand.length >= 2) { spawnOne(cand[0]); spawnOne(cand[1]); }
  else if (cand.length === 1) spawnOne(cand[0]);
  else spawnOne({ row: r0, col: c0 });
  var g0 = gridData[r0] && gridData[r0][c0]; if (g0) g0.occupant = null;
  unit.alive = false; unit.hp = 0; unit.pos = null; unit.anim = null;
  var idx = arr.indexOf(unit); if (idx >= 0) arr.splice(idx, 1);
  playSplit();
  for (var ni = 0; ni < newUnits.length; ni++) effects.push({ type: 'build_ring', row: newUnits[ni].pos.row, col: newUnits[ni].pos.col, startTime: performance.now(), duration: 900 });
  showOverlay('🧬 ' + unit.cfg.name + ' 分裂！', 1200);
  updateGameUI();
}

/* ---------- 移动范围 ---------- */
function getMoveCost(unit, row, col) { return 1; }
function getAdjacentMoveCells(unit) {
  if (!unit.alive || unit.waitingJump) return [];
  if (unit.waitingDigIn || unit.pendingDigOut) return [];
  if (unit.isUnderground) return [];
  if (unit.moveStepsLeft <= 0) return [];
  if (unit.cfg.isNuke) return [];
  var dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  var out = [];
  var isSuper = unit.cfg.weight === 'super_heavy';
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var nr = unit.pos.row + dr, nc = unit.pos.col + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    var terrain = gridData[nr][nc].terrain;
    if ((terrain === 'obstacle' || terrain === 'obstacle_dmg' || terrain === 'obstacle_crt' || terrain === 'ruins_block') && !isSuper) continue;
    var occ = getUnitAt(nr, nc);
    if (occ && isBaseTank(occ)) continue;
    if (occ && !isSuper) continue;
    if (isCellBase(nr, nc) && !isBaseTank(unit)) continue;
    var isRiver = isInRiverRange(nr, nc);
    if (isRiver && !canWalkOnRiver(unit)) continue;
    out.push({ row: nr, col: nc });
  }
  return out;
}
function getUndergroundMoveCells(unit) {
  if (!unit.alive || !unit.isUnderground) return [];
  if (unit.moveStepsLeft <= 0) return [];
  var dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  var out = [];
  for (var i = 0; i < dirs.length; i++) {
    var nr = unit.pos.row + dirs[i][0], nc = unit.pos.col + dirs[i][1];
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    var t = gridData[nr][nc].terrain;
    if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt') continue;
    if (isCellBase(nr, nc)) continue;
    out.push({ row: nr, col: nc });
  }
  return out;
}
function getAttackRangeCells(unit) {
  var out = [];
  if (!unit.alive) return out;
  if (unit.cfg.special === 'repair') return getHealRangeCells(unit);
  if (unit.cfg.special === 'artillery') return getArtilleryRangeCells(unit);
  var range = unit.cfg.range;
  if (range <= 0) return out;
  var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var straightOnly = unit.cfg.special === 'straight_only';
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    if (straightOnly && dr !== 0 && dc !== 0) continue;
    for (var s = 1; s <= range; s++) {
      var nr = unit.pos.row + dr * s, nc = unit.pos.col + dc * s;
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) break;
      var los = hasLineOfSight(unit.pos.row, unit.pos.col, nr, nc);
      out.push({ row: nr, col: nc, los: los });
      if (!los) break;
    }
  }
  return out;
}
function getArtilleryRangeCells(unit) {
  var out = [];
  var minR = unit.cfg.minRange || 2, maxR = unit.cfg.range;
  var dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  for (var i = 0; i < dirs.length; i++) {
    for (var s = 1; s <= maxR; s++) {
      var nr = unit.pos.row + dirs[i][0] * s, nc = unit.pos.col + dirs[i][1] * s;
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) break;
      if (s < minR) continue;
      out.push({ row: nr, col: nc, los: true });
    }
  }
  return out;
}
function getHealRangeCells(unit) {
  var out = [], R = unit.cfg.healRange || 2;
  for (var dr = -R; dr <= R; dr++) for (var dc = -R; dc <= R; dc++) {
    if (dr === 0 && dc === 0) continue;
    if (Math.max(Math.abs(dr), Math.abs(dc)) > R) continue;
    var nr = unit.pos.row + dr, nc = unit.pos.col + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    out.push({ row: nr, col: nc, los: hasLineOfSight(unit.pos.row, unit.pos.col, nr, nc) });
  }
  return out;
}

/* ---------- 单位状态 ---------- */
function isUnitExhausted(unit) {
  if (!unit.alive) return true;
  if (unit.waitingJump || unit.waitingDigIn || unit.pendingDigOut) return true;
  if (unit.cfg.isNuke) return true;
  if (unit.isUnderground) return unit.moveStepsLeft <= 0;
  var canMove = unit.moveStepsLeft > 0, canAct;
  if (unit.cfg.special === 'builder' || unit.cfg.special === 'rocket_builder' || unit.cfg.special === 'nuke_builder') {
    var hasSlot = false;
    for (var dr = -1; dr <= 1 && !hasSlot; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (canBuildAt(unit, unit.pos.row + dr, unit.pos.col + dc)) { hasSlot = true; break; }
    }
    canAct = unit.buildCountLeft > 0 && unit.cooldownRemaining <= 0 && hasSlot;
  } else if (unit.cfg.isMissile) canAct = unit.attackCountLeft > 0;
  else if (canDig(unit)) canAct = !unit.digJustUsedThisTurn;
  else canAct = unit.attackCountLeft > 0 && unit.cooldownRemaining <= 0;
  return !canMove && !canAct;
}
function checkAutoSkip() {
  if (!autoSkipEnabled || currentState !== 'GAME_PLAY') return;
  if (inputLocked || isEndingTurn) return;
  if (gameMode === 'pve' && currentTeam === 'blue') return;
  if (trustEnabled[currentTeam]) return;
  var units = getCurrentUnits().filter(function (u) { return u.alive && !u.cfg.isNuke; });
  if (!units.length) { showOverlay('⏭ 自动跳过', 900); setTimeout(endTurn, 500); return; }
  if (units.every(function (u) { return isUnitExhausted(u); })) {
    showOverlay('⏭ 自动跳过：无可用操作', 900); setTimeout(endTurn, 500);
  }
}

/* ============================================================
   ★ executeMove（关键修复：跳板 proceed 正确 await）
============================================================ */
async function executeMove(unit, row, col) {
  if (!unit || !unit.alive || !unit.pos) return;
  if (unit.isUnderground) { await executeUndergroundMove(unit, row, col); return; }
  if (unit.moveStepsLeft <= 0) { showOverlay('⚠️ 本回合移动步数已用完', 1000); return; }
  var dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  var valid = false, moveDir = { dr: 0, dc: 0 };
  for (var i = 0; i < dirs.length; i++) {
    if (unit.pos.row + dirs[i][0] === row && unit.pos.col + dirs[i][1] === col) {
      valid = true; moveDir = { dr: dirs[i][0], dc: dirs[i][1] }; break;
    }
  }
  if (!valid) { showOverlay('❌ 只能移动到相邻格', 800); return; }
  if (getMoveCost(unit, row, col) > unit.moveStepsLeft) { showOverlay('❌ 无法移动到该位置', 800); return; }

  var isSuperHeavy = unit.cfg.weight === 'super_heavy';
  var terrain = gridData[row][col].terrain;
  if ((terrain === 'obstacle' || terrain === 'obstacle_dmg' || terrain === 'obstacle_crt') && !isSuperHeavy) { showOverlay('❌ 目标有障碍物', 800); return; }
  var targetUnit = getUnitAt(row, col);
  if (targetUnit && isBaseTank(targetUnit)) { showOverlay('❌ 无法进入基地坦克所在格', 800); return; }
  if (targetUnit && !isSuperHeavy && !isBaseTank(unit)) { showOverlay('❌ 目标被占据', 800); return; }
  var nextIsRiver = isInRiverRange(row, col);
  if (nextIsRiver && !canWalkOnRiver(unit)) { showOverlay('❌ 无法进入河流', 800); return; }

  inputLocked = true;
  updateActionButtons();
  try {
    if (isSuperHeavy && targetUnit && targetUnit !== unit && !isBaseTank(targetUnit)) {
      playExplosion(); showOverlay('💥 碾压！', 800);
      effects.push({ type: 'explosion', row: row, col: col, startTime: performance.now(), duration: 620 });
      effects.push({ type: 'crush', row: row, col: col, startTime: performance.now(), duration: 600 });
      spawnDust(row, col, 14, '#8a7a5c');
      destroyUnit(targetUnit);
    }
    var fromRow = unit.pos.row, fromCol = unit.pos.col;
    var wasRiver = unit.isInRiver;
    var sp = isoCell(fromRow, fromCol, 0);
    if (!nextIsRiver && unit.cfg.chassisType !== 'special' && unit.cfg.chassisType !== 'wheeled') {
      trackMarkPool.push({ pts: [{ x: sp.x, y: sp.y + ISO.TH * 0.2 }], team: unit.team, startTime: performance.now(), duration: 3000 });
    }
    if (wasRiver !== nextIsRiver && !isFlyingUnit(unit)) {
      playWaterSplash();
      effects.push({ type: nextIsRiver ? 'water_enter' : 'water_exit', row: row, col: col, startTime: performance.now(), duration: 600 });
    }
    playMove();

    var angle = Math.atan2(moveDir.dr, moveDir.dc) * 180 / Math.PI;
    angle = Math.round(angle / 45) * 45; if (angle < 0) angle += 360;
    unit.bodyDir = angle;

    var occ = unit.team === 'red' ? 'red_tank' : 'blue_tank';
    var oldCell = gridData[fromRow] && gridData[fromRow][fromCol];
    if (oldCell) oldCell.occupant = null;
    unit.pos = { row: row, col: col };
    unit.isInRiver = nextIsRiver;
    gridData[row][col].occupant = occ;
    startMoveAnim(unit, fromRow, fromCol, 260);
    await sleep(280);

    unit.moveStepsLeft -= 1; unit.hasMoved = true;
    if (!nextIsRiver && wasRiver) unit.waterTint = 0.99;
    if (nextIsRiver && unit.burnTurns > 0 && !isFireTank(unit)) { unit.burnTurns = 0; showOverlay('💧 灼烧被河水熄灭', 1000); }

    if (isSuperHeavy && !isBaseTank(unit)) {
      if (terrain === 'bridge' || terrain === 'bridge_dmg' || terrain === 'bridge_crt') {
        gridData[row][col].terrain = 'river'; gridData[row][col].hp = 0; gridData[row][col].maxHp = 0;
        addSingleCellRiverRange(row, col); unit.isInRiver = true;
        spawnDust(row, col, 10, '#6a8cb0'); playWaterSplash();
      } else if (terrain === 'obstacle' || terrain === 'obstacle_dmg' || terrain === 'obstacle_crt') {
        gridData[row][col].terrain = 'plain'; gridData[row][col].hp = 0; gridData[row][col].maxHp = 0;
        spawnDust(row, col, 16, '#5c5c5c');
      }
    }

    var camp1NoJump = campaignRunning && typeof CampaignRun !== 'undefined' && CampaignRun.level && CampaignRun.level.id === 'camp_01';

    // ★ 修复：跳板处理，正确 await proceed
    if (isJumpPad(row, col) && canTriggerJumpPad(unit) && !camp1NoJump) {
      var dest = getJumpDestination(row, col);
      if (dest) {
        var waitTurns = unit.cfg.weight === 'super_heavy' ? 6 : unit.cfg.weight === 'heavy' ? 4 : unit.cfg.weight === 'light' ? 0 : 2;
        var isAI = (gameMode === 'pve' && unit.team === 'blue') || trustEnabled[unit.team] || (gameMode === 'campaign' && unit.team === 'red');
        var allyAtDest = redUnits.concat(blueUnits).find(function (u) {
          return u.alive && u.pos && u.pos.row === dest.row && u.pos.col === dest.col && u.team === unit.team;
        });

        var proceed = async function (confirmed) {
          if (!confirmed) {
            unit.moveStepsLeft = 0; selectedAction = null; highlightedCells = [];
            updateGameUI(); drawGameCanvas(performance.now()); return;
          }
          if (waitTurns === 0) { await runJumpAnim(unit, dest); }
          else {
            unit.waitingJump = true; unit.jumpWaitTurns = waitTurns; unit.jumpDest = dest; unit.moveStepsLeft = 0;
            showOverlay('⏳ 跳板等待中，还需 ' + Math.ceil(waitTurns / 2) + ' 回合', 1800);
          }
          refreshMoveHighlight(unit);
          updateGameUI(); drawGameCanvas(performance.now());
          if (autoSkipEnabled) checkAutoSkip();
        };

        // ★ 关键修复：所有分支都 await
        var confirmed = false;
        if (isAI) { confirmed = true; }
        else if (allyAtDest) { confirmed = await showConfirmJumpDialog(); }
        else { confirmed = await showJumpDialog(waitTurns); }
        await proceed(confirmed);

        // proceed 已经处理了 UI 刷新，直接返回
        return;
      }
    }
    refreshMoveHighlight(unit);
    updateGameUI(); drawGameCanvas(performance.now());
    if (campaignRunning && typeof CampaignRun !== 'undefined' && CampaignRun.level && CampaignRun.level.type === 'scouting') {
      updateFog(); checkScoutingWin();
    }
    if (autoSkipEnabled) checkAutoSkip();
  } finally {
    inputLocked = false;
    updateActionButtons();
  }
}

function addSingleCellRiverRange(row, col) {
  if (!gameMap) return;
  if (!gameMap.riverRanges) gameMap.riverRanges = [];
  var rl = ROWS[row], cl = col + 1;
  for (var i = 0; i < gameMap.riverRanges.length; i++) {
    var r = gameMap.riverRanges[i];
    if (r.rowStart === rl && r.rowEnd === rl && r.colStart === cl && r.colEnd === cl) return;
  }
  gameMap.riverRanges.push({ rowStart: rl, rowEnd: rl, colStart: cl, colEnd: cl });
}

function refreshMoveHighlight(unit) {
  if (unit.alive && unit.moveStepsLeft > 0 && !unit.waitingJump && !unit.waitingDigIn && !unit.pendingDigOut) {
    selectedAction = 'move';
    highlightedCells = unit.isUnderground ? getUndergroundMoveCells(unit) : getAdjacentMoveCells(unit);
    document.getElementById('action-hint').textContent = (unit.isUnderground ? '⛏️ ' : '🚶 ') + '移动模式 - 剩余步数: ' + unit.moveStepsLeft;
  } else { selectedAction = null; highlightedCells = []; }
}

function getJumpWaitTurns(unit) {
  var w = unit.cfg.weight;
  if (w === 'light') return 0;
  if (w === 'heavy') return 4;
  if (w === 'super_heavy') return 6;
  return 2;
}

async function runJumpAnim(unit, dest) {
  if (!unit || !unit.alive || !unit.pos) return;
  playTone(140, .2, 'triangle', .18);
  await sleep(180);
  var fromR = unit.pos.row, fromC = unit.pos.col;
  var occ = unit.team === 'red' ? 'red_tank' : 'blue_tank';
  var other = getUnitAt(dest.row, dest.col);
  if (other) {
    if (isBaseTank(other)) { showOverlay('⚠️ 目的地是基地坦克，跳跃取消', 1400); return; }
    if (other.team === unit.team) { destroyUnit(other); showOverlay('💥 跳跃落地，己方单位被摧毁！', 1400); }
    else {
      var jw = getWeightValue(unit.cfg.weight), dw = getWeightValue(other.cfg.weight);
      if (jw < dw) { destroyUnit(unit); showOverlay('💥 跳跃碰撞！重量不足，被摧毁！', 1500); return; }
      destroyUnit(other);
      showOverlay(jw > dw ? '💥 跳跃碰撞！重量优势碾压！' : '💥 跳跃碰撞！同重量，消灭目的地单位！', 1500);
    }
  }
  if (!unit.alive) return;
  var old = gridData[fromR] && gridData[fromR][fromC]; if (old) old.occupant = null;
  unit.pos = { row: dest.row, col: dest.col };
  unit.isInRiver = isInRiverRange(dest.row, dest.col);
  if (unit.cfg.weight === 'super_heavy' && !isBaseTank(unit)) {
    var dt = gridData[dest.row][dest.col].terrain;
    if (dt === 'bridge' || dt === 'bridge_dmg' || dt === 'bridge_crt') {
      gridData[dest.row][dest.col].terrain = 'river'; gridData[dest.row][dest.col].hp = 0; gridData[dest.row][dest.col].maxHp = 0;
      addSingleCellRiverRange(dest.row, dest.col); unit.isInRiver = true;
    } else if (dt === 'obstacle' || dt === 'obstacle_dmg' || dt === 'obstacle_crt') {
      gridData[dest.row][dest.col].terrain = 'plain'; gridData[dest.row][dest.col].hp = 0; gridData[dest.row][dest.col].maxHp = 0;
    }
  }
  gridData[dest.row][dest.col].occupant = occ;
  startJumpAnim(unit, fromR, fromC, dest.row, dest.col, 700);
  effects.push({ type: 'jump_land', row: dest.row, col: dest.col, startTime: performance.now(), duration: 520 });
  spawnDust(dest.row, dest.col, 14, '#8a7a5c');
  nukeScreenShakeUntil = Math.max(nukeScreenShakeUntil, performance.now() + 300);
  playGroundHit();
  await sleep(700);
  unit.waitingJump = false; unit.jumpWaitTurns = 0; unit.jumpDest = null;
  updateGameUI(); drawGameCanvas(performance.now());
}

function showJumpDialog(waitTurns) {
  return new Promise(function (resolve) {
    var overlay = document.getElementById('modal-jump');
    document.getElementById('jump-dialog-message').textContent = waitTurns === 0 ? '立即跳跃？' : '需要等待 ' + Math.ceil(waitTurns / 2) + ' 个完整回合，确定跳跃？';
    overlay.classList.add('show');
    var yesBtn = document.getElementById('jump-dialog-yes'), noBtn = document.getElementById('jump-dialog-no');
    yesBtn.onclick = function () { overlay.classList.remove('show'); yesBtn.onclick = null; noBtn.onclick = null; resolve(true); };
    noBtn.onclick = function () { overlay.classList.remove('show'); yesBtn.onclick = null; noBtn.onclick = null; resolve(false); };
  });
}
function showConfirmJumpDialog() {
  return new Promise(function (resolve) {
    var overlay = document.getElementById('modal-confirm');
    document.getElementById('confirm-title').textContent = '⚠️ 落点警告';
    document.getElementById('confirm-message').textContent = '⚠️ 目的地有友方单位，跳跃将摧毁它，是否继续？';
    overlay.classList.add('show');
    var yesBtn = document.getElementById('confirm-yes'), noBtn = document.getElementById('confirm-no');
    yesBtn.onclick = function () { overlay.classList.remove('show'); yesBtn.onclick = null; noBtn.onclick = null; resolve(true); };
    noBtn.onclick = function () { overlay.classList.remove('show'); yesBtn.onclick = null; noBtn.onclick = null; resolve(false); };
  });
}

/* ---------- 攻击 ---------- */
function rollDamage(attacker, defender, basePower) {
  var power = basePower, isCrit = false, isMiss = false, dodged = false;
  if (defender && hasDodge(defender)) {
    if (Math.random() < defender.cfg.dodgeChance) return { finalPower: 0, isCrit: false, isMiss: true, dodged: true };
  }
  var roll = Math.random();
  if (roll < 0.05) { power *= 2; isCrit = true; }
  else if (roll < 0.10) { power = 0; isMiss = true; }
  return { finalPower: power, isCrit: isCrit, isMiss: isMiss, dodged: dodged };
}

function executeAttack(attacker, target) {
  if (!attacker || !attacker.alive || !attacker.pos || attacker.attackCountLeft <= 0) return;
  var power = attacker.cfg.attack;
  if (attacker.cfg.special === 'river_walker' && attacker.isInRiver) power += 1;
  if (attacker.cfg.id === 'siege_tank' && (target.type === 'hq' || target.type === 'terrain')) power *= 2;

  var isUnit = target.type === 'unit';
  var defender = isUnit ? target.unit : null;

  if (isUnit && defender && defender.isUnderground) {
    attacker.attackCountLeft--;
    var tdr0 = target.row - attacker.pos.row, tdc0 = target.col - attacker.pos.col;
    var tAngle0 = Math.atan2(tdr0, tdc0) * 180 / Math.PI;
    tAngle0 = Math.round(tAngle0 / 45) * 45; if (tAngle0 < 0) tAngle0 += 360;
    attacker.turretDir = tAngle0;
    if (attacker.anim) attacker.anim.recoil = 1;
    addFloatingText(target.row, target.col, 'MISS', '#7fffd4', 0);
    playMiss();
    setTimeout(function () { updateGameUI(); drawGameCanvas(performance.now()); if (autoSkipEnabled) checkAutoSkip(); }, 200);
    return;
  }
  if (devTools.godMode && defender && defender.team === 'blue') {
    attacker.attackCountLeft--;
    addFloatingText(target.row, target.col, '无敌', '#7fffd4', 0);
    playMiss(); updateGameUI(); drawGameCanvas(performance.now());
    return;
  }

  var roll = rollDamage(attacker, defender, power);
  power = roll.finalPower;
  var isCrit = roll.isCrit, isMiss = roll.isMiss, dodged = roll.dodged;
  attacker.attackCountLeft--;

  var tdr = target.row - attacker.pos.row, tdc = target.col - attacker.pos.col;
  var tAngle = Math.atan2(tdr, tdc) * 180 / Math.PI;
  tAngle = Math.round(tAngle / 45) * 45; if (tAngle < 0) tAngle += 360;
  attacker.turretDir = tAngle;
  if (attacker.anim) attacker.anim.recoil = 1;

  var isMeleeRange = attacker.cfg.range === 1 || attacker.cfg.ammoType === 'melee';
  var ammo = isMeleeRange ? 'melee' : (attacker.cfg.ammoType || 'shell');
  var isMelee = ammo === 'melee', isFlame = ammo === 'flame';

  if (ammo === 'melee') playMeleeImpact();
  else if (ammo === 'bullet') playBulletHit();
  else if (ammo === 'flame') playBurn();
  else playShellHit();

  if (isFlame) flameJets.push({ fromR: attacker.pos.row, fromC: attacker.pos.col, toR: target.row, toC: target.col, team: attacker.team, startTime: performance.now(), duration: 500 });
  else if (!isMelee) projectiles.push({ type: ammo, fromR: attacker.pos.row, fromC: attacker.pos.col, toR: target.row, toC: target.col, team: attacker.team, startTime: performance.now(), duration: ammo === 'bullet' ? 120 : 250 });
  else meleeAnims.push({ row: attacker.pos.row, col: attacker.pos.col, targetR: target.row, targetC: target.col, startTime: performance.now(), duration: 400 });

  var hitDelay = isMelee ? 200 : isFlame ? 300 : (ammo === 'bullet' ? 120 : 250);

  setTimeout(function () {
    if (isMiss) {
      if (dodged) showOverlay('💨 闪避！', 900); else { showOverlay('💨 未命中！', 900); playMiss(); }
      addFloatingText(target.row, target.col, 'MISS', dodged ? '#7fffd4' : '#ffffff', effects.length % 3);
    } else {
      if (ammo === 'bullet') { effects.push({ type: 'bullet_hit', row: target.row, col: target.col, startTime: performance.now(), duration: 420 }); spawnSpark(target.row, target.col, 8); }
      else if (isMelee) effects.push({ type: 'melee_flash', row: target.row, col: target.col, startTime: performance.now(), duration: 500 });
      else if (isFlame) { effects.push({ type: 'flame_hit', row: target.row, col: target.col, startTime: performance.now(), duration: 600 }); spawnSmokePuff(target.row, target.col, 4, 'rgba(30,30,30,'); }
      else { effects.push({ type: 'explosion', row: target.row, col: target.col, startTime: performance.now(), duration: isCrit ? 820 : 620 }); spawnSmokePuff(target.row, target.col, 5, 'rgba(40,40,40,'); }
      if (isCrit) showOverlay('💥 暴击！', 1000);

      if (target.type === 'unit') {
        var d = target.unit;
        if (d.anim) d.anim.flash = 1;
        var actual = 0;
        if (d.shield !== null && d.shield > 0 && power > 0) {
          var shieldBefore = d.shield;
          actual = Math.min(d.shield, power);
          d.shield = Math.max(0, d.shield - power);
          playShieldBlock();
          addFloatingText(target.row, target.col, '-' + formatDamage(actual), '#7fffd4', effects.length % 3);
          if (isNanoUnit(d) && shieldBefore > 0 && d.shield === 0 && d.alive) tryNanoSplit(d);
          if (shieldBefore > 0 && d.shield === 0 && !isNanoUnit(d)) {
            playShieldBreak();
            effects.push({ type: 'shield_flash', row: target.row, col: target.col, startTime: performance.now(), duration: 220 });
            effects.push({ type: 'shield_shatter', row: target.row, col: target.col, startTime: performance.now(), duration: 520 });
          }
        } else if (power > 0) {
          d.hp -= power; actual = power;
          addFloatingText(target.row, target.col, '-' + formatDamage(power), isCrit ? '#f0c040' : '#ffffff', effects.length % 3);
          if (isFlame && d.alive && d.hp > 0 && !isFireTank(d)) { d.burnTurns = 2; showOverlay('🔥 ' + d.cfg.name + ' 被点燃！', 1000); }
          if (d.hp <= 0) { destroyUnit(d); effects.push({ type: 'explosion', row: target.row, col: target.col, startTime: performance.now(), duration: 800 }); }
        } else addFloatingText(target.row, target.col, 'MISS', '#ffffff', effects.length % 3);
        if (attacker.team === 'red') redDamageDealt += actual; else blueDamageDealt += actual;
      } else if (target.type === 'hq' && power > 0) {
        target.hq.hp -= power;
        if (target.hq.baseTank) target.hq.baseTank.hp = Math.max(0, target.hq.baseTank.hp - power);
        addFloatingText(target.row, target.col, '-' + formatDamage(power), isCrit ? '#f0c040' : '#ffffff', effects.length % 3);
        if (isFlame) target.hq.burnTurns = 2;
        if (target.hq.hp <= 0) { triggerHQDestroy(target.hq === redHQ ? 'red' : 'blue'); return; }
      } else if (target.type === 'terrain' && power > 0) {
        damageTerrainFromExplosion(target.row, target.col, power);
      } else if (target.type === 'defense' && power > 0) {
        var def = target.defense;
        if (def.anim) def.anim.flash = 1;
        def.hp -= power;
        addFloatingText(target.row, target.col, '-' + formatDamage(power), isCrit ? '#f0c040' : '#ffcc66', 0);
        effects.push({ type: 'explosion', row: target.row, col: target.col, startTime: performance.now(), duration: 500 });
        if (def.hp <= 0) {
          def.alive = false;
          effects.push({ type: 'explosion_big', row: target.row, col: target.col, startTime: performance.now(), duration: 900 });
          spawnDust(target.row, target.col, 18, '#5c5c5c');
          showOverlay('💥 ' + def.cfg.name + ' 被摧毁！', 1200);
          if (campaignRunning) checkCampaignWin();
        }
      }
    }
    if (attacker.attackCountLeft <= 0 && attacker.cfg.attackCooldown > 0 && !attacker.cfg.isRobot && !attacker.cfg.isMissile && !attacker.cfg.isNuke && attacker.cfg.special !== 'repair') {
      attacker.cooldownRemaining = attacker.cfg.attackCooldown;
      attacker.cooldownLocked = true;
      showOverlay('⏳ 攻击次数用完，冷却 ' + attacker.cooldownRemaining + ' 完整回合', 1500);
    }
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  }, hitDelay);
}

function performEmptyAttack(unit, row, col) {
  if (!unit || !unit.alive || !unit.pos || unit.attackCountLeft <= 0 || unit.cooldownRemaining > 0) return;
  unit.attackCountLeft--;
  var tdr = row - unit.pos.row, tdc = col - unit.pos.col;
  var tAngle = Math.atan2(tdr, tdc) * 180 / Math.PI;
  tAngle = Math.round(tAngle / 45) * 45; if (tAngle < 0) tAngle += 360;
  unit.turretDir = tAngle;
  if (unit.anim) unit.anim.recoil = 1;
  var isMelee = unit.cfg.range === 1 || unit.cfg.ammoType === 'melee';
  var isFlame = unit.cfg.ammoType === 'flame';
  if (isFlame) flameJets.push({ fromR: unit.pos.row, fromC: unit.pos.col, toR: row, toC: col, team: unit.team, startTime: performance.now(), duration: 400 });
  else if (!isMelee) projectiles.push({ type: unit.cfg.ammoType || 'shell', fromR: unit.pos.row, fromC: unit.pos.col, toR: row, toC: col, team: unit.team, startTime: performance.now(), duration: 250 });
  setTimeout(function () {
    addFloatingText(row, col, 'MISS', '#ffffff', 0);
    showOverlay('💨 打空了！', 800);
    playGroundHit();
    if (unit.attackCountLeft <= 0 && unit.cfg.attackCooldown > 0 && !unit.cfg.isRobot && !unit.cfg.isMissile && !unit.cfg.isNuke && unit.cfg.special !== 'repair') {
      unit.cooldownRemaining = unit.cfg.attackCooldown; unit.cooldownLocked = true;
    }
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  }, 250);
}

function executeArtillery(unit, row, col) {
  if (!unit || !unit.alive || !unit.pos || unit.attackCountLeft <= 0 || unit.cooldownRemaining > 0) return;
  unit.attackCountLeft--;
  var tdr = row - unit.pos.row, tdc = col - unit.pos.col;
  var tAngle = Math.atan2(tdr, tdc) * 180 / Math.PI;
  tAngle = Math.round(tAngle / 45) * 45; if (tAngle < 0) tAngle += 360;
  unit.turretDir = tAngle;
  if (unit.anim) unit.anim.recoil = 1;
  playLaunch();
  projectiles.push({ type: 'artillery', fromR: unit.pos.row, fromC: unit.pos.col, toR: row, toC: col, team: unit.team, startTime: performance.now(), duration: 1000 });
  setTimeout(function () {
    playExplosion();
    effects.push({ type: 'explosion_big', row: row, col: col, startTime: performance.now(), duration: 900 });
    spawnSmokePuff(row, col, 10, 'rgba(40,40,40,');
    var centerTarget = redUnits.concat(blueUnits).find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
    var roll = rollDamage(unit, centerTarget, unit.cfg.attack);
    var crit = roll.isCrit, miss = roll.isMiss;
    var centerDmg = (unit.cfg.artilleryCenterDamage || 1) * (crit ? 2 : 1);
    var edgeDmg = (unit.cfg.artilleryEdgeDamage || 0.5) * (crit ? 2 : 1);
    var totalDmg = 0, R = unit.cfg.artilleryRadius || 1;
    for (var dr = -R; dr <= R; dr++) for (var dc = -R; dc <= R; dc++) {
      var r = row + dr, c = col + dc;
      if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) continue;
      if (Math.max(Math.abs(dr), Math.abs(dc)) > R) continue;
      var isCenter = (dr === 0 && dc === 0);
      var dmg = isCenter ? centerDmg : edgeDmg;
      var targets = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos && u.pos.row === r && u.pos.col === c && u !== unit; });
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        if (t.isUnderground) continue;
        if (devTools.godMode && t.team === 'blue') continue;
        if (hasDodge(t) && Math.random() < t.cfg.dodgeChance) { addFloatingText(r, c, 'MISS', '#7fffd4', 0); continue; }
        if (miss && isCenter) { addFloatingText(r, c, 'MISS', '#ffffff', 0); continue; }
        if (t.shield !== null && t.shield > 0) {
          t.shield = Math.max(0, t.shield - dmg);
          addFloatingText(r, c, '-' + formatDamage(Math.min(t.shield + dmg, dmg)), '#7fffd4', 0);
          if (isNanoUnit(t) && t.shield === 0 && t.alive) tryNanoSplit(t);
        } else {
          t.hp -= dmg; if (t.anim) t.anim.flash = 1;
          addFloatingText(r, c, '-' + formatDamage(dmg), isCenter ? '#fff' : '#ffe0a0', 0);
          if (t.hp <= 0) destroyUnit(t);
        }
        totalDmg += dmg;
      }
      if (redHQ && redHQ.pos && redHQ.pos.row === r && redHQ.pos.col === c && redHQ.hp > 0 && !(miss && isCenter)) {
        redHQ.hp -= dmg; totalDmg += dmg;
        if (redHQ.hp <= 0) { triggerHQDestroy('red'); return; }
      }
      if (blueHQ && blueHQ.pos && blueHQ.pos.row === r && blueHQ.pos.col === c && blueHQ.hp > 0 && !(miss && isCenter)) {
        blueHQ.hp -= dmg; totalDmg += dmg;
        if (blueHQ.hp <= 0) { triggerHQDestroy('blue'); return; }
      }
      damageTerrainFromExplosion(r, c, dmg);
    }
    if (unit.team === 'red') redDamageDealt += totalDmg; else blueDamageDealt += totalDmg;
    if (crit) showOverlay('💥 抛射暴击！', 1000);
    if (unit.attackCountLeft <= 0) { unit.cooldownRemaining = unit.cfg.attackCooldown; unit.cooldownLocked = true; }
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  }, 1000);
}

/* ---------- 建造 ---------- */
function canBuildAtEngineer(builder, row, col) {
  if (row < 0 || row >= ROWS.length || col < 0 || col >= COLS) return false;
  var t = gridData[row][col].terrain;
  if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt' || t === 'ruins' || t === 'ruins_block' || t === 'jump_pad' || t === 'river') return false;
  if (isCellBase(row, col)) return false;
  if (getUnitAt(row, col)) return false;
  return true;
}
function canBuildAtFlyer(builder, row, col) {
  if (row < 0 || row >= ROWS.length || col < 0 || col >= COLS) return false;
  var t = gridData[row][col].terrain;
  if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt' || t === 'ruins' || t === 'ruins_block') return false;
  if (isCellBase(row, col)) return false;
  if (getUnitAt(row, col)) return false;
  return true;
}
function canBuildAt(builder, row, col) {
  if (builder.cfg.special === 'builder') return canBuildAtEngineer(builder, row, col);
  if (builder.cfg.special === 'rocket_builder' || builder.cfg.special === 'nuke_builder') return canBuildAtFlyer(builder, row, col);
  return false;
}
async function executeBuild(builder, row, col) {
  if (builder.buildCountLeft <= 0) { showOverlay('⏳ 建造次数已用完', 1000); return; }
  var cur = getCurrentUnits();
  var limit = 0, curCount = 0, label = '', childCfg = null, childKind = '', actionWord = '建造';
  if (builder.cfg.special === 'builder') {
    limit = builder.cfg.robotLimit; curCount = cur.filter(function (u) { return u.cfg.isRobot && u.alive; }).length;
    label = '🤖 机器人';
    childCfg = Object.assign({}, ROBOT, { color: builder.team === 'red' ? '#e94560' : '#4da6ff', turretColor: builder.team === 'red' ? '#c0392b' : '#2980b9', accentColor: builder.team === 'red' ? '#f1948a' : '#85c1e9' });
    childKind = 'robot';
  } else if (builder.cfg.special === 'rocket_builder') {
    limit = builder.cfg.rocketLimit; curCount = cur.filter(function (u) { return u.cfg.isMissile && u.alive; }).length;
    label = '🚀 导弹';
    childCfg = Object.assign({}, MISSILE, { color: builder.team === 'red' ? '#e94560' : '#4da6ff', accentColor: '#ffffff' });
    childKind = 'missile'; actionWord = '发射';
  } else if (builder.cfg.special === 'nuke_builder') {
    limit = builder.cfg.nukeLimit; curCount = cur.filter(function (u) { return u.cfg.isNuke && u.alive; }).length;
    label = '☢️ 核弹';
    childCfg = Object.assign({}, NUKE, { color: '#ffffff', turretColor: builder.team === 'red' ? '#e94560' : '#4da6ff', accentColor: builder.team === 'red' ? '#e94560' : '#4da6ff' });
    childKind = 'nuke'; actionWord = '发射';
  } else return;

  if (curCount >= limit) { showOverlay(label + ' 已达上限', 1000); return; }
  if (!canBuildAt(builder, row, col)) { showOverlay('❌ 无法在此位置建造', 800); return; }

  var isAI = (gameMode === 'pve' && builder.team === 'blue') || trustEnabled[builder.team] || (gameMode === 'campaign' && builder.team === 'red');
  var aimDur = isAI ? 150 : 350;
  builder.aimAnim = { row: row, col: col, startTime: performance.now(), life: aimDur };
  playTone(300, .15, 'sawtooth', .12, 600);
  await sleep(aimDur);
  builder.aimAnim = null;
  builder.buildCountLeft--;

  var child = new Unit(childCfg, builder.team, { row: row, col: col });
  child.builder = builder;
  var dr = row - builder.pos.row, dc = col - builder.pos.col;
  var angle = Math.atan2(dr, dc) * 180 / Math.PI;
  angle = Math.round(angle / 45) * 45; if (angle < 0) angle += 360;
  if (childKind === 'missile' || childKind === 'nuke') { child.direction = angle; child.bodyDir = angle; child.turretDir = angle; }
  builder.turretDir = angle;
  if (childKind === 'robot') { child.moveStepsLeft = 0; child.attackCountLeft = 0; child.buildCountLeft = 0; child.freshBuild = true; }
  cur.push(child);
  gridData[row][col].occupant = builder.team === 'red' ? 'red_tank' : 'blue_tank';
  initUnitAnim(child);
  playBuild();
  effects.push({ type: 'build_ring', row: row, col: col, startTime: performance.now(), duration: 1200 });
  showOverlay(label + ' ' + actionWord + '完成！', 800);

  if (builder.buildCountLeft <= 0) {
    builder.cooldownRemaining = builder.cfg.buildCooldown;
    builder.cooldownLocked = true;
    showOverlay('⏳ ' + actionWord + '次数用完，冷却 ' + builder.cooldownRemaining + ' 完整回合', 1500);
  }
  updateGameUI(); drawGameCanvas(performance.now());
  if (builder.alive && builder.buildCountLeft > 0 && builder.cooldownRemaining <= 0 && currentUnit === builder && !isAI) {
    selectedAction = 'attack'; highlightedCells = []; highlightedBuildCells = [];
    for (var dr2 = -1; dr2 <= 1; dr2++) for (var dc2 = -1; dc2 <= 1; dc2++) {
      if (dr2 === 0 && dc2 === 0) continue;
      var nr = builder.pos.row + dr2, nc = builder.pos.col + dc2;
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
      highlightedCells.push({ row: nr, col: nc });
      highlightedBuildCells.push({ row: nr, col: nc, canBuild: canBuildAt(builder, nr, nc) });
    }
  } else { selectedAction = null; highlightedCells = []; highlightedBuildCells = []; }
  if (autoSkipEnabled) checkAutoSkip();
}

/* ---------- 治疗 ---------- */
function executeHeal(healer, row, col, target) {
  if (healer.attackCountLeft <= 0) return;
  var healAmt = healer.cfg.healAmount || 0.5;
  healer.attackCountLeft--;
  var tdr = row - healer.pos.row, tdc = col - healer.pos.col;
  var tAngle = Math.atan2(tdr, tdc) * 180 / Math.PI;
  tAngle = Math.round(tAngle / 45) * 45; if (tAngle < 0) tAngle += 360;
  healer.turretDir = tAngle;
  playHeal(); playRepairBeam();
  healBeams.push({ fromR: healer.pos.row, fromC: healer.pos.col, toR: row, toC: col, mode: 'heal', startTime: performance.now(), duration: 500 });
  var isAllyHQ = (redHQ && redHQ.pos.row === row && redHQ.pos.col === col) || (blueHQ && blueHQ.pos.row === row && blueHQ.pos.col === col);
  setTimeout(function () {
    if (isAllyHQ) {
      var hq = (redHQ && redHQ.pos.row === row && redHQ.pos.col === col) ? redHQ : blueHQ;
      if (hq && hq.hp > 0) {
        var before = hq.hp;
        hq.hp = Math.min(hq.maxHp, hq.hp + healAmt);
        var actual = hq.hp - before;
        if (hq.baseTank) hq.baseTank.hp = hq.hp;
        if (actual > 0) addFloatingText(row, col, '+' + formatDamage(actual), '#7fffd4', 0);
      }
    } else if (target && target.alive) {
      var before2 = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + healAmt);
      var actual2 = target.hp - before2;
      if (target.burnTurns > 0 && !isFireTank(target)) target.burnTurns = 0;
      if (actual2 > 0) addFloatingText(row, col, '+' + formatDamage(actual2), '#7fffd4', 0);
      else addFloatingText(row, col, '满血', '#aaaaaa', 0);
    }
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  }, 300);
}

/* ---------- 导弹自爆 ---------- */
function executeSelfDestruct(missile, centerRow, centerCol) {
  if (!missile || !missile.alive || missile.attackCountLeft <= 0) return;
  missile.attackCountLeft--;
  var dmg = missile.cfg.attack;
  effects.push({ type: 'explosion_big', row: centerRow, col: centerCol, startTime: performance.now(), duration: 900 });
  playExplosion();
  showOverlay('💥 导弹自爆！', 1200);
  for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
    var nr = centerRow + dr, nc = centerCol + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    var targets = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos && u.pos.row === nr && u.pos.col === nc && u !== missile; });
    for (var ti = 0; ti < targets.length; ti++) {
      var u = targets[ti];
      if (u.isUnderground) continue;
      if (devTools.godMode && u.team === 'blue') continue;
      if (hasDodge(u) && Math.random() < u.cfg.dodgeChance) { addFloatingText(nr, nc, 'MISS', '#7fffd4', 0); continue; }
      if (u.shield !== null && u.shield > 0) {
        var absorb = Math.min(u.shield, dmg); u.shield = Math.max(0, u.shield - dmg);
        addFloatingText(nr, nc, '-' + formatDamage(absorb), '#7fffd4', 0);
        if (isNanoUnit(u) && absorb > 0 && u.shield === 0 && u.alive) tryNanoSplit(u);
      } else {
        u.hp -= dmg; if (u.anim) u.anim.flash = 1;
        addFloatingText(nr, nc, '-' + formatDamage(dmg), '#ffffff', 0);
        if (u.hp <= 0) destroyUnit(u);
      }
      if (missile.team === 'red') redDamageDealt += dmg; else blueDamageDealt += dmg;
    }
    var ehq = missile.team === 'red' ? blueHQ : redHQ;
    if (ehq && ehq.pos && ehq.pos.row === nr && ehq.pos.col === nc && ehq.hp > 0) {
      ehq.hp -= dmg;
      if (ehq.hp <= 0) { triggerHQDestroy(missile.team === 'red' ? 'blue' : 'red'); return; }
    }
    damageTerrainFromExplosion(nr, nc, dmg);
  }
  destroyUnit(missile);
  updateGameUI(); drawGameCanvas(performance.now());
  if (autoSkipEnabled) checkAutoSkip();
}

/* ---------- 钻地车 ---------- */
async function executeDigIn(unit) {
  if (!canDig(unit)) return;
  if (unit.isUnderground) { showOverlay('已经在钻地状态', 800); return; }
  if (unit.waitingDigIn) { showOverlay('⏳ 已经在等待钻地', 1000); return; }
  if (unit.digJustUsedThisTurn) { showOverlay('⏳ 本回合已经用过钻地技能', 1000); return; }
  unit.waitingDigIn = true;
  unit.moveStepsLeft = 0; unit.attackCountLeft = 0;
  playDig();
  showOverlay('⏳ 已准备钻地，下回合将自动钻入', 1500);
  selectedAction = null; highlightedCells = [];
  updateGameUI(); drawGameCanvas(performance.now());
  if (autoSkipEnabled) checkAutoSkip();
}
async function performDigIn(unit) {
  if (!unit.alive || !unit.waitingDigIn) return;
  playDig();
  effects.push({ type: 'dig_in', row: unit.pos.row, col: unit.pos.col, startTime: performance.now(), duration: 600 });
  spawnDust(unit.pos.row, unit.pos.col, 18, '#5C3A21');
  unit.isUnderground = true;
  unit.moveStepsLeft = unit.cfg.digSpeed || 4;
  unit.waitingDigIn = false;
  unit.digJustUsedThisTurn = true;
  unit.attackCountLeft = 0;
  if (unit.burnTurns > 0) { unit.burnTurns = 0; showOverlay('⛏️ 钻入地底，灼烧被清除', 1200); }
  else showOverlay('⛏️ 已钻入地底', 1200);
  refreshMoveHighlight(unit);
}
async function executeUndergroundMove(unit, row, col) {
  if (!unit.isUnderground) return;
  if (unit.moveStepsLeft <= 0) { showOverlay('⛏️ 本回合地底步数已用完', 800); return; }
  if (Math.abs(unit.pos.row - row) > 1 || Math.abs(unit.pos.col - col) > 1) { showOverlay('❌ 只能移动到相邻格', 800); return; }
  var t = gridData[row][col].terrain;
  if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt') { showOverlay('❌ 无法穿过障碍物', 800); return; }
  if (isCellBase(row, col)) { showOverlay('❌ 无法穿过基地', 800); return; }
  inputLocked = true; updateActionButtons();
  try {
    var fromRow = unit.pos.row, fromCol = unit.pos.col;
    playMove();
    unit.pos = { row: row, col: col };
    startMoveAnim(unit, fromRow, fromCol, 320);
    unit.moveStepsLeft -= 1;
    await sleep(340);
    refreshMoveHighlight(unit);
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  } finally { inputLocked = false; updateActionButtons(); }
}
async function executeDigOut(unit, manual) {
  if (!unit.isUnderground) return;
  inputLocked = true; updateActionButtons();
  try {
    var r = unit.pos.row, c = unit.pos.col;
    var t = gridData[r][c].terrain;
    if (t === 'river' || t === 'bridge' || t === 'bridge_dmg' || t === 'bridge_crt') {
      showOverlay('❌ 无法在河/桥下出土', 1500);
      inputLocked = false; updateActionButtons(); return;
    }
    playSurface();
    effects.push({ type: 'dig_out', row: r, col: c, startTime: performance.now(), duration: 600 });
    spawnDust(r, c, 20, '#5C3A21');
    var other = getUnitAt(r, c);
    if (other && other !== unit) {
      if (isBaseTank(other)) { showOverlay('❌ 基地坦克占据此格，无法出土', 1500); inputLocked = false; updateActionButtons(); return; }
      var rad = ((unit.bodyDir % 360) + 360) % 360 * Math.PI / 180;
      var dirR = Math.round(Math.sin(rad)), dirC = Math.round(Math.cos(rad));
      var kbOk = await knockbackChain(other, dirR, dirC, [unit]);
      if (!kbOk) { showOverlay('⚠️ 无法出土：目标格被占据且无法击退', 1500); inputLocked = false; updateActionButtons(); return; }
    }
    gridData[r][c].occupant = unit.team === 'red' ? 'red_tank' : 'blue_tank';
    unit.isUnderground = false;
    unit.pendingDigOut = true;
    unit.moveStepsLeft = 0; unit.attackCountLeft = 0;
    showOverlay('⏳ 出土后本回合不能行动', 1000);
    selectedAction = null; highlightedCells = [];
    updateGameUI(); drawGameCanvas(performance.now());
    if (autoSkipEnabled) checkAutoSkip();
  } finally { inputLocked = false; updateActionButtons(); }
}
async function knockbackChain(target, dr, dc, ignore) {
  ignore = ignore || [];
  if (isBaseTank(target)) return false;
  var nr = target.pos.row + dr, nc = target.pos.col + dc;
  if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) return false;
  var t = gridData[nr][nc].terrain;
  if (t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt') return false;
  var nextTarget = getUnitAt(nr, nc);
  if (nextTarget && ignore.indexOf(nextTarget) < 0) {
    if (isBaseTank(nextTarget)) return false;
    var ok = await knockbackChain(nextTarget, dr, dc, ignore);
    if (!ok) return false;
  }
  var old = gridData[target.pos.row][target.pos.col]; if (old) old.occupant = null;
  var fromR = target.pos.row, fromC = target.pos.col;
  target.pos = { row: nr, col: nc };
  target.wasKnockbacked = true;
  gridData[nr][nc].occupant = target.team === 'red' ? 'red_tank' : 'blue_tank';
  var nextIsRiver = isInRiverRange(nr, nc);
  if (nextIsRiver && !canWalkOnRiver(target)) {
    effects.push({ type: 'sink', row: nr, col: nc, startTime: performance.now(), duration: 800 });
    showOverlay('💧 ' + target.cfg.name + ' 被击退落水沉没！', 1500);
    destroyUnit(target);
  } else {
    effects.push({ type: 'knockback', row: nr, col: nc, startTime: performance.now(), duration: 400 });
    startMoveAnim(target, fromR, fromC, 300);
  }
  return true;
}

/* ---------- 地形破坏 ---------- */
function handleBridgeCollapse(row, col) {
  var unitOnCell = getUnitAt(row, col);
  if (!unitOnCell) return;
  if (unitOnCell.isUnderground) return;
  if (canWalkOnRiver(unitOnCell)) return;
  effects.push({ type: 'sink', row: row, col: col, startTime: performance.now(), duration: 800 });
  playWaterSplash();
  showOverlay('💧 桥面崩塌！' + unitOnCell.cfg.name + ' 落水沉没！', 1500);
  destroyUnit(unitOnCell);
  updateGameUI();
}
function damageTerrainFromExplosion(row, col, dmg) {
  if (row < 0 || row >= ROWS.length || col < 0 || col >= COLS) return;
  var cell = gridData[row][col]; if (!cell) return;
  var t = cell.terrain;
  var isObstacle = t === 'obstacle' || t === 'obstacle_dmg' || t === 'obstacle_crt';
  var isBridge = t === 'bridge' || t === 'bridge_dmg' || t === 'bridge_crt';
  if (!isObstacle && !isBridge) return;
  if (cell.hp <= 0) return;
  cell.hp -= dmg;
  if (cell.hp <= 0) {
    if (isObstacle) { spawnDebris(row, col, 14, '#5c5c5c'); cell.terrain = 'ruins'; cell.hp = 0; cell.maxHp = 0; }
    else if (isBridge) {
      spawnDebris(row, col, 12, '#b07c46'); playWoodHit();
      cell.terrain = 'river'; cell.hp = 0; cell.maxHp = 0;
      addSingleCellRiverRange(row, col);
      handleBridgeCollapse(row, col);
    }
    effects.push({ type: 'explosion', row: row, col: col, startTime: performance.now(), duration: 620 });
  } else {
    if (isObstacle) { cell.terrain = cell.hp >= 4 ? 'obstacle' : cell.hp >= 2 ? 'obstacle_dmg' : 'obstacle_crt'; }
    if (isBridge) { cell.terrain = cell.hp >= 2 ? 'bridge' : cell.hp >= 1 ? 'bridge_dmg' : 'bridge_crt'; }
    spawnDebris(row, col, 6, isObstacle ? '#5c5c5c' : '#b07c46');
  }
  updateGameUI();
}

/* ---------- 核弹/辐射 ---------- */
async function processNukePhase(team) {
  var units = team === 'red' ? redUnits : blueUnits;
  var nukes = units.filter(function (u) { return u.alive && u.cfg.isNuke; });
  if (nukes.length > 0) { inputLocked = true; updateGameUI(); }
  for (var ni = 0; ni < nukes.length; ni++) {
    var nuke = nukes[ni];
    if (!nuke.alive) continue;
    var exploded = false;
    for (var step = 0; step < nuke.cfg.speed; step++) {
      if (exploded || !nuke.alive) break;
      var dirRad = nuke.direction * Math.PI / 180;
      var dr = Math.round(Math.sin(dirRad)), dc = Math.round(Math.cos(dirRad));
      var nr = nuke.pos.row + dr, nc = nuke.pos.col + dc;
      if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) {
        exploded = true; await triggerNukeExplosion(nuke, nuke.pos.row, nuke.pos.col); break;
      }
      var targetTerrain = gridData[nr][nc].terrain;
      var targetUnit = getUnitAt(nr, nc);
      var targetHQ = (redHQ && redHQ.pos.row === nr && redHQ.pos.col === nc) || (blueHQ && blueHQ.pos.row === nr && blueHQ.pos.col === nc);
      if (targetTerrain === 'obstacle' || targetTerrain === 'obstacle_dmg' || targetTerrain === 'obstacle_crt' || (targetUnit && targetUnit !== nuke) || targetHQ) {
        exploded = true; await triggerNukeExplosion(nuke, nuke.pos.row, nuke.pos.col); break;
      }
      var old = gridData[nuke.pos.row][nuke.pos.col]; if (old) old.occupant = null;
      var oldR = nuke.pos.row, oldC = nuke.pos.col;
      nuke.pos = { row: nr, col: nc };
      gridData[nr][nc].occupant = nuke.team === 'red' ? 'red_tank' : 'blue_tank';
      startMoveAnim(nuke, oldR, oldC, 300);
      playTone(180, .18, 'sawtooth', .1, 320);
      drawGameCanvas(performance.now());
      await sleep(300);
    }
  }
  if (nukes.length > 0) { inputLocked = false; updateActionButtons(); }
  updateGameUI(); drawGameCanvas(performance.now());
}
async function triggerNukeExplosion(nuke, centerRow, centerCol) {
  nukeScreenShakeUntil = performance.now() + 1800;
  nukeWhiteFlashUntil = performance.now() + 200;
  effects.push({ type: 'nuke_preslash', row: nuke.pos.row, col: nuke.pos.col, startTime: performance.now(), duration: 220 });
  drawGameCanvas(performance.now());
  await sleep(220);
  var nukeTeam = nuke.team;
  effects.push({ type: 'nuke_blast', row: centerRow, col: centerCol, startTime: performance.now(), duration: 1800 });
  playNukeExplosion();
  for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
    var r = centerRow + dr, c = centerCol + dc;
    if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) continue;
    var targets = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos && u.pos.row === r && u.pos.col === c; });
    for (var ti = 0; ti < targets.length; ti++) {
      var u = targets[ti];
      if (u.isUnderground) continue;
      if (devTools.godMode && u.team === 'blue') continue;
      if (hasDodge(u) && Math.random() < u.cfg.dodgeChance) { addFloatingText(r, c, 'MISS', '#7fffd4', 0); continue; }
      var dmgToUnit = u.cfg.nukeDamageOverride || 999;
      if (u.shield !== null && u.shield > 0) {
        u.shield = 0; playShieldBlock();
        addFloatingText(r, c, '护盾抵挡', '#7fffd4', 0);
        if (isNanoUnit(u) && u.alive) tryNanoSplit(u);
        continue;
      }
      if (u.anim) u.anim.flash = 1;
      if (u.cfg.nukeDamageOverride) {
        u.hp -= dmgToUnit; addFloatingText(r, c, '-' + dmgToUnit, '#ff8080', 0);
        if (u.hp <= 0) destroyUnit(u);
      } else destroyUnit(u);
      effects.push({ type: 'explosion', row: r, col: c, startTime: performance.now(), duration: 800 });
    }
    damageTerrainFromExplosion(r, c, 2);
    if (redHQ && redHQ.pos.row === r && redHQ.pos.col === c && redHQ.hp > 0) {
      var dhq = (redHQ.baseTank && redHQ.baseTank.cfg.nukeDamageOverride) ? redHQ.baseTank.cfg.nukeDamageOverride : 3;
      redHQ.hp -= dhq; addFloatingText(r, c, '-' + dhq, '#ff8080', 0);
    }
    if (blueHQ && blueHQ.pos.row === r && blueHQ.pos.col === c && blueHQ.hp > 0) {
      var dhq2 = (blueHQ.baseTank && blueHQ.baseTank.cfg.nukeDamageOverride) ? blueHQ.baseTank.cfg.nukeDamageOverride : 3;
      blueHQ.hp -= dhq2; addFloatingText(r, c, '-' + dhq2, '#80c0ff', 0);
    }
  }
  destroyUnit(nuke);
  radiationSources.push({ row: centerRow, col: centerCol, x: 3, team: nukeTeam, heldOnce: false });
  updateGameUI(); drawGameCanvas(performance.now());
  if ((redHQ && redHQ.hp <= 0) || (blueHQ && blueHQ.hp <= 0)) {
    var loser = (redHQ && redHQ.hp <= 0) ? 'red' : 'blue';
    await sleep(800); triggerHQDestroy(loser); return;
  }
  await sleep(1000);
  updateGameUI(); drawGameCanvas(performance.now());
}
function applyRadiationTurnDamage() {
  var all = redUnits.concat(blueUnits);
  for (var li = 0; li < all.length; li++) {
    var launcher = all[li];
    if (!launcher.alive || !launcher.pos || !launcher.cfg.isNukeLauncher) continue;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      var r = launcher.pos.row + dr, c = launcher.pos.col + dc;
      if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) continue;
      var t = all.find(function (u) { return u.alive && u.pos && u.pos.row === r && u.pos.col === c; });
      if (!t || t.cfg.isNukeLauncher || t.cfg.immuneRadiation || t.isUnderground || isFlyingUnit(t)) continue;
      if (getRadiationDepthAt(r, c) > 0) continue;
      if (devTools.godMode && t.team === 'blue') continue;
      t.hp -= 0.5; addFloatingText(r, c, '-0.5', '#ff9944', 0);
      if (t.hp <= 0) destroyUnit(t);
    }
  }
  for (var si = 0; si < radiationSources.length; si++) {
    var src = radiationSources[si]; if (src.x <= 0) continue;
    var radius = 3 - src.x;
    for (var dr2 = -radius; dr2 <= radius; dr2++) for (var dc2 = -radius; dc2 <= radius; dc2++) {
      var r2 = src.row + dr2, c2 = src.col + dc2;
      if (r2 < 0 || r2 >= ROWS.length || c2 < 0 || c2 >= COLS) continue;
      var u2 = redUnits.concat(blueUnits).find(function (unit) { return unit.alive && unit.pos && unit.pos.row === r2 && unit.pos.col === c2; });
      if (u2) {
        if (u2.cfg.immuneRadiation || u2.isUnderground || isFlyingUnit(u2)) continue;
        if (devTools.godMode && u2.team === 'blue') continue;
        u2.hp -= 0.5; addFloatingText(r2, c2, '-0.5', '#e67e22', 0);
        if (u2.hp <= 0) destroyUnit(u2);
      }
    }
  }
  for (var si2 = 0; si2 < radiationSources.length; si2++) {
    var src2 = radiationSources[si2]; if (src2.x <= 0) continue;
    if (src2.x === 1 && !src2.heldOnce) { src2.heldOnce = true; continue; }
    src2.x--;
  }
  radiationSources = radiationSources.filter(function (s) { return s.x > 0; });
  updateGameUI(); drawGameCanvas(performance.now());
}
function applyBurnTurnDamage() {
  var all = redUnits.concat(blueUnits);
  for (var i = 0; i < all.length; i++) {
    var u = all[i]; if (!u.alive || u.burnTurns <= 0 || u.isUnderground) continue;
    u.burnTurns--;
    if (u.shield !== null && u.shield > 0) {
      u.shield = Math.max(0, u.shield - 0.5); playShieldBlock();
      addFloatingText(u.pos.row, u.pos.col, '护盾抵挡', '#7fffd4', 0);
      if (u.shield === 0) { if (isNanoUnit(u) && u.alive) tryNanoSplit(u); else u.burnTurns = 0; }
    } else {
      u.hp -= 0.5; addFloatingText(u.pos.row, u.pos.col, '-0.5', '#FF6B00', 0); playBurn();
      if (u.hp <= 0) { destroyUnit(u); effects.push({ type: 'explosion', row: u.pos.row, col: u.pos.col, startTime: performance.now(), duration: 620 }); }
    }
  }
  for (var hi = 0; hi < [redHQ, blueHQ].length; hi++) {
    var hq = [redHQ, blueHQ][hi]; if (!hq || hq.hp <= 0) continue;
    if (hq.burnTurns && hq.burnTurns > 0) {
      hq.burnTurns--; hq.hp -= 0.5;
      if (hq.baseTank) hq.baseTank.hp = Math.max(0, hq.baseTank.hp - 0.5);
      if (hq.hp <= 0) { triggerHQDestroy(hq === redHQ ? 'red' : 'blue'); return; }
    }
  }
}
function applyFireTankSelfBurn() {
  var all = redUnits.concat(blueUnits);
  for (var i = 0; i < all.length; i++) {
    var u = all[i]; if (!u.alive || !isFireTank(u) || u.isUnderground) continue;
    var amt = u.cfg.selfBurnPerTurn || 0.5;
    u.hp -= amt; addFloatingText(u.pos.row, u.pos.col, '-' + formatDamage(amt), '#ff4422', 0);
    playBurn();
    if (u.hp <= 0) destroyUnit(u);
  }
}

/* ---------- 基地摧毁 ---------- */
async function triggerHQDestroy(team) {
  currentState = 'GAME_OVER';
  inputLocked = true;
  var hq = team === 'red' ? redHQ : blueHQ;
  if (!hq) { inputLocked = false; return; }
  hq.hp = 0;
  if (hq.baseTank) hq.baseTank.hp = 0;
  playHQDestroy();
  baseScreenShakeUntil = performance.now() + 2000;
  nukeWhiteFlashUntil = performance.now() + 200;
  var r = hq.pos.row, c = hq.pos.col;
  effects.push({ type: 'hq_destroy_stage1', row: r, col: c, startTime: performance.now(), duration: 600 });
  await sleep(600);
  effects.push({ type: 'hq_destroy_stage2', row: r, col: c, startTime: performance.now(), duration: 500 });
  await sleep(500);
  effects.push({ type: 'hq_destroy_stage3', row: r, col: c, startTime: performance.now(), duration: 900 });
  spawnDebris(r, c, 20, '#5c5c5c');
  await sleep(900);
  if (gridData[r] && gridData[r][c]) { gridData[r][c].isHQ = null; gridData[r][c].terrain = 'ruins'; }
  inputLocked = false;
  updateGameUI(); drawGameCanvas(performance.now());
  showOverlay('🏆 ' + (team === 'red' ? '蓝方' : '红方') + '胜利！', 1400);
  playVictory();
  setTimeout(function () {
    if (campaignRunning) showCampaignSettlement(true);
    else showSettlement();
  }, 500);
}

/* ============================================================
   回合切换（★ 修复：AI 调度竞态）
============================================================ */
function getCurrentUnits() { return currentTeam === 'red' ? redUnits : blueUnits; }
function getEnemyUnits() { return currentTeam === 'red' ? blueUnits : redUnits; }
function getEnemyHQ() { return currentTeam === 'red' ? blueHQ : redHQ; }

async function endTurn() {
  if (currentState !== 'GAME_PLAY') return;
  if (isEndingTurn) return;
  if (inputLocked) return;
  isEndingTurn = true;
  inputLocked = true;
  updateActionButtons();

  try {
    if (checkWinCondition()) return;

    /* 跳板等待倒计时 */
    var curUnits = getCurrentUnits();
    for (var i = 0; i < curUnits.length; i++) {
      var unit = curUnits[i];
      if (!unit.alive || !unit.waitingJump) continue;
      unit.jumpWaitTurns--;
      if (unit.jumpWaitTurns <= 0) {
        var dest = unit.jumpDest;
        if (dest) await runJumpAnim(unit, dest);
        unit.waitingJump = false; unit.jumpDest = null; unit.jumpWaitTurns = 0;
      }
    }

    /* 战役：蓝方防御建筑先开火 */
    if (campaignRunning) { try { await runBlueDefenseBuildings(); } catch (e) {} }

    /* 核弹飞行 */
    await processNukePhase(currentTeam);
    if (currentState !== 'GAME_PLAY') return;

    /* 战役：红方 AI 行动 */
    if (campaignRunning && currentTeam === 'red') {
      try { await runRedAI(); } catch (e) {}
      if (currentState !== 'GAME_PLAY') return;
    }

    /* 战役：红方防御建筑开火 */
    if (campaignRunning) {
      try { await runDefenseBuildings(); } catch (e) {}
      if (currentState !== 'GAME_PLAY') return;
    }

    /* 焚火自灼烧 */
    applyFireTankSelfBurn();

    /* 纳米自修复 */
    for (var ni = 0; ni < curUnits.length; ni++) {
      var nu = curUnits[ni];
      if (!nu.alive || nu.cfg.special !== 'nano_repair' || nu.isUnderground) continue;
      var moved = nu.hasMoved || nu.wasKnockbacked || nu.moveStepsLeft !== nu.cfg.speed;
      if (!moved && nu.hp < nu.maxHp) {
        var before = nu.hp;
        nu.hp = Math.min(nu.maxHp, nu.hp + (nu.cfg.selfHealAmount || 0.5));
        if (nu.hp > before) { addFloatingText(nu.pos.row, nu.pos.col, '+' + formatDamage(nu.hp - before), '#3498DB', 0); playHeal(); }
      }
    }

    var prevTeam = currentTeam;
    var isFullTurnEnd = prevTeam === 'blue';

    for (var ci = 0; ci < curUnits.length; ci++) {
      var cu = curUnits[ci];
      if (!cu.alive) continue;
      if (cu.cooldownRemaining > 0 && !cu.cooldownLocked) cu.cooldownRemaining--;
      cu.cooldownLocked = false;
    }

    if (isFullTurnEnd) {
      totalTurns++;
      if (campaignRunning) { try { campaignCheckWaves(); } catch (e) {} }
      applyRadiationTurnDamage();
      applyBurnTurnDamage();
    }

    /* 复活倒计时 */
    for (var ri = 0; ri < curUnits.length; ri++) {
      var ru = curUnits[ri];
      if (ru.alive || ru.cfg.isRobot || ru.cfg.isMissile || ru.cfg.isNuke || isBaseTank(ru)) continue;
      if (ru.respawnCountdown <= 0) continue;
      ru.respawnCountdown--;
      if (ru.respawnCountdown === 1) showOverlay('⏳ ' + ru.cfg.name + ' 还差1回合复活', 1400);
      if (ru.respawnCountdown > 0) continue;
      var hq = ru.team === 'red' ? redHQ : blueHQ;
      if (!hq || hq.hp <= 0) continue;
      var occ = ru.team === 'red' ? 'red_tank' : 'blue_tank';
      var forwardSign = ru.team === 'red' ? 1 : -1;
      var tryOrder = [
        { dr: forwardSign, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: forwardSign, dc: -1 }, { dr: forwardSign, dc: 1 },
        { dr: -forwardSign, dc: 0 }, { dr: -forwardSign, dc: -1 }, { dr: -forwardSign, dc: 1 }
      ];
      var spawn = null;
      for (var oi = 0; oi < tryOrder.length; oi++) {
        var nr = hq.pos.row + tryOrder[oi].dr, nc = hq.pos.col + tryOrder[oi].dc;
        if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
        if (isBlocked(nr, nc) || getUnitAt(nr, nc) || isCellBase(nr, nc)) continue;
        if (isInRiverRange(nr, nc) && !canWalkOnRiver(ru)) continue;
        spawn = { row: nr, col: nc }; break;
      }
      if (!spawn) { ru.respawnCountdown = 2; continue; }
      ru.alive = true; ru.hp = ru.maxHp;
      ru.pos = { row: spawn.row, col: spawn.col };
      ru.isInRiver = isInRiverRange(spawn.row, spawn.col);
      ru.cooldownRemaining = 0; ru.cooldownLocked = false;
      ru.waitingJump = false; ru.jumpDest = null; ru.jumpWaitTurns = 0;
      ru.isUnderground = false; ru.digJustUsedThisTurn = false;
      ru.waitingDigIn = false; ru.pendingDigOut = false;
      ru.burnTurns = 0;
      if (ru.cfg.shield !== undefined) { ru.shield = ru.cfg.shield; ru.shieldLayers = ru.cfg.shieldLayers || 0; }
      ru.moveStepsLeft = ru.cfg.speed; ru.attackCountLeft = ru.cfg.attackCount;
      ru.buildCountLeft = ru.cfg.buildCount || 0; ru.freshBuild = false;
      gridData[spawn.row][spawn.col].occupant = occ;
      if (ru.team === 'red') redRespawnCount++; else blueRespawnCount++;
      initUnitAnim(ru); ru.anim.born = performance.now();
      showOverlay('🔄 ' + ru.cfg.name + ' 已复活！', 1500);
    }

    /* 切队 */
    currentTeam = currentTeam === 'red' ? 'blue' : 'red';

    /* 新队伍清理出土状态 */
    var newUnits = getCurrentUnits();
    for (var pu = 0; pu < newUnits.length; pu++) { if (newUnits[pu].alive) newUnits[pu].pendingDigOut = false; }
    /* 新队伍处理钻地 */
    for (var pi = 0; pi < newUnits.length; pi++) {
      if (newUnits[pi].alive && newUnits[pi].waitingDigIn) await performDigIn(newUnits[pi]);
    }
    /* 新队伍重置回合 */
    for (var qi = 0; qi < newUnits.length; qi++) { if (newUnits[qi].alive) newUnits[qi].resetTurn(); }
    currentUnit = newUnits.find(function (u) { return u.alive && !u.cfg.isNuke; }) || newUnits[0] || null;
    selectedAction = null; highlightedCells = []; highlightedBuildCells = []; rangeDisplayUnit = null;
    updateGameUI(); updateTrustButton(); drawGameCanvas(performance.now());

  } finally {
    isEndingTurn = false;
    inputLocked = false;
    updateActionButtons();
    if (campaignRunning) updateCampaignTopbar();
  }

  /* ★ 修复：AI 调度放在 finally 之后，且使用 requestAnimationFrame 延迟一拍
     防止 aiTakeTurnForTrust 内的 await 与 endTurn 的 finally 竞态 */
  setTimeout(function () {
    if (currentState !== 'GAME_PLAY') return;
    if (isEndingTurn || inputLocked) return;
    var isAI = trustEnabled[currentTeam]
      || (gameMode === 'pve' && currentTeam === 'blue')
      || (gameMode === 'campaign' && currentTeam === 'red');
    if (isAI) {
      aiTakeTurnForTrust();
    } else if (autoSkipEnabled) {
      checkAutoSkip();
    }
  }, 100);
}

function checkWinCondition() {
  if (redHQ && redHQ.hp <= 0) { triggerHQDestroy('red'); return true; }
  if (blueHQ && blueHQ.hp <= 0) { triggerHQDestroy('blue'); return true; }
  return false;
}

/* ---------- 开始游戏 ---------- */
function startGame() {
  currentState = 'GAME_PLAY';
  gameMap = finalMap;
  gridData = initGridData(finalMap);
  ISO.ready = false;
  switchScreen('screen-game');
  setTimeout(function () { isoLayout(); drawGameCanvas(performance.now()); }, 60);
  initUnits();
  totalTurns = 0; redRespawnCount = 0; blueRespawnCount = 0;
  redDamageDealt = 0; blueDamageDealt = 0;
  effects = []; floatingTexts = []; radiationSources = [];
  projectiles = []; buildAnims = []; meleeAnims = []; trackMarkPool = []; wakeTrailPool = [];
  healBeams = []; flameJets = []; waterTransitions = []; deathFireExplosions = []; digTunnels = [];
  autoSkipEnabled = false; inputLocked = false; isEndingTurn = false;
  aiRunning = false; aiFocusTarget = null;
  trustEnabled = { red: false, blue: false };
  nukeScreenShakeUntil = 0; baseScreenShakeUntil = 0; nukeWhiteFlashUntil = 0;
  currentTeam = 'red';
  currentUnit = redUnits.find(function (u) { return u.alive && !u.cfg.isNuke; }) || redUnits[0] || null;
  selectedAction = null; highlightedCells = []; highlightedBuildCells = []; rangeDisplayUnit = null;

  setTimeout(function () {
    updateGameUI(); drawGameCanvas(performance.now());
    updateCampaignTopbar();
    startRenderLoop();
    if (gameMode === 'pve' && currentTeam === 'blue') {
      setTimeout(function () { aiTakeTurnForTrust(); }, 800);
    }
  }, 80);
  document.getElementById('action-hint').textContent = '🔴 红方回合 - 点击己方单位操作';
  showOverlay('🔴 红方回合开始', 1200);
  AudioManager.startBattleMusic();
}

function initUnits() {
  redUnits = []; blueUnits = [];
  var redCfg = TANK_CONFIGS.find(function (t) { return t.id === redSelectedTank; }) || TANK_CONFIGS[0];
  var blueCfg = TANK_CONFIGS.find(function (t) { return t.id === blueSelectedTank; }) || TANK_CONFIGS[0];
  var rp = posToIndex(redSelectedBase), bp = posToIndex(blueSelectedBase);
  basePosRef.red = { row: rp.row, col: rp.col };
  basePosRef.blue = { row: bp.row, col: bp.col };

  for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) {
    if (gridData[r][c].isRedBase && !(r === rp.row && c === rp.col)) { gridData[r][c].isRedBase = false; gridData[r][c].terrain = 'plain'; }
    if (gridData[r][c].isBlueBase && !(r === bp.row && c === bp.col)) { gridData[r][c].isBlueBase = false; gridData[r][c].terrain = 'plain'; }
  }
  gridData[rp.row][rp.col].isHQ = 'red';
  gridData[bp.row][bp.col].isHQ = 'blue';

  if (redCfg.isBaseTank) {
    var ru = new Unit(redCfg, 'red', { row: rp.row, col: rp.col });
    redUnits.push(ru); gridData[rp.row][rp.col].occupant = 'red_tank';
    baseTankRef.red = ru; initUnitAnim(ru);
    redHQ = { pos: rp, hp: redCfg.hp, maxHp: redCfg.hp, burnTurns: 0, baseTank: ru };
  } else {
    var spawn = findSpawnAroundBase(rp.row, rp.col, 'red', redCfg);
    if (spawn) { var ru2 = new Unit(redCfg, 'red', { row: spawn.row, col: spawn.col }); redUnits.push(ru2); gridData[spawn.row][spawn.col].occupant = 'red_tank'; initUnitAnim(ru2); }
    redHQ = { pos: rp, hp: 6, maxHp: 6, burnTurns: 0, baseTank: null };
  }
  if (blueCfg.isBaseTank) {
    var bu = new Unit(blueCfg, 'blue', { row: bp.row, col: bp.col });
    blueUnits.push(bu); gridData[bp.row][bp.col].occupant = 'blue_tank';
    baseTankRef.blue = bu; initUnitAnim(bu);
    blueHQ = { pos: bp, hp: blueCfg.hp, maxHp: blueCfg.hp, burnTurns: 0, baseTank: bu };
  } else {
    var spawnB = findSpawnAroundBase(bp.row, bp.col, 'blue', blueCfg);
    if (spawnB) { var bu2 = new Unit(blueCfg, 'blue', { row: spawnB.row, col: spawnB.col }); blueUnits.push(bu2); gridData[spawnB.row][spawnB.col].occupant = 'blue_tank'; initUnitAnim(bu2); }
    blueHQ = { pos: bp, hp: 6, maxHp: 6, burnTurns: 0, baseTank: null };
  }
}
function findSpawnAroundBase(baseR, baseC, team, cfg) {
  var forwardSign = team === 'red' ? 1 : -1;
  var tryOrder = [{ dr: forwardSign, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }, { dr: forwardSign, dc: -1 }, { dr: forwardSign, dc: 1 }, { dr: -forwardSign, dc: 0 }];
  for (var i = 0; i < tryOrder.length; i++) {
    var nr = baseR + tryOrder[i].dr, nc = baseC + tryOrder[i].dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    if (isBlocked(nr, nc) || getUnitAt(nr, nc) || isCellBase(nr, nc)) continue;
    if (isInRiverRange(nr, nc) && !canWalkOnRiver({ cfg: cfg, isUnderground: false })) continue;
    return { row: nr, col: nc };
  }
  return null;
}

/* ---------- 结算 ---------- */
function showSettlement() {
  var ov = document.getElementById('modal-settlement');
  var winner = (redHQ && redHQ.hp <= 0) ? '蓝方' : '红方';
  document.getElementById('settlement-title').textContent = '🏆 ' + winner + '胜利！';
  var stats = document.getElementById('settlement-stats');
  stats.innerHTML =
    '<div><span>🔴 红方总伤害</span><span>' + redDamageDealt.toFixed(1) + '</span></div>' +
    '<div><span>🔵 蓝方总伤害</span><span>' + blueDamageDealt.toFixed(1) + '</span></div>' +
    '<div><span>⏱ 总回合数</span><span>' + totalTurns + '</span></div>';
  var btnRow = document.getElementById('settlement-buttons');
  btnRow.innerHTML = '';
  var mainBtn = document.createElement('button');
  mainBtn.className = 'btn btn-gold'; mainBtn.textContent = '🏠 返回主菜单';
  mainBtn.onclick = function () { ov.classList.remove('show'); cleanupBattle(); stopRenderLoop(); switchScreen('screen-main'); AudioManager.startMenuMusic(); };
  btnRow.appendChild(mainBtn);
  ov.classList.add('show');
  if (typeof reportGameResult === 'function') reportGameResult(winner === '红方' ? 'red' : 'blue');
}

function cleanupBattle() {
  redUnits = []; blueUnits = []; defenseBuildings = [];
  redHQ = null; blueHQ = null;
  basePosRef = { red: null, blue: null }; baseTankRef = { red: null, blue: null };
  effects = []; floatingTexts = []; projectiles = []; radiationSources = [];
  trackMarkPool = []; wakeTrailPool = []; healBeams = []; flameJets = []; deathFireExplosions = [];
  buildAnims = []; meleeAnims = [];
  currentUnit = null; selectedAction = null; highlightedCells = []; highlightedBuildCells = []; rangeDisplayUnit = null;
  inputLocked = false; isEndingTurn = false; aiRunning = false;
  totalTurns = 0; redDamageDealt = 0; blueDamageDealt = 0;
  fogState = []; fogTotalCount = 0; fogExploredCount = 0;
  campaignRunning = false; onlineRunning = false;
  if (typeof CampaignRun !== 'undefined') { CampaignRun.active = false; }
  var topbar = document.getElementById('campaign-topbar');
  if (topbar) { topbar.classList.remove('show'); topbar.textContent = ''; }
}

/* ---------- 通用交互 ---------- */
function selectAction(action) {
  playClick();
  if (currentState !== 'GAME_PLAY' || inputLocked) return;
  if ((gameMode === 'pve' && currentTeam === 'blue') || trustEnabled[currentTeam]) { showOverlay('🤖 AI托管中，请等待', 1000); return; }
  var unit = currentUnit;
  if (!unit || !unit.alive) return;
  if (rangeDisplayUnit) { rangeDisplayUnit = null; var rb = document.getElementById('btn-range-toggle'); if (rb) rb.classList.remove('active'); }

  if (action === 'move') {
    if (unit.isUnderground) {
      if (unit.moveStepsLeft <= 0) { showOverlay('⚠️ 本回合地底步数已用完', 1000); return; }
      if (selectedAction === 'move') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
      selectedAction = 'move'; highlightedCells = getUndergroundMoveCells(unit);
      document.getElementById('action-hint').textContent = '⛏️ 地底移动 - 剩余步数: ' + unit.moveStepsLeft;
      updateActionButtons(); drawGameCanvas(performance.now()); return;
    }
    if (unit.waitingJump) { showOverlay('⏳ 等待跳板中', 1200); return; }
    if (unit.waitingDigIn) { showOverlay('⏳ 等待钻地中', 1200); return; }
    if (unit.pendingDigOut) { showOverlay('⏳ 出土后本回合不能移动', 1200); return; }
    if (unit.cfg.isNuke) { showOverlay('🚀 核弹自动飞行', 1000); return; }
    if (unit.moveStepsLeft <= 0) { showOverlay('⚠️ 本回合移动步数已用完', 1000); return; }
    if (selectedAction === 'move') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
    selectedAction = 'move'; highlightedCells = getAdjacentMoveCells(unit);
    if (!highlightedCells.length) { showOverlay('没有可移动的格子', 800); selectedAction = null; updateActionButtons(); drawGameCanvas(performance.now()); return; }
    document.getElementById('action-hint').textContent = '🚶 移动模式 - 剩余步数: ' + unit.moveStepsLeft;
    updateActionButtons(); drawGameCanvas(performance.now()); return;
  }

  if (action === 'attack') {
    if (unit.isUnderground) { showOverlay('⛏️ 地底状态不能攻击', 1000); return; }
    if (unit.waitingDigIn || unit.pendingDigOut) { showOverlay('⏳ 等待中', 1200); return; }
    if (unit.cfg.special === 'builder' || unit.cfg.special === 'rocket_builder' || unit.cfg.special === 'nuke_builder') {
      if (unit.cooldownRemaining > 0) { showOverlay('⏳ 冷却中，还需 ' + unit.cooldownRemaining + ' 回合', 1500); return; }
      if (unit.buildCountLeft <= 0) { showOverlay('⚠️ 次数已用完', 1000); return; }
      if (selectedAction === 'attack') { selectedAction = null; highlightedCells = []; highlightedBuildCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
      selectedAction = 'attack'; highlightedCells = []; highlightedBuildCells = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = unit.pos.row + dr, nc = unit.pos.col + dc;
        if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
        highlightedCells.push({ row: nr, col: nc });
        highlightedBuildCells.push({ row: nr, col: nc, canBuild: canBuildAt(unit, nr, nc) });
      }
      document.getElementById('action-hint').textContent = '🔧 建造模式 - 剩余次数: ' + unit.buildCountLeft;
      updateActionButtons(); drawGameCanvas(performance.now()); return;
    }
    if (unit.cfg.isMissile) {
      if (selectedAction === 'attack') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
      selectedAction = 'attack'; highlightedCells = [];
      for (var dr2 = -1; dr2 <= 1; dr2++) for (var dc2 = -1; dc2 <= 1; dc2++) {
        var nr2 = unit.pos.row + dr2, nc2 = unit.pos.col + dc2;
        if (nr2 >= 0 && nr2 < ROWS.length && nc2 >= 0 && nc2 < COLS) highlightedCells.push({ row: nr2, col: nc2 });
      }
      document.getElementById('action-hint').textContent = '💥 自爆模式 - 点击周围任意格确认';
      updateActionButtons(); drawGameCanvas(performance.now()); return;
    }
    if (unit.cfg.special === 'repair') {
      if (unit.attackCountLeft <= 0) { showOverlay('⚠️ 本回合次数已用完', 1000); return; }
      if (selectedAction === 'attack') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
      selectedAction = 'attack'; highlightedCells = mergeRepairCells(unit);
      document.getElementById('action-hint').textContent = '⚔️ 作战模式 - 剩余: ' + unit.attackCountLeft;
      updateActionButtons(); drawGameCanvas(performance.now()); return;
    }
    if (unit.cfg.special === 'artillery') {
      if (unit.cooldownRemaining > 0) { showOverlay('⏳ 冷却中', 1500); return; }
      if (unit.attackCountLeft <= 0) { showOverlay('⚠️ 次数已用完', 1000); return; }
      if (selectedAction === 'attack') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
      selectedAction = 'attack'; highlightedCells = getArtilleryRangeCells(unit);
      document.getElementById('action-hint').textContent = '💥 抛射模式 - 剩余: ' + unit.attackCountLeft;
      updateActionButtons(); drawGameCanvas(performance.now()); return;
    }
    if (unit.cooldownRemaining > 0) { showOverlay('⏳ 冷却中，还需 ' + unit.cooldownRemaining + ' 回合', 1500); return; }
    if (unit.attackCountLeft <= 0) { showOverlay('⚠️ 本回合攻击次数已用完', 1000); return; }
    if (selectedAction === 'attack') { selectedAction = null; highlightedCells = []; updateActionButtons(); drawGameCanvas(performance.now()); return; }
    selectedAction = 'attack'; highlightedCells = getAttackRangeCells(unit);
    if (!highlightedCells.length) { showOverlay('射程内无任何格子', 1000); selectedAction = null; updateActionButtons(); drawGameCanvas(performance.now()); return; }
    document.getElementById('action-hint').textContent = '💥 攻击模式 - 剩余: ' + unit.attackCountLeft;
    updateActionButtons(); drawGameCanvas(performance.now()); return;
  }

  if (action === 'special') {
    if (canDig(unit) || unit.cfg.special) { showSkillPopup(unit, document.getElementById('btn-special')); }
  }
}

function toggleAttackRange() {
  playClick();
  if (currentState !== 'GAME_PLAY' || inputLocked) return;
  var btn = document.getElementById('btn-range-toggle'); if (!btn) return;
  if (rangeDisplayUnit) { rangeDisplayUnit = null; btn.classList.remove('active'); drawGameCanvas(performance.now()); return; }
  if (!currentUnit || !currentUnit.alive) { showOverlay('请先选择己方单位', 1000); return; }
  var u = currentUnit;
  if (u.cfg.range <= 0 && u.cfg.special !== 'builder' && u.cfg.special !== 'rocket_builder' && u.cfg.special !== 'nuke_builder' && u.cfg.special !== 'repair') {
    showOverlay('该单位没有攻击范围', 1000); return;
  }
  rangeDisplayUnit = u; selectedAction = null; highlightedCells = []; highlightedBuildCells = [];
  btn.classList.add('active'); updateActionButtons(); drawGameCanvas(performance.now());
}

function mergeRepairCells(unit) {
  var out = [], seen = {};
  var atk = getAttackRangeCells(unit);
  for (var i = 0; i < atk.length; i++) { var k = atk[i].row + ',' + atk[i].col; if (!seen[k]) { seen[k] = true; out.push(atk[i]); } }
  var heal = getHealRangeCells(unit);
  for (var j = 0; j < heal.length; j++) { var k2 = heal[j].row + ',' + heal[j].col; if (!seen[k2]) { seen[k2] = true; out.push(heal[j]); } }
  return out;
}

function handleMapClick(row, col) {
  if (currentState !== 'GAME_PLAY' || inputLocked) return;
  if (rangeDisplayUnit) {
    var cu = redUnits.concat(blueUnits).find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
    if (cu) { rangeDisplayUnit = cu; updateGameUI(); drawGameCanvas(performance.now()); return; }
    if (isHQCell(row, col)) return;
    rangeDisplayUnit = null; drawGameCanvas(performance.now()); return;
  }
  if ((gameMode === 'pve' && currentTeam === 'blue') || trustEnabled[currentTeam]) { showOverlay('🤖 AI托管中', 1000); return; }

  var unit = currentUnit;
  if (unit && unit.isUnderground && unit.alive) {
    var isAdj = Math.abs(unit.pos.row - row) <= 1 && Math.abs(unit.pos.col - col) <= 1 && (unit.pos.row !== row || unit.pos.col !== col);
    if (isAdj) { executeUndergroundMove(unit, row, col); return; }
    showOverlay('⛏️ 地底只能移动到相邻格', 800); return;
  }
  if (unit && unit.waitingDigIn) { showOverlay('⏳ 等待钻地中', 1000); return; }
  if (unit && unit.pendingDigOut) { showOverlay('⏳ 出土后本回合不能操作', 1000); return; }

  var clickedUnit = getCurrentUnits().find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col && !u.isUnderground; });
  if (clickedUnit && !clickedUnit.cfg.isNuke) {
    if (isUnitExhausted(clickedUnit) && clickedUnit !== currentUnit) { showOverlay('⚠️ 该单位本回合操作已用完', 800); return; }
    setCurrentUnit(clickedUnit);
    showOverlay('✅ 切换到：' + clickedUnit.cfg.name, 1000);
    return;
  }
  if (!unit || !unit.alive) { showOverlay('⚠️ 单位已阵亡', 1000); return; }
  if (unit.cfg.isNuke) { showOverlay('🚀 核弹自动飞行中', 800); return; }

  var isSuper = unit.cfg.weight === 'super_heavy';
  var enemyUnit = getEnemyUnits().find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
  var allyUnit = getCurrentUnits().find(function (u) { return u !== unit && u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
  if ((enemyUnit || allyUnit) && selectedAction !== 'attack' && !(isSuper && selectedAction === 'move')) { return; }
  if (isUnitExhausted(unit) && selectedAction === null) { showOverlay('⚠️ 该单位本回合操作已用完', 800); return; }

  if (selectedAction === 'move') {
    if (!highlightedCells.some(function (h) { return h.row === row && h.col === col; })) { showOverlay('❌ 无法移动到该位置', 800); return; }
    executeMove(unit, row, col); return;
  }
  if (selectedAction === 'attack') {
    if (unit.cfg.special === 'builder' || unit.cfg.special === 'rocket_builder' || unit.cfg.special === 'nuke_builder') {
      var bc = highlightedBuildCells.find(function (h) { return h.row === row && h.col === col; });
      if (!bc || !bc.canBuild) { showOverlay('❌ 无效建造位置', 800); return; }
      executeBuild(unit, row, col); return;
    }
    if (unit.cfg.isMissile) {
      if (!highlightedCells.some(function (h) { return h.row === row && h.col === col; })) { showOverlay('❌ 无效自爆位置', 800); return; }
      executeSelfDestruct(unit, row, col); return;
    }
    if (unit.cfg.special === 'repair') {
      var allyTarget = getCurrentUnits().find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
      var allyHQ = (redHQ && redHQ.pos.row === row && redHQ.pos.col === col && unit.team === 'red') || (blueHQ && blueHQ.pos.row === row && blueHQ.pos.col === col && unit.team === 'blue');
      if (allyTarget || allyHQ) { executeHeal(unit, row, col, allyTarget); return; }
    }
    if (unit.cfg.special === 'artillery') {
      if (!highlightedCells.some(function (h) { return h.row === row && h.col === col; })) { showOverlay('❌ 超出抛射射程', 800); return; }
      executeArtillery(unit, row, col); return;
    }
    var cell = highlightedCells.find(function (h) { return h.row === row && h.col === col; });
    if (!cell) { showOverlay('❌ 无效的攻击目标', 800); return; }
    if (!cell.los) { showOverlay('🚫 视线被阻挡', 800); return; }
    var eu2 = getEnemyUnits().find(function (u) { return u.alive && u.pos && u.pos.row === row && u.pos.col === col; });
    var ehq2 = getEnemyHQ();
    var target2 = null;
    if (eu2) target2 = { type: 'unit', row: row, col: col, unit: eu2 };
    else if (ehq2 && ehq2.pos.row === row && ehq2.pos.col === col && ehq2.hp > 0) target2 = { type: 'hq', row: row, col: col, hq: ehq2 };
    else if (isTerrainAttackable(row, col)) target2 = { type: 'terrain', row: row, col: col };
    if (target2) executeAttack(unit, target2);
    else performEmptyAttack(unit, row, col);
    return;
  }
  showOverlay('请先选择操作', 800);
}

function setCurrentUnit(unit) {
  if (!unit || unit.team !== currentTeam) return;
  currentUnit = unit;
  selectedAction = null; highlightedCells = []; highlightedBuildCells = [];
  updateGameUI(); drawGameCanvas(performance.now());
}

/* ---------- 技能弹框 ---------- */
var SKILL_POPUP = document.getElementById('skill-popup');
function hideSkillPopup() { if (SKILL_POPUP) { SKILL_POPUP.classList.remove('show'); SKILL_POPUP._unit = null; } }
function showSkillPopup(unit, buttonEl) {
  if (!SKILL_POPUP) return;
  var cfg = unit.cfg;
  var title = '', desc = '', yesLabel = '✅ 确认';
  if (canDig(unit)) {
    if (unit.isUnderground) { title = '⬆️ 出土'; desc = '从地底钻出地面。<br>出土当回合不能移动或攻击。'; yesLabel = '⬆️ 出土'; }
    else if (unit.waitingDigIn) { title = '⏳ 钻地中'; desc = '下回合将自动钻入地底。'; yesLabel = '⏳ 钻地中'; }
    else if (unit.pendingDigOut) { title = '⏳ 出土中'; desc = '本回合不能行动。'; yesLabel = '⏳ 出土中'; }
    else { title = '⛏️ 钻地'; desc = '花一回合钻入地底，移速 4。<br>地底无敌，出土时击退目标格敌人。'; yesLabel = '⛏️ 钻地'; }
  } else { title = cfg.name; desc = getSpecialDesc(cfg.special) || ''; }
  document.getElementById('skill-popup-title').textContent = title;
  document.getElementById('skill-popup-desc').innerHTML = desc;
  document.getElementById('skill-popup-yes').textContent = yesLabel;
  var rect = buttonEl.getBoundingClientRect();
  var popupW = 220;
  var left = rect.left + rect.width / 2 - popupW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
  SKILL_POPUP.style.left = left + 'px';
  SKILL_POPUP.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  SKILL_POPUP.style.top = 'auto';
  SKILL_POPUP.classList.add('show');
  SKILL_POPUP._unit = unit;
}
if (document.getElementById('skill-popup-yes')) {
  document.getElementById('skill-popup-yes').onclick = function () {
    var unit = SKILL_POPUP._unit; hideSkillPopup();
    if (!unit) return;
    if (canDig(unit)) {
      if (unit.isUnderground) executeDigOut(unit, true);
      else if (!unit.waitingDigIn && !unit.pendingDigOut && !unit.digJustUsedThisTurn) executeDigIn(unit);
    }
  };
  document.getElementById('skill-popup-no').onclick = function () { hideSkillPopup(); };
}
document.addEventListener('pointerdown', function (e) {
  if (!SKILL_POPUP.classList.contains('show')) return;
  if (SKILL_POPUP.contains(e.target)) return;
  if (e.target.id === 'btn-special') return;
  hideSkillPopup();
}, true);

/* ---------- UI 更新 ---------- */
function updateGameUI() {
  if (redHQ) document.getElementById('red-hp').textContent = fmtHp(redHQ.hp);
  if (blueHQ) document.getElementById('blue-hp').textContent = fmtHp(blueHQ.hp);
  document.getElementById('full-turn-display').textContent = '回合:' + totalTurns;
  if (currentUnit && currentUnit.alive) {
    document.getElementById('current-unit-info').textContent = '当前:' + currentUnit.cfg.name + ' HP:' + fmtHp(currentUnit.hp);
    document.getElementById('move-steps-display').textContent = '🚶步数:' + currentUnit.moveStepsLeft;
    var ba = document.getElementById('btn-attack');
    if (ba) {
      if (currentUnit.cfg.special === 'builder') ba.textContent = '🔧建造';
      else if (currentUnit.cfg.special === 'rocket_builder') ba.textContent = '🚀发射';
      else if (currentUnit.cfg.special === 'nuke_builder') ba.textContent = '☢️发射';
      else if (currentUnit.cfg.isMissile) ba.textContent = '💥自爆';
      else if (currentUnit.cfg.special === 'repair') ba.textContent = '⚔️作战';
      else if (currentUnit.cfg.special === 'artillery') ba.textContent = '💥抛射';
      else ba.textContent = '💥攻击';
    }
  } else {
    document.getElementById('current-unit-info').textContent = '';
    document.getElementById('move-steps-display').textContent = '🚶步数:0';
  }
  updateActionButtons();
  var turnEl = document.getElementById('turn-indicator');
  if (turnEl) { turnEl.textContent = currentTeam === 'red' ? '🔴 红方回合' : '🔵 蓝方回合'; turnEl.className = 'turn-indicator ' + (currentTeam === 'red' ? 'red-turn' : 'blue-turn'); }
  var bar = document.getElementById('action-bar');
  if (bar) { bar.classList.remove('team-red', 'team-blue'); bar.classList.add(currentTeam === 'red' ? 'team-red' : 'team-blue'); }
  if (campaignRunning) updateCampaignTopbar();
}
function _setBadge(badgeEl, text, show) {
  if (!badgeEl) return;
  if (!show || text === null || text === undefined) { badgeEl.classList.add('hidden'); badgeEl.textContent = ''; }
  else { badgeEl.classList.remove('hidden'); badgeEl.textContent = text; }
}
function _setBtnState(btnEl, state, labelText) {
  if (!btnEl) return;
  btnEl.classList.remove('btn-state-dim', 'btn-state-cool');
  var badge = btnEl.querySelector('.btn-badge');
  var baseText = labelText || (badge ? btnEl.textContent.replace(badge.textContent, '').trim() : btnEl.textContent);
  if (badge) { Array.from(btnEl.childNodes).forEach(function (n) { if (n !== badge) btnEl.removeChild(n); }); btnEl.insertBefore(document.createTextNode(baseText), badge); }
  else btnEl.textContent = baseText;
  if (state === 'dim') btnEl.classList.add('btn-state-dim');
  else if (state === 'cool') btnEl.classList.add('btn-state-cool');
}
function updateActionButtons() {
  var u = currentUnit; if (!u) return;
  var btnMove = document.getElementById('btn-move');
  var btnAttack = document.getElementById('btn-attack');
  var btnSpecial = document.getElementById('btn-special');
  var btnEndTurn = document.getElementById('btn-end-turn');
  var badgeMove = document.getElementById('badge-move');
  var badgeAttack = document.getElementById('badge-attack');
  if (!btnMove || !btnAttack || !btnEndTurn) return;
  var isAITurn = (gameMode === 'pve' && currentTeam === 'blue') || (gameMode === 'campaign' && currentTeam === 'red') || trustEnabled[currentTeam];
  if (inputLocked || isAITurn) {
    btnMove.disabled = true; btnAttack.disabled = true;
    if (btnSpecial) btnSpecial.disabled = true;
    btnEndTurn.disabled = true;
    _setBadge(badgeMove, '', false); _setBadge(badgeAttack, '', false);
    return;
  }
  btnEndTurn.classList.remove('btn-state-dim'); btnEndTurn.disabled = false;

  var canMove = u.alive && u.moveStepsLeft > 0 && !u.waitingJump && !u.waitingDigIn && !u.pendingDigOut;
  btnMove.disabled = false;
  if (u.alive) _setBadge(badgeMove, '' + u.moveStepsLeft, u.moveStepsLeft > 0);
  _setBtnState(btnMove, canMove ? 'normal' : 'dim', '🚶移动');

  var actionLabel = '💥攻击', canAct = false, countShow = 0, isCoolingDown = false;
  if (u.isUnderground) { _setBtnState(btnAttack, 'dim', '💥攻击'); _setBadge(badgeAttack, '', false); }
  else if (u.cfg.special === 'builder' || u.cfg.special === 'rocket_builder' || u.cfg.special === 'nuke_builder') {
    actionLabel = u.cfg.special === 'builder' ? '🔧建造' : (u.cfg.special === 'rocket_builder' ? '🚀发射' : '☢️发射');
    canAct = u.buildCountLeft > 0 && u.cooldownRemaining <= 0; countShow = u.buildCountLeft; isCoolingDown = u.cooldownRemaining > 0;
    btnAttack.disabled = false;
    if (isCoolingDown) { _setBtnState(btnAttack, 'cool', '⏳冷却' + u.cooldownRemaining); _setBadge(badgeAttack, '', false); }
    else { _setBtnState(btnAttack, canAct ? 'normal' : 'dim', actionLabel); _setBadge(badgeAttack, '' + countShow, u.alive && countShow > 0); }
  } else if (u.cfg.isMissile) {
    actionLabel = '💥自爆'; canAct = u.attackCountLeft > 0; countShow = u.attackCountLeft;
    btnAttack.disabled = false; _setBtnState(btnAttack, canAct ? 'normal' : 'dim', actionLabel);
    _setBadge(badgeAttack, '' + countShow, u.alive && countShow > 0);
  } else if (u.cfg.special === 'repair') {
    actionLabel = '⚔️作战'; canAct = u.attackCountLeft > 0; countShow = u.attackCountLeft;
    btnAttack.disabled = false; _setBtnState(btnAttack, canAct ? 'normal' : 'dim', actionLabel);
    _setBadge(badgeAttack, '' + countShow, u.alive && countShow > 0);
  } else if (u.cfg.special === 'artillery') {
    actionLabel = '💥抛射'; canAct = u.attackCountLeft > 0 && u.cooldownRemaining <= 0; countShow = u.attackCountLeft; isCoolingDown = u.cooldownRemaining > 0;
    btnAttack.disabled = false;
    if (isCoolingDown) { _setBtnState(btnAttack, 'cool', '⏳冷却' + u.cooldownRemaining); _setBadge(badgeAttack, '', false); }
    else { _setBtnState(btnAttack, canAct ? 'normal' : 'dim', actionLabel); _setBadge(badgeAttack, '' + countShow, u.alive && countShow > 0); }
  } else {
    canAct = u.attackCountLeft > 0 && u.cooldownRemaining <= 0; countShow = u.attackCountLeft; isCoolingDown = u.cooldownRemaining > 0;
    btnAttack.disabled = false;
    if (isCoolingDown) { _setBtnState(btnAttack, 'cool', '⏳冷却' + u.cooldownRemaining); _setBadge(badgeAttack, '', false); }
    else { _setBtnState(btnAttack, canAct ? 'normal' : 'dim', actionLabel); _setBadge(badgeAttack, '' + countShow, u.alive && countShow > 0); }
  }

  var hasSkill = !!u.cfg.special;
  var skillUsable = true;
  if (canDig(u)) {
    if (u.isUnderground) skillUsable = true;
    else if (u.waitingDigIn || u.pendingDigOut) skillUsable = true;
    else if (u.digJustUsedThisTurn) skillUsable = false;
  }
  if (btnSpecial) {
    btnSpecial.disabled = false;
    if (!hasSkill || !skillUsable) _setBtnState(btnSpecial, 'dim', '⚡技能');
    else _setBtnState(btnSpecial, 'normal', '⚡技能');
  }
}

/* ---------- 键盘快捷键 ---------- */
window.addEventListener('keydown', function (e) {
  var tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (currentState === 'GAME_PLAY' && e.key === 'Escape' && selectedAction) {
    selectedAction = null; highlightedCells = []; highlightedBuildCells = [];
    updateActionButtons(); drawGameCanvas(performance.now());
  }
});