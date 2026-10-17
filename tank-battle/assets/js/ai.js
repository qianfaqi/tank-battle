/* ========== AI 智能决策 + Watchdog 防卡死 ========== */
var AI_TURN_BUDGET_MS = 3000;
var AI_UNIT_BUDGET_MS = 500;
var AI_TURN_HARD_LIMIT = 30000; // 【修复】30s 硬超时

/* 【修复】AI Watchdog：30秒后强制结束 AI 回合，防止卡死 */
function startAIWatchdog() {
  if (aiWatchdogTimer) clearTimeout(aiWatchdogTimer);
  aiWatchdogTimer = setTimeout(function () {
    if (aiRunning) {
      console.warn('[AI] Watchdog 触发，强制结束 AI 回合');
      aiRunning = false;
      try { endTurn(); } catch (e) { console.error(e); }
    }
  }, AI_TURN_HARD_LIMIT);
}
function stopAIWatchdog() {
  if (aiWatchdogTimer) { clearTimeout(aiWatchdogTimer); aiWatchdogTimer = null; }
}

/* ---- 目标评估 ---- */
function aiUnitValue(u) {
  var v = u.hp + u.cfg.attack * 3;
  if (u.cfg.special === 'builder' || u.cfg.special === 'rocket_builder' || u.cfg.special === 'nuke_builder') v += 8;
  if (u.cfg.isNukeLauncher) v += 10;
  if (u.cfg.isBaseTank) v += 200;
  return v;
}
function aiUrgencyScore(unit) {
  var danger = 0;
  var enemyArr = unit.team === 'red' ? blueUnits : redUnits;
  for (var i = 0; i < enemyArr.length; i++) {
    var eu = enemyArr[i]; if (!eu.alive || !eu.pos) continue;
    var d = Math.max(Math.abs(unit.pos.row - eu.pos.row), Math.abs(unit.pos.col - eu.pos.col));
    if (d <= eu.cfg.range) danger += eu.cfg.attack;
  }
  var canFight = (unit.attackCountLeft > 0 && unit.cooldownRemaining <= 0) ? 1 : 0;
  var hpLow = unit.maxHp > 0 ? (unit.maxHp - unit.hp) / unit.maxHp : 0;
  return danger * 2 + canFight * 3 + hpLow * 2;
}
function aiEffectiveAttack(unit) {
  var p = unit.cfg.attack;
  if (unit.cfg.special === 'river_walker' && unit.isInRiver) p += 1;
  return p;
}

/* ---- 攻击目标 ---- */
function aiGetAttackTargets(unit) {
  var out = [];
  var enemies = getEnemyUnits().filter(function (u) { return u.alive && u.pos; });
  var cells;
  if (unit.cfg.special === 'artillery') cells = getArtilleryRangeCells(unit);
  else cells = getAttackRangeCells(unit);
  var set = {};
  for (var i = 0; i < cells.length; i++) if (cells[i].los) set[cells[i].row + ',' + cells[i].col] = true;
  for (var ei = 0; ei < enemies.length; ei++) {
    var eu = enemies[ei];
    if (set[eu.pos.row + ',' + eu.pos.col]) out.push({ type: 'unit', row: eu.pos.row, col: eu.pos.col, unit: eu });
  }
  var enemyDefs = defenseBuildings.filter(function (b) { return b.alive && b.team !== unit.team; });
  for (var di = 0; di < enemyDefs.length; di++) {
    var b = enemyDefs[di];
    if (set[b.row + ',' + b.col]) out.push({ type: 'defense', row: b.row, col: b.col, defense: b });
  }
  var hq = getEnemyHQ();
  if (hq && hq.hp > 0 && set[hq.pos.row + ',' + hq.pos.col]) out.push({ type: 'hq', row: hq.pos.row, col: hq.pos.col, hq: hq });
  return out;
}

function aiSelectBestTarget(unit, targets) {
  var atk = aiEffectiveAttack(unit);
  var best = null, bestS = -Infinity;
  var hqTarget = targets.find(function (t) { return t.type === 'hq'; });
  var enemyBaseTank = targets.find(function (t) { return t.type === 'unit' && t.unit && t.unit.cfg && t.unit.cfg.isBaseTank; });
  var oneShotKill = null, oneShotScore = -Infinity;
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i]; if (t.type !== 'unit') continue;
    var e = t.unit; if (e.isUnderground) continue;
    var shieldLeft = e.shield || 0;
    var lethal = atk >= (e.hp + shieldLeft);
    if (!lethal) continue;
    var threatScore = e.cfg.attack * 20 + (e.cfg.range || 0) * 5 + 50;
    if (threatScore > oneShotScore) { oneShotScore = threatScore; oneShotKill = t; }
  }
  if (enemyBaseTank) return enemyBaseTank;
  if (hqTarget) {
    if (atk >= hqTarget.hq.hp) return hqTarget;
    if (!oneShotKill || oneShotScore < 300) return hqTarget;
  }
  if (oneShotKill) return oneShotKill;
  if (aiFocusTarget && aiFocusTarget.alive && aiFocusTarget.pos) {
    var focusHit = targets.find(function (t) { return t.type === 'unit' && t.unit === aiFocusTarget; });
    if (focusHit) return focusHit;
  }
  for (var ti = 0; ti < targets.length; ti++) {
    var t2 = targets[ti]; var s;
    if (t2.type === 'hq') s = 200;
    else if (t2.type === 'defense') s = 30;
    else if (t2.type === 'terrain') s = 8;
    else {
      var e2 = t2.unit;
      if (e2.isUnderground) s = -1000;
      else {
        var shieldL = e2.shield || 0;
        var lethal2 = atk >= (e2.hp + shieldL);
        var overkill = Math.max(0, atk - (e2.hp + shieldL));
        s = 25 + e2.cfg.attack * 14 + (e2.maxHp - e2.hp) * 3 - overkill * 8;
        if (lethal2) s += 220;
        if (e2.cfg.isRobot) s -= 25;
        if (e2.cfg.special === 'builder' || e2.cfg.special === 'rocket_builder' || e2.cfg.special === 'nuke_builder' || e2.cfg.special === 'repair') s += 40;
        if (e2.burnTurns > 0 && !lethal2) s -= 30;
      }
    }
    if (s > bestS) { bestS = s; best = t2; }
  }
  return best;
}

/* ---- 移动评估 ---- */
function evaluatePosition(row, col, unit) {
  var score = 0;
  var ehq = getEnemyHQ();
  var myHQ = unit.team === 'red' ? redHQ : blueHQ;
  if (unit.cfg.special === 'repair') {
    var bestAlly = null, bestAllyVal = 0;
    var myUnits = getCurrentUnits();
    for (var i = 0; i < myUnits.length; i++) {
      var a = myUnits[i]; if (a === unit || !a.alive || !a.pos) continue;
      var v = aiUnitValue(a); if (v > bestAllyVal) { bestAllyVal = v; bestAlly = a; }
    }
    if (bestAlly) {
      var d = Math.abs(row - bestAlly.pos.row) + Math.abs(col - bestAlly.pos.col);
      score -= d * 3; if (d >= 1 && d <= 2) score += 15;
    }
    if (myHQ) score += Math.max(0, 8 - Math.abs(row - myHQ.pos.row) - Math.abs(col - myHQ.pos.col)) * 1.5;
    var danger = 0;
    for (var ei = 0; ei < getEnemyUnits().length; ei++) {
      var eu = getEnemyUnits()[ei]; if (!eu.alive || !eu.pos) continue;
      var dd = Math.max(Math.abs(row - eu.pos.row), Math.abs(col - eu.pos.col));
      if (dd <= eu.cfg.range && eu.attackCountLeft > 0) danger += eu.cfg.attack;
    }
    score -= danger * 8;
    if (getRadiationDepthAt(row, col) > 0) score -= 25;
    return score;
  }
  if (ehq) score -= (Math.abs(row - ehq.pos.row) + Math.abs(col - ehq.pos.col)) * 3.5;
  if (myHQ) score += (Math.abs(row - myHQ.pos.row) + Math.abs(col - myHQ.pos.col)) * 0.6;
  var enemyBaseTank = (unit.team === 'red' ? blueUnits : redUnits).find(function (u) { return u.alive && u.pos && u.cfg.isBaseTank; });
  if (enemyBaseTank) score -= (Math.abs(row - enemyBaseTank.pos.row) + Math.abs(col - enemyBaseTank.pos.col)) * 4;
  if (unit.cfg.special === 'river_walker' && isInRiverRange(row, col)) score += 8;
  var danger2 = 0;
  for (var ei2 = 0; ei2 < getEnemyUnits().length; ei2++) {
    var eu2 = getEnemyUnits()[ei2]; if (!eu2.alive || !eu2.pos) continue;
    var d2 = Math.max(Math.abs(row - eu2.pos.row), Math.abs(col - eu2.pos.col));
    if (d2 <= eu2.cfg.range && eu2.attackCountLeft > 0) danger2 += eu2.cfg.attack;
  }
  score -= danger2 * 5;
  if (getRadiationDepthAt(row, col) > 0) score -= 15;
  return score;
}

/* ---- AI 主行动 ---- */
async function aiUnitActionSmart(unit) {
  if (!unit.alive || unit.waitingJump) return;
  if (unit.waitingDigIn || unit.pendingDigOut) return;

  // 建造类
  if ((unit.cfg.special === 'builder' || unit.cfg.special === 'rocket_builder' || unit.cfg.special === 'nuke_builder') && unit.buildCountLeft > 0 && unit.cooldownRemaining <= 0) {
    var guard = 0, pos = aiSelectBuildPosition(unit);
    while (pos && unit.buildCountLeft > 0 && guard++ < 8) {
      await executeBuild(unit, pos.row, pos.col);
      await sleep(120);
      pos = aiSelectBuildPosition(unit);
    }
  }

  // 导弹自爆
  if (unit.cfg.isMissile && unit.attackCountLeft > 0) {
    var bestT = aiSelectMissileTarget(unit);
    if (bestT) { executeSelfDestruct(unit, bestT.row, bestT.col); await sleep(300); return; }
    var visited = {}; visited[unit.pos.row + ',' + unit.pos.col] = true;
    var g2 = 0;
    while (g2++ < 6) {
      if (!unit.alive || unit.moveStepsLeft <= 0) break;
      if (currentState !== 'GAME_PLAY') return;
      bestT = aiSelectMissileTarget(unit);
      if (bestT) { executeSelfDestruct(unit, bestT.row, bestT.col); await sleep(300); return; }
      var mv = aiSelectMissileMove(unit, visited); if (!mv) break;
      visited[mv.row + ',' + mv.col] = true;
      await executeMove(unit, mv.row, mv.col);
      await sleep(80);
      if (unit.waitingJump || !unit.alive) break;
    }
    bestT = aiSelectMissileTarget(unit);
    if (bestT) { executeSelfDestruct(unit, bestT.row, bestT.col); await sleep(300); }
    return;
  }

  // 钻地
  if (canDig(unit)) { await aiDiggerAction(unit); return; }

  // 维修
  if (unit.cfg.special === 'repair') {
    await aiRepairAction(unit);
    if (unit.alive && !unit.waitingJump && unit.moveStepsLeft > 0) {
      var vh = {}; vh[unit.pos.row + ',' + unit.pos.col] = true;
      var g3 = 0;
      while (g3++ < 10) {
        if (currentState !== 'GAME_PLAY' || !unit.alive) return;
        var m2 = await aiSelectBestMove(unit, vh); if (!m2) break;
        vh[m2.row + ',' + m2.col] = true;
        await executeMove(unit, m2.row, m2.col);
        await sleep(80);
        if (unit.waitingJump || !unit.alive) break;
        if (unit.attackCountLeft > 0) await aiRepairAction(unit);
      }
    }
    return;
  }

  // 巨炮
  if (unit.cfg.special === 'artillery') {
    if (unit.attackCountLeft > 0 && unit.cooldownRemaining <= 0) {
      var cells = getArtilleryRangeCells(unit);
      var bestCell = null, bestScore = -Infinity;
      var ehq2 = getEnemyHQ();
      var eb = (unit.team === 'red' ? blueUnits : redUnits).find(function (u) { return u.alive && u.pos && u.cfg.isBaseTank; });
      for (var ci = 0; ci < cells.length; ci++) {
        var c2 = cells[ci], s2 = 0;
        if (eb && Math.max(Math.abs(c2.row - eb.pos.row), Math.abs(c2.col - eb.pos.col)) <= (unit.cfg.artilleryRadius || 1)) s2 += 500;
        if (ehq2 && Math.max(Math.abs(c2.row - ehq2.pos.row), Math.abs(c2.col - ehq2.pos.col)) <= (unit.cfg.artilleryRadius || 1)) {
          s2 += 200; if (unit.cfg.attack >= ehq2.hp) s2 += 500;
        }
        var enemyArr = getEnemyUnits();
        for (var ei3 = 0; ei3 < enemyArr.length; ei3++) {
          var eu3 = enemyArr[ei3]; if (!eu3.alive || !eu3.pos) continue;
          var d3 = Math.max(Math.abs(c2.row - eu3.pos.row), Math.abs(c2.col - eu3.pos.col));
          if (d3 <= (unit.cfg.artilleryRadius || 1)) s2 += 30 + eu3.cfg.attack * 10;
        }
        if (s2 > bestScore) { bestScore = s2; bestCell = c2; }
      }
      if (bestCell && bestScore > 0) { executeArtillery(unit, bestCell.row, bestCell.col); await sleep(1100); }
    }
    var va = {}; va[unit.pos.row + ',' + unit.pos.col] = true;
    var g4 = 0;
    while (g4++ < 8 && unit.moveStepsLeft > 0 && unit.alive) {
      if (currentState !== 'GAME_PLAY') return;
      var mv2 = await aiSelectBestMove(unit, va); if (!mv2) break;
      va[mv2.row + ',' + mv2.col] = true;
      await executeMove(unit, mv2.row, mv2.col);
      await sleep(80);
      if (unit.waitingJump || !unit.alive) break;
    }
    return;
  }

  // 通用逻辑
  var visited2 = {}; visited2[unit.pos.row + ',' + unit.pos.col] = true;
  var guard2 = 0, MAX_GUARD = 40;
  while (guard2++ < MAX_GUARD) {
    if (currentState !== 'GAME_PLAY' || !unit.alive) return;
    if (unit.waitingJump || unit.waitingDigIn || unit.pendingDigOut) break;
    if (unit.moveStepsLeft <= 0 && unit.attackCountLeft <= 0) break;
    var acted = false;
    var best = await aiSearchMoveDeep(unit, 200);
    if (best && best.type === 'attack') {
      executeAttack(unit, best.target); await sleep(200); acted = true;
    } else if (best && best.type === 'move') {
      if (!visited2[best.row + ',' + best.col]) {
        visited2[best.row + ',' + best.col] = true;
        await executeMove(unit, best.row, best.col);
        await sleep(80); acted = true;
        if (unit.waitingJump || !unit.alive) break;
      }
    }
    if (!acted && unit.moveStepsLeft > 0 && !unit.waitingJump && !unit.isUnderground) {
      var fallback = await aiSelectBestMove(unit, visited2);
      if (fallback) {
        visited2[fallback.row + ',' + fallback.col] = true;
        await executeMove(unit, fallback.row, fallback.col);
        await sleep(80); acted = true;
        if (unit.waitingJump || !unit.alive) break;
      }
    }
    if (!acted) break;
  }
  if (unit.alive && !unit.waitingJump && unit.attackCountLeft > 0 && unit.cooldownRemaining <= 0 && unit.cfg.range > 0 &&
      !unit.cfg.isMissile && unit.cfg.special !== 'builder' && unit.cfg.special !== 'rocket_builder' &&
      unit.cfg.special !== 'nuke_builder' && unit.cfg.special !== 'repair' && unit.cfg.special !== 'artillery') {
    var targets2 = aiGetAttackTargets(unit);
    if (targets2.length) {
      var t3 = aiSelectBestTarget(unit, targets2);
      if (t3) { executeAttack(unit, t3); await sleep(200); }
    }
  }
}

/* ---- AI 回合入口（含 Watchdog） ---- */
async function aiTakeTurnForTrust() {
  if (aiRunning) return;
  if (currentState !== 'GAME_PLAY' || inputLocked || isEndingTurn) return;
  if (!aiIsAISide(currentTeam)) return;
  aiRunning = true;
  startAIWatchdog(); // 【修复】启动看门狗
  devLog('[AI] ' + currentTeam + ' 方回合开始');
  try {
    var snapshot = getCurrentUnits().slice();
    snapshot.sort(function (a, b) { return aiUrgencyScore(b) - aiUrgencyScore(a); });
    for (var i = 0; i < snapshot.length; i++) {
      var unit = snapshot[i];
      if (currentState !== 'GAME_PLAY' || inputLocked) return;
      if (!aiIsAISide(currentTeam)) return;
      if (!unit.alive || unit.cfg.isNuke) continue;
      if (unit.moveStepsLeft <= 0 && unit.attackCountLeft <= 0 && unit.buildCountLeft <= 0 && !canDig(unit)) continue;
      currentUnit = unit;
      updateGameUI();
      unit._aiThinking = true;
      drawGameCanvas(performance.now());
      try { await aiUnitActionSmart(unit); }
      catch (e) { devLog('[AI错误] ' + (e && e.message ? e.message : e), 'err'); }
      finally { unit._aiThinking = false; }
      await sleep(60);
    }
    if (currentState === 'GAME_PLAY' && !inputLocked) endTurn();
  } finally {
    aiRunning = false;
    stopAIWatchdog(); // 【修复】停止看门狗
  }
}

function aiIsAISide(team) {
  return trustEnabled[team] || (gameMode === 'pve' && team === 'blue') || (gameMode === 'campaign' && team === 'red');
}

/* ---- 战役红方 AI ---- */
async function runRedAI() {
  if (aiRunning) return;
  aiRunning = true;
  startAIWatchdog();
  aiFocusTarget = null;
  try {
    for (var i = 0; i < redUnits.length; i++) { var u = redUnits[i]; if (u.alive && u.pos) u.resetTurn(); }
    var snapshot = redUnits.slice().filter(function (u) { return u.alive; });
    for (var j = 0; j < snapshot.length; j++) {
      var unit = snapshot[j];
      if (currentState !== 'GAME_PLAY') break;
      if (!unit.alive || unit.waitingJump || unit.cfg.isNuke) continue;
      unit._aiThinking = true; drawGameCanvas(performance.now());
      try { await aiUnitActionSmart(unit); }
      catch (e) { devLog('[红方AI错误] ' + (e && e.message ? e.message : e), 'err'); }
      finally { unit._aiThinking = false; }
      await sleep(60);
    }
  } finally { aiRunning = false; stopAIWatchdog(); }
}

/* ---- 防御建筑 ---- */
async function runDefenseBuildings() {
  for (var i = 0; i < defenseBuildings.length; i++) {
    var b = defenseBuildings[i]; if (!b.alive) continue;
    if (b.team !== 'red') continue;
    var shots = b.cfg.shotsPerTurn || 1;
    for (var s = 0; s < shots; s++) {
      if (currentState !== 'GAME_PLAY') return;
      var target = selectDefenseTarget(b); if (!target) break;
      try { await defenseFireOnce(b, target); } catch (e) {}
      if (currentState !== 'GAME_PLAY') return;
    }
  }
}
async function runBlueDefenseBuildings() {
  for (var i = 0; i < defenseBuildings.length; i++) {
    var b = defenseBuildings[i]; if (!b.alive) continue;
    if (b.team !== 'blue') continue;
    var shots = b.cfg.shotsPerTurn || 1;
    for (var s = 0; s < shots; s++) {
      if (currentState !== 'GAME_PLAY') return;
      var inRange = [];
      for (var j = 0; j < redUnits.length; j++) {
        var u = redUnits[j]; if (!u.alive || !u.pos) continue;
        var d = Math.max(Math.abs(u.pos.row - b.row), Math.abs(u.pos.col - b.col));
        if (d > b.cfg.range) continue;
        inRange.push({ unit: u, dist: d });
      }
      if (!inRange.length) break;
      inRange.sort(function (a, b2) { return a.dist - b2.dist; });
      await blueDefenseFireOnce(b, inRange[0].unit);
    }
  }
}
function selectDefenseTarget(b) {
  var inRange = [];
  for (var i = 0; i < blueUnits.length; i++) {
    var u = blueUnits[i]; if (!u.alive || !u.pos) continue;
    var d = Math.max(Math.abs(u.pos.row - b.row), Math.abs(u.pos.col - b.col));
    if (d > b.cfg.range) continue;
    inRange.push({ unit: u, dist: d });
  }
  if (!inRange.length) return null;
  inRange.sort(function (a, b2) { return a.dist - b2.dist || a.unit.hp - b2.unit.hp; });
  return inRange[0].unit;
}
function defenseFireOnce(building, target) {
  return new Promise(function (resolve) {
    if (!building || !building.alive || !target || !target.alive || !target.pos) { resolve(); return; }
    var tdr = target.pos.row - building.row, tdc = target.pos.col - building.col;
    var tAng = Math.atan2(tdr, tdc) * 180 / Math.PI;
    tAng = Math.round(tAng / 45) * 45; if (tAng < 0) tAng += 360;
    building.turretDir = tAng;
    if (!building.anim) building.anim = { turretDir: tAng, flash: 0, recoil: 0 };
    building.anim.flash = 1; building.anim.recoil = 1;
    var toR = target.pos.row, toC = target.pos.col;
    projectiles.push({ type: 'bullet', style: building.cfg.turretStyle, fromR: building.row, fromC: building.col, toR: toR, toC: toC, team: building.team, startTime: performance.now(), duration: 180 });
    setTimeout(function () {
      if (currentState !== 'GAME_PLAY') { resolve(); return; }
      if (!target.alive || !target.pos) { resolve(); return; }
      var dmg = building.cfg.attack;
      target.hp -= dmg;
      if (target.anim) target.anim.flash = 1;
      addFloatingText(toR, toC, '-' + formatDamage(dmg), '#ff8080', 0);
      effects.push({ type: 'explosion', row: toR, col: toC, startTime: performance.now(), duration: 520 });
      if (target.hp <= 0) destroyUnit(target);
      updateGameUI(); drawGameCanvas(performance.now());
      resolve();
    }, 180);
  });
}
function blueDefenseFireOnce(building, target) {
  return new Promise(function (resolve) {
    if (!building || !building.alive || !target || !target.alive || !target.pos) { resolve(); return; }
    setTimeout(function () {
      if (currentState !== 'GAME_PLAY') { resolve(); return; }
      if (!target.alive || !target.pos) { resolve(); return; }
      var dmg = building.cfg.attack;
      target.hp -= dmg;
      if (target.anim) target.anim.flash = 1;
      addFloatingText(target.pos.row, target.pos.col, '-' + formatDamage(dmg), '#80c0ff', 0);
      if (target.hp <= 0) destroyUnit(target);
      updateGameUI(); drawGameCanvas(performance.now());
      resolve();
    }, 180);
  });
}

/* ---- 补充的辅助函数 ---- */
async function aiSelectBestMove(unit, visited) {
  var moves = getAdjacentMoveCells(unit);
  if (!moves.length) return null;
  var best = null, bestS = -Infinity;
  var curS = evaluatePosition(unit.pos.row, unit.pos.col, unit);
  for (var i = 0; i < moves.length; i++) {
    var m = moves[i];
    if (visited && visited[m.row + ',' + m.col]) continue;
    var s = evaluatePosition(m.row, m.col, unit);
    if (isJumpPad(m.row, m.col) && aiShouldUseJumpPad(unit, m.row, m.col)) s += 20;
    if (s <= curS - 8) s -= 15;
    if (s > bestS) { bestS = s; best = m; }
  }
  return best;
}
function aiShouldUseJumpPad(unit, row, col) {
  if (unit.cfg.isBaseTank) return false;
  var dest = getJumpDestination(row, col); if (!dest) return false;
  var allyAtDest = redUnits.concat(blueUnits).find(function (u) { return u.alive && u.pos && u.pos.row === dest.row && u.pos.col === dest.col && u.team === unit.team; });
  if (allyAtDest) return false;
  var ehq = getEnemyHQ(), myHQ = unit.team === 'red' ? redHQ : blueHQ;
  if (ehq) {
    var distNow = Math.abs(unit.pos.row - ehq.pos.row) + Math.abs(unit.pos.col - ehq.pos.col);
    var distAfter = Math.abs(dest.row - ehq.pos.row) + Math.abs(dest.col - ehq.pos.col);
    var hqInDanger = myHQ && myHQ.hp < myHQ.maxHp * 0.3;
    if (hqInDanger) {
      var dHQNow = Math.abs(unit.pos.row - myHQ.pos.row) + Math.abs(unit.pos.col - myHQ.pos.col);
      var dHQAfter = Math.abs(dest.row - myHQ.pos.row) + Math.abs(dest.col - myHQ.pos.col);
      return dHQAfter < dHQNow;
    }
    if (distAfter >= distNow) return false;
  }
  return true;
}
async function aiSearchMoveDeep(unit, budgetMs) {
  var startTime = performance.now();
  var layer1 = genLayer1Actions(unit);
  var best = null, bestScore = -Infinity;
  var nodes = 0;
  for (var i = 0; i < layer1.length; i++) {
    var action = layer1[i];
    if (performance.now() - startTime > budgetMs) break;
    var snap1 = makeShadowSnap(unit);
    shadowApplyMyAction(snap1, action, unit);
    var enemyCounter = shadowFindBestEnemyCounter(snap1);
    shadowApplyEnemyAction(snap1, enemyCounter);
    var secondAction = shadowFindMySecondAction(snap1, unit);
    if (secondAction) {
      shadowApplyMyAction(snap1, secondAction, unit);
      var ec2 = shadowFindBestEnemyCounter(snap1);
      shadowApplyEnemyAction(snap1, ec2);
    }
    var s = shadowScore(snap1);
    if (action.type === 'attack') s += 8;
    if (action.type === 'attack' && action.target.type === 'defense') s += 5;
    if (action.type === 'stay') s -= 2;
    if (s > bestScore) { bestScore = s; best = action; }
    nodes++;
    if (nodes % 3 === 0) await sleep(0);
  }
  return best;
}
function genLayer1Actions(unit) {
  var acts = [{ type: 'stay' }];
  if (!unit.isUnderground && unit.moveStepsLeft > 0) {
    var cells = getAdjacentMoveCells(unit);
    for (var i = 0; i < cells.length; i++) acts.push({ type: 'move', row: cells[i].row, col: cells[i].col });
  }
  if (unit.attackCountLeft > 0 && unit.cfg.range > 0 && unit.cooldownRemaining <= 0 && !unit.cfg.isMissile &&
      unit.cfg.special !== 'builder' && unit.cfg.special !== 'rocket_builder' && unit.cfg.special !== 'nuke_builder' &&
      unit.cfg.special !== 'repair' && unit.cfg.special !== 'artillery') {
    var targets = aiGetAttackTargets(unit);
    for (var t = 0; t < targets.length; t++) acts.push({ type: 'attack', target: targets[t] });
  }
  return acts;
}
function makeShadowSnap(aiUnit) {
  var myTeam = aiUnit.team;
  var myArr = myTeam === 'red' ? redUnits : blueUnits;
  var enemyArr = myTeam === 'red' ? blueUnits : redUnits;
  var myHQ = myTeam === 'red' ? redHQ : blueHQ;
  var enemyHQ = myTeam === 'red' ? blueHQ : redHQ;
  return {
    my: myArr.filter(function (u) { return u.alive; }).map(shadowClone),
    enemy: enemyArr.filter(function (u) { return u.alive; }).map(shadowClone),
    myHQ: myHQ ? { hp: myHQ.hp, pos: { row: myHQ.pos.row, col: myHQ.pos.col } } : null,
    enemyHQ: enemyHQ ? { hp: enemyHQ.hp, pos: { row: enemyHQ.pos.row, col: enemyHQ.pos.col } } : null,
    aiTeam: myTeam
  };
}
function shadowClone(unit) {
  return { ref: unit, cfg: unit.cfg, team: unit.team, pos: unit.pos ? { row: unit.pos.row, col: unit.pos.col } : null, hp: unit.hp, maxHp: unit.maxHp, shield: unit.shield, alive: unit.alive, isUnderground: unit.isUnderground };
}
function shadowFindUnit(snap, ref, fromMy) { return (fromMy ? snap.my : snap.enemy).find(function (s) { return s.ref === ref; }); }
function shadowScore(snap) {
  var score = 0;
  for (var i = 0; i < snap.my.length; i++) { var u = snap.my[i]; if (!u.alive) continue; score += u.hp * 8 + (u.shield || 0) * 4; if (u.cfg.attack) score += u.cfg.attack * 2; }
  for (var j = 0; j < snap.enemy.length; j++) { var u2 = snap.enemy[j]; if (!u2.alive) continue; score -= u2.hp * 10 + (u2.shield || 0) * 4; if (u2.cfg.attack) score -= u2.cfg.attack * 2; }
  if (snap.myHQ && snap.myHQ.hp > 0) score += snap.myHQ.hp * 6;
  if (snap.enemyHQ && snap.enemyHQ.hp > 0) score -= snap.enemyHQ.hp * 12;
  return score;
}
function shadowApplyMyAction(snap, action, unit) {
  var me = shadowFindUnit(snap, unit, true); if (!me) return;
  if (action.type === 'move') me.pos = { row: action.row, col: action.col };
  else if (action.type === 'attack') {
    var power = Math.max(0.5, unit.cfg.attack || 0.5);
    if (action.target.type === 'unit') {
      var e = shadowFindUnit(snap, action.target.unit, false);
      if (e) {
        if (e.shield > 0) { var absorb = Math.min(e.shield, power); e.shield -= absorb; if (e.shield === 0 && power > absorb) e.hp -= (power - absorb); }
        else e.hp -= power;
        if (e.hp <= 0) e.alive = false;
      }
    } else if (action.target.type === 'hq' && snap.enemyHQ) {
      var p = power; if (unit.cfg.id === 'siege_tank') p *= 2; snap.enemyHQ.hp -= p;
    }
  }
}
function shadowFindBestEnemyCounter(snap) {
  var threat = null, bestThreat = -Infinity;
  for (var i = 0; i < snap.enemy.length; i++) {
    var e = snap.enemy[i]; if (!e.alive || !e.pos || e.isUnderground) continue;
    var t = (e.cfg.attack || 0) * 3 + (e.cfg.range || 0) * 2;
    if (t > bestThreat) { bestThreat = t; threat = e; }
  }
  if (!threat) return null;
  var target = null, bestScore = -Infinity;
  for (var j = 0; j < snap.my.length; j++) {
    var m = snap.my[j]; if (!m.alive || !m.pos || m.ref === threat.ref) continue;
    var d = Math.max(Math.abs(m.pos.row - threat.pos.row), Math.abs(m.pos.col - threat.pos.col));
    var range = threat.cfg.range || 1;
    var s = d <= range ? 100 - m.hp * 5 : -d * 2;
    if (s > bestScore) { bestScore = s; target = m; }
  }
  if (!target) return null;
  var d2 = Math.max(Math.abs(target.pos.row - threat.pos.row), Math.abs(target.pos.col - threat.pos.col));
  var range2 = threat.cfg.range || 1;
  if (d2 <= range2) return { type: 'attack', from: threat, target: target };
  var dr = Math.sign(target.pos.row - threat.pos.row), dc = Math.sign(target.pos.col - threat.pos.col);
  var nr = threat.pos.row + dr, nc = threat.pos.col + dc;
  if (nr >= 0 && nr < ROWS.length && nc >= 0 && nc < COLS && !isBlocked(nr, nc)) return { type: 'move', from: threat, row: nr, col: nc };
  return null;
}
function shadowApplyEnemyAction(snap, action) {
  if (!action) return;
  var e = shadowFindUnit(snap, action.from.ref, false); if (!e) return;
  if (action.type === 'move') e.pos = { row: action.row, col: action.col };
  else if (action.type === 'attack') {
    var power = Math.max(0.5, action.from.cfg.attack || 0.5);
    var t = action.target;
    if (t.shield > 0) { var absorb = Math.min(t.shield, power); t.shield -= absorb; if (t.shield === 0 && power > absorb) t.hp -= (power - absorb); }
    else t.hp -= power;
    if (t.hp <= 0) t.alive = false;
  }
}
function shadowFindMySecondAction(snap, unit) {
  var me = shadowFindUnit(snap, unit, true); if (!me || !me.alive) return null;
  var best = null, bestScore = -Infinity;
  var ehq = snap.enemyHQ;
  for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    var nr = me.pos.row + dr, nc = me.pos.col + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS || isBlocked(nr, nc)) continue;
    var s = ehq ? -(Math.abs(nr - ehq.pos.row) + Math.abs(nc - ehq.pos.col)) * 3 : 0;
    for (var i = 0; i < snap.enemy.length; i++) {
      var e = snap.enemy[i]; if (!e.alive || !e.pos) continue;
      var d = Math.max(Math.abs(nr - e.pos.row), Math.abs(nc - e.pos.col));
      if (d <= (e.cfg.range || 1)) s -= (e.cfg.attack || 0.5) * 4;
    }
    if (s > bestScore) { bestScore = s; best = { type: 'move', row: nr, col: nc }; }
  }
  return best;
}

/* ---- 建造/修理/导弹/钻地辅助 ---- */
function aiSelectBuildPosition(unit) {
  var cur = getCurrentUnits();
  if (unit.cfg.special === 'builder') { if (cur.filter(function (u) { return u.cfg.isRobot && u.alive; }).length >= unit.cfg.robotLimit) return null; }
  else if (unit.cfg.special === 'rocket_builder') { if (cur.filter(function (u) { return u.cfg.isMissile && u.alive; }).length >= unit.cfg.rocketLimit) return null; }
  else if (unit.cfg.special === 'nuke_builder') { if (cur.filter(function (u) { return u.cfg.isNuke && u.alive; }).length >= unit.cfg.nukeLimit) return null; }
  else return null;
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var cands = [];
  var ehq = getEnemyHQ(), myHQ = unit.team === 'red' ? redHQ : blueHQ;
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var nr = unit.pos.row + dr, nc = unit.pos.col + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    if (!canBuildAt(unit, nr, nc)) continue;
    var dE = ehq ? Math.abs(nr - ehq.pos.row) + Math.abs(nc - ehq.pos.col) : 0;
    var dM = myHQ ? Math.abs(nr - myHQ.pos.row) + Math.abs(nc - myHQ.pos.col) : 0;
    cands.push({ row: nr, col: nc, score: dE - dM * 0.6 });
  }
  if (!cands.length) return null;
  cands.sort(function (a, b) { return a.score - b.score; });
  return cands[0];
}
async function aiRepairAction(unit) {
  if (unit.attackCountLeft <= 0) return;
  var healCells = getHealRangeCells(unit);
  var bestHeal = null, bestHealScore = 0;
  for (var i = 0; i < healCells.length; i++) {
    var c = healCells[i]; if (!c.los) continue;
    var ally = getCurrentUnits().find(function (u) { return u.alive && u.pos && u.pos.row === c.row && u.pos.col === c.col; });
    if (ally) {
      var missing = ally.maxHp - ally.hp; if (missing <= 0) continue;
      var cleanseBonus = (ally.burnTurns > 0 && !isFireTank(ally)) ? 3 : 0;
      var value = Math.min(0.5, missing) * aiUnitValue(ally) + cleanseBonus;
      if (value > bestHealScore) { bestHealScore = value; bestHeal = { row: c.row, col: c.col, unit: ally }; }
    }
  }
  var attackTargets = aiGetAttackTargets(unit);
  var bestAttack = attackTargets.length ? aiSelectBestTarget(unit, attackTargets) : null;
  if (bestHeal && bestHealScore >= 10) { executeHeal(unit, bestHeal.row, bestHeal.col, bestHeal.unit); await sleep(400); }
  else if (bestAttack) { executeAttack(unit, bestAttack); await sleep(400); }
  else if (bestHeal) { executeHeal(unit, bestHeal.row, bestHeal.col, bestHeal.unit); await sleep(400); }
}
async function aiDiggerAction(unit) {
  if (unit.waitingDigIn) return;
  if (unit.isUnderground) {
    var enemyNear = redUnits.concat(blueUnits).find(function (u) { return u.alive && u.pos && u.team !== unit.team && Math.max(Math.abs(u.pos.row - unit.pos.row), Math.abs(u.pos.col - unit.pos.col)) <= 2; });
    if (enemyNear) {
      var dirR = Math.sign(enemyNear.pos.row - unit.pos.row), dirC = Math.sign(enemyNear.pos.col - unit.pos.col);
      var or = unit.pos.row - dirR, oc = unit.pos.col - dirC;
      if (or >= 0 && or < ROWS.length && oc >= 0 && oc < COLS && !isBlocked(or, oc)) await executeUndergroundMove(unit, or, oc);
      await executeDigOut(unit, true);
    } else await executeDigOut(unit, true);
  } else {
    var ehq = getEnemyHQ();
    var distToEnemy = ehq ? Math.abs(unit.pos.row - ehq.pos.row) + Math.abs(unit.pos.col - ehq.pos.col) : 99;
    var enemyNear2 = redUnits.concat(blueUnits).find(function (u) { return u.alive && u.pos && u.team !== unit.team && Math.max(Math.abs(u.pos.row - unit.pos.row), Math.abs(u.pos.col - unit.pos.col)) <= 1; });
    if (!enemyNear2 && distToEnemy > 3 && !unit.digJustUsedThisTurn) await executeDigIn(unit);
    else if (enemyNear2 && unit.attackCountLeft > 0) {
      var targets = aiGetAttackTargets(unit);
      if (targets.length) { var t = aiSelectBestTarget(unit, targets); if (t) { executeAttack(unit, t); await sleep(200); } }
    }
  }
}
function aiSelectMissileTarget(missile) {
  var selfR = missile.pos.row, selfC = missile.pos.col;
  var bestT = null, bestS = -Infinity;
  var eb = (missile.team === 'red' ? blueUnits : redUnits).find(function (u) { return u.alive && u.pos && u.cfg.isBaseTank; });
  if (eb) {
    var d = Math.max(Math.abs(selfR - eb.pos.row), Math.abs(selfC - eb.pos.col));
    if (d <= 1) return { row: eb.pos.row, col: eb.pos.col };
  }
  for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
    var nr = selfR + dr, nc = selfC + dc;
    if (nr < 0 || nr >= ROWS.length || nc < 0 || nc >= COLS) continue;
    var eu = getEnemyUnits().find(function (u) { return u.alive && u.pos && u.pos.row === nr && u.pos.col === nc && !u.isUnderground; });
    if (eu) { var s = 50 + eu.cfg.attack * 12 + (eu.cfg.isBaseTank ? 500 : 0); if (s > bestS) { bestS = s; bestT = { row: nr, col: nc }; } }
    var ehq = getEnemyHQ();
    if (ehq && ehq.pos.row === nr && ehq.pos.col === nc && ehq.hp > 0) { if (300 > bestS) { bestS = 300; bestT = { row: nr, col: nc }; } }
  }
  return bestT;
}
function aiSelectMissileMove(unit, visited) {
  var cells = getAdjacentMoveCells(unit);
  if (!cells.length) return null;
  var best = null, bestScore = -Infinity;
  var ehq = getEnemyHQ();
  var eb = (unit.team === 'red' ? blueUnits : redUnits).find(function (u) { return u.alive && u.pos && u.cfg.isBaseTank; });
  for (var i = 0; i < cells.length; i++) {
    var c = cells[i];
    if (visited && visited[c.row + ',' + c.col]) continue;
    var s = 0;
    if (eb) s -= (Math.abs(c.row - eb.pos.row) + Math.abs(c.col - eb.pos.col)) * 5;
    else if (ehq) s -= (Math.abs(c.row - ehq.pos.row) + Math.abs(c.col - ehq.pos.col)) * 3;
    var enemyArr = getEnemyUnits();
    for (var ei = 0; ei < enemyArr.length; ei++) {
      var eu = enemyArr[ei]; if (!eu.alive || !eu.pos) continue;
      var d = Math.max(Math.abs(c.row - eu.pos.row), Math.abs(c.col - eu.pos.col));
      if (d <= 1) s += 120; else if (d <= 2) s += 40; else s -= d * 2;
    }
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}