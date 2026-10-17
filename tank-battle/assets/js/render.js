/* ========== 渲染模块（2.5D Canvas 绘制） ========== */
var TILE_H = {
  plain: 0.10, river: 0.015,
  bridge: 0.30, bridge_dmg: 0.22, bridge_crt: 0.14,
  obstacle: 0.62, obstacle_dmg: 0.50, obstacle_crt: 0.36,
  jump_pad: 0.18, base: 0.24, ruins: 0.10, ruins_block: 0.24
};

function tilePalette(terrain, isHQ, t, r, c) {
  switch (terrain) {
    case 'river': return ['#2f7fbf', '#20608f', '#1a4f76'];
    case 'bridge': return ['#b9814a', '#8a5a2c', '#6f4520'];
    case 'bridge_dmg': return ['#9a6a3a', '#704824', '#563618'];
    case 'bridge_crt': return ['#6a4a2a', '#4a3018', '#341c0c'];
    case 'obstacle': return ['#8a8a92', '#5f5f68', '#4a4a52'];
    case 'obstacle_dmg': return ['#6e6e76', '#4a4a52', '#36363c'];
    case 'obstacle_crt': return ['#54545c', '#363640', '#242428'];
    case 'ruins': return ['#5a5040', '#3e362c', '#2a241c'];
    case 'ruins_block': return ['#6a5c48', '#4a4034', '#322a20'];
    case 'jump_pad': var p = 0.5 + 0.5 * Math.sin(t * 3 + (r + c) * 0.9); var g = Math.round(140 + p * 80); return ['rgb(50,' + g + ',90)', '#2a8f4a', '#1f6e38'];
    case 'base_red': return isHQ === 'red' ? ['#a63a4a', '#7a2230', '#5a1824'] : ['#6a2c36', '#4a1c24', '#36141a'];
    case 'base_blue': return isHQ === 'blue' ? ['#3a6ab0', '#22487a', '#183458'] : ['#2c4a72', '#1c3252', '#14243c'];
    default: return ['#4a6b42', '#33492e', '#263622'];
  }
}

function drawIsoTile(ctx, r, c, t) {
  var cell = gridData[r][c], terrain = cell.terrain, isHQ = cell.isHQ;
  var hKey = 'plain';
  if (terrain === 'river') hKey = 'river';
  else if (terrain.startsWith('bridge')) hKey = terrain;
  else if (terrain.startsWith('obstacle')) hKey = terrain;
  else if (terrain === 'jump_pad') hKey = 'jump_pad';
  else if (terrain.startsWith('base')) hKey = 'base';
  else if (terrain.startsWith('ruins')) hKey = terrain;
  var h = TILE_H[hKey], pulse = 0;
  if (terrain === 'jump_pad') { pulse = 0.5 + 0.5 * Math.sin(t * 3 + (r + c) * 0.9); h += pulse * 0.14; }
  var p = isoCell(r, c), lift = h * ISO.Z;
  var palette = tilePalette(terrain, isHQ, t, r, c);
  var hw = ISO.TW / 2, hh = ISO.TH / 2;

  ctx.fillStyle = palette[1];
  ctx.beginPath(); ctx.moveTo(p.x + hw, p.y); ctx.lineTo(p.x, p.y + hh);
  ctx.lineTo(p.x, p.y + hh - lift); ctx.lineTo(p.x + hw, p.y - lift); ctx.closePath(); ctx.fill();

  ctx.fillStyle = palette[2];
  ctx.beginPath(); ctx.moveTo(p.x, p.y + hh); ctx.lineTo(p.x - hw, p.y);
  ctx.lineTo(p.x - hw, p.y - lift); ctx.lineTo(p.x, p.y + hh - lift); ctx.closePath(); ctx.fill();

  ctx.fillStyle = palette[0];
  isoDiamond(ctx, p.x, p.y, ISO.TW, ISO.TH, lift); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1; ctx.stroke();

  var topY = p.y - lift;

  if (terrain === 'river') {
    ctx.save(); isoDiamond(ctx, p.x, p.y, ISO.TW, ISO.TH, lift); ctx.clip();
    var phase = (t * 0.6 + (r * 0.37 + c * 0.61)) % 1;
    ctx.strokeStyle = 'rgba(180,225,255,' + (0.35 * (1 - Math.abs(phase - 0.5) * 2)) + ')';
    ctx.lineWidth = 1.6;
    for (var i = 0; i < 2; i++) {
      var off = ((phase + i * 0.5) % 1 - 0.5) * ISO.TW;
      ctx.beginPath(); ctx.moveTo(p.x - hw * 0.7 + off, topY + hh * 0.35);
      ctx.quadraticCurveTo(p.x + off, topY - hh * 0.2, p.x + hw * 0.7 + off, topY + hh * 0.35); ctx.stroke();
    }
    ctx.restore();
  } else if (terrain.startsWith('bridge')) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (var bi = -2; bi <= 2; bi++) {
      var k = bi / 5;
      ctx.beginPath(); ctx.moveTo(p.x + k * hw, topY - hh * 0.05); ctx.lineTo(p.x + k * hw + hh * 0.9, topY - hh * 0.9); ctx.stroke();
    }
    if (terrain !== 'bridge') {
      ctx.strokeStyle = 'rgba(20,10,0,0.7)'; ctx.lineWidth = terrain === 'bridge_crt' ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(p.x - hw * 0.3, topY - hh * 0.3); ctx.lineTo(p.x + hw * 0.1, topY + hh * 0.1);
      ctx.lineTo(p.x + hw * 0.4, topY - hh * 0.2); ctx.stroke();
    }
  } else if (terrain.startsWith('obstacle')) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    isoDiamond(ctx, p.x - hw * 0.15, p.y, ISO.TW * 0.55, ISO.TH * 0.55, lift + 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(p.x - hw * 0.4, topY + hh * 0.1); ctx.lineTo(p.x + hw * 0.1, topY - hh * 0.4);
    ctx.lineTo(p.x + hw * 0.45, topY + hh * 0.15); ctx.stroke();
  } else if (terrain.startsWith('ruins')) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(p.x - hw * 0.45, topY - hh * 0.1, hw * 0.4, hh * 0.3);
    ctx.fillStyle = 'rgba(120,105,90,0.7)'; ctx.fillRect(p.x - hw * 0.35, topY - hh * 0.35, hw * 0.25, hh * 0.25);
  } else if (terrain === 'jump_pad') {
    ctx.strokeStyle = 'rgba(120,255,160,' + (0.4 + pulse * 0.5) + ')'; ctx.lineWidth = 2;
    isoDiamond(ctx, p.x, p.y, ISO.TW * (0.5 + pulse * 0.35), ISO.TH * (0.5 + pulse * 0.35), lift + 1); ctx.stroke();
    var dest = getJumpDestination(r, c);
    if (dest) {
      var q = isoCell(dest.row, dest.col); var ang = Math.atan2(q.y - topY, q.x - p.x);
      ctx.save(); ctx.translate(p.x, topY); ctx.rotate(ang);
      ctx.fillStyle = '#bfffd0'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  } else if (terrain === 'base_red' || terrain === 'base_blue') {
    var isRed = terrain === 'base_red';
    ctx.fillStyle = isRed ? 'rgba(233,69,96,.18)' : 'rgba(77,166,255,.18)';
    ctx.fillRect(p.x - hw + 3, topY - hh + 3, ISO.TW - 6, ISO.TH - 6);
  }
}

/* ========== 3D 盒子 ========== */
function drawBox3D(ctx, cx, cz, baseY, halfL, halfW, height, phi, colTop, colRight, colLeft) {
  var cs = Math.cos(phi), sn = Math.sin(phi);
  var local = [[-halfL, -halfW], [halfL, -halfW], [halfL, halfW], [-halfL, halfW]];
  var corners = local.map(function (p) { return { wx: cx + p[0] * cs - p[1] * sn, wz: cz + p[0] * sn + p[1] * cs }; });
  var bot = corners.map(function (p) { return isoProject(p.wx, p.wz, baseY); });
  var top = corners.map(function (p) { return isoProject(p.wx, p.wz, baseY + height); });
  var boxCx = (bot[0].x + bot[1].x + bot[2].x + bot[3].x) / 4;
  var faces = [];
  for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; faces.push({ i: i, j: j, d: corners[i].wx + corners[i].wz + corners[j].wx + corners[j].wz }); }
  faces.sort(function (a, b) { return a.d - b.d; });
  for (var fi = 0; fi < faces.length; fi++) {
    var f = faces[fi]; var a = bot[f.i], b = bot[f.j], c2 = top[f.j], dd = top[f.i];
    var faceCx = (a.x + b.x + c2.x + dd.x) / 4;
    ctx.fillStyle = faceCx > boxCx ? colRight : colLeft;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(dd.x, dd.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = colTop;
  ctx.beginPath(); ctx.moveTo(top[0].x, top[0].y);
  for (var ti = 1; ti < 4; ti++) ctx.lineTo(top[ti].x, top[ti].y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
}
function bodyCol(cfg) { return [shade(cfg.color, 0.05), shade(cfg.color, -0.05), shade(cfg.color, -0.15)]; }
function turretCol(cfg) { return [shade(cfg.turretColor, 0.05), shade(cfg.turretColor, -0.05), shade(cfg.turretColor, -0.15)]; }

/* ========== 动画 ========== */
function initUnitAnim(u) {
  u.anim = {
    wx: u.pos ? u.pos.col : 0, wz: u.pos ? u.pos.row : 0, dy: 0,
    bodyDir: u.bodyDir || 0, turretDir: u.turretDir || 0,
    flash: 0, recoil: 0,
    fromR: u.pos ? u.pos.row : 0, fromC: u.pos ? u.pos.col : 0,
    moveT: null, moveDur: 260, seed: Math.random() * 10,
    spawn: 1, born: performance.now(), digShake: 0, jumpArc: null
  };
}
function startMoveAnim(unit, fromR, fromC, dur) {
  dur = dur || 260;
  if (!unit.anim) initUnitAnim(unit);
  unit.anim.fromR = fromR; unit.anim.fromC = fromC; unit.anim.moveT = 0; unit.anim.moveDur = dur;
}
function startJumpAnim(unit, fromR, fromC, toR, toC, dur) {
  dur = dur || 700;
  if (!unit.anim) initUnitAnim(unit);
  unit.anim.jumpArc = { fromR: fromR, fromC: fromC, toR: toR, toC: toC, t: 0, dur: dur };
}
function updateAnimations(dt, t) {
  var all = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos; });
  for (var i = 0; i < all.length; i++) {
    var u = all[i]; if (!u.anim) initUnitAnim(u); var a = u.anim;
    var tx = u.pos.col, tz = u.pos.row;
    if (a.jumpArc) {
      a.jumpArc.t += dt * 1000 / a.jumpArc.dur;
      if (a.jumpArc.t >= 1) { a.jumpArc = null; a.wx = tx; a.wz = tz; a.dy = 0; }
      else { var e = a.jumpArc.t; a.wx = lerp(a.jumpArc.fromC, a.jumpArc.toC, e); a.wz = lerp(a.jumpArc.fromR, a.jumpArc.toR, e); a.dy = Math.sin(e * Math.PI) * 1.8; }
    } else if (a.moveT !== null) {
      a.moveT += dt * 1000 / a.moveDur;
      if (a.moveT >= 1) { a.moveT = null; a.wx = tx; a.wz = tz; a.dy = 0; }
      else { var e2 = easeOutCubic(a.moveT); a.wx = a.fromC + (tx - a.fromC) * e2; a.wz = a.fromR + (tz - a.fromR) * e2; a.dy = Math.sin(a.moveT * Math.PI) * 0.16; }
    } else { a.wx = tx; a.wz = tz; a.dy = Math.sin(t * 2.2 + a.seed) * 0.012; }
    a.bodyDir = lerpAngle(a.bodyDir, u.bodyDir, 1 - Math.pow(0.0008, dt));
    a.turretDir = lerpAngle(a.turretDir, u.turretDir, 1 - Math.pow(0.0002, dt));
    a.flash = Math.max(0, a.flash - dt * 3.5);
    a.recoil = Math.max(0, a.recoil - dt * 6);
    if (u.waitingDigIn || u.pendingDigOut) a.digShake = Math.min(1, a.digShake + dt * 3);
    else a.digShake = Math.max(0, a.digShake - dt * 4);
    var age = (performance.now() - a.born) / 1000;
    a.spawn = age < 0.35 ? easeOutCubic(age / 0.35) : 1;
  }
}

/* ========== 单位绘制 ========== */
function drawUnit3D(ctx, unit, t) {
  var a = unit.anim; if (!a) return;
  var wx = a.wx, wz = a.wz, baseY = a.dy, cfg = unit.cfg;
  var teamCol = unit.team === 'red' ? '#e94560' : '#4da6ff';
  var sp = isoProject(wx, wz, 0);

  ctx.save(); ctx.translate(sp.x, sp.y); ctx.scale(1, 0.5);
  ctx.beginPath(); ctx.arc(0, 0, ISO.TW * 0.30 * a.spawn, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill(); ctx.restore();

  if (unit === currentUnit && unit.alive) {
    ctx.save(); ctx.strokeStyle = teamCol; ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5);
    isoDiamond(ctx, sp.x, sp.y, ISO.TW * 0.92, ISO.TH * 0.92, 1); ctx.stroke(); ctx.restore();
  }

  if (cfg.isNukeLauncher) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.scale(1, 0.5);
    ctx.strokeStyle = 'rgba(230,126,34,' + (0.35 + pulse * 0.35) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, ISO.TW * 1.0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  if (unit.shield !== null && unit.shield > 0) {
    var hp = isoProject(wx, wz, baseY + 0.35);
    var rings = unit.shieldLayers > 1 ? unit.shieldLayers : 1;
    ctx.save(); ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
    for (var ri = 0; ri < rings; ri++) {
      var scale = 0.52 + ri * 0.14;
      ctx.strokeStyle = ri === 0 ? 'rgba(0,230,255,0.85)' : 'rgba(120,240,255,0.55)';
      ctx.lineWidth = ri === 0 ? 2 : 1.4;
      ctx.beginPath(); ctx.ellipse(hp.x, hp.y, ISO.TW * scale, ISO.TH * scale, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  if (unit.isUnderground) { drawUndergroundMound(ctx, unit, t, a); return; }

  var phi = (a.bodyDir - 45) * Math.PI / 180;
  if (cfg.isMissile || cfg.isNuke) drawMissileOrNuke(ctx, unit, a, phi, wx, wz, baseY, t);
  else drawUnitBody(ctx, unit, a, phi, wx, wz, baseY, t);

  if (a.flash > 0.01) {
    var cp = isoProject(wx, wz, baseY + 0.30);
    ctx.save(); ctx.globalAlpha = a.flash * 0.85; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.ellipse(cp.x, cp.y, ISO.TW * 0.42, ISO.TH * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // HUD
  if (unit.alive && unit.hp > 0) {
    var hpP = isoProject(wx, wz, baseY + 0.95);
    var hpW = ISO.TW * 0.56, hpH = 3.8, hpX = hpP.x - hpW / 2, hpY = hpP.y;
    ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(hpX - 1.5, hpY - 1.5, hpW + 3, hpH + 3);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = unit.team === 'red' ? '#e94560' : '#4da6ff';
    ctx.fillRect(hpX, hpY, hpW * Math.max(0, unit.hp / unit.maxHp), hpH);
    ctx.save();
    ctx.font = 'bold ' + Math.max(9, ISO.TW * 0.17) + 'px ' + CJK_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var txt = unit.hp.toFixed(1) + '/' + unit.maxHp.toFixed(1);
    var txtY = hpY - hpH * 0.6 - ISO.TW * 0.10;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3; ctx.strokeText(txt, hpP.x, txtY);
    ctx.fillStyle = unit.team === 'red' ? '#ffb0c0' : '#bfe0ff'; ctx.fillText(txt, hpP.x, txtY);
    ctx.restore();
    if (unit.cooldownRemaining > 0) {
      var cTxt = '装填(' + unit.cooldownRemaining + ')';
      var cY = hpY - ISO.TW * 0.42;
      ctx.save(); ctx.font = 'bold ' + Math.max(9, ISO.TW * 0.15) + 'px ' + CJK_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2.5; ctx.strokeText(cTxt, hpP.x, cY);
      ctx.fillStyle = '#ffd45e'; ctx.fillText(cTxt, hpP.x, cY); ctx.restore();
    }
    var icons = [];
    if (unit.burnTurns > 0) icons.push('🔥' + unit.burnTurns);
    if (unit.waitingJump) icons.push('⏳' + Math.ceil(unit.jumpWaitTurns / 2));
    if (getRadiationDepthAt(wx, wz) > 0) icons.push('☢️');
    if (unit.shield !== null && unit.shield > 0) icons.push('🛡');
    if (icons.length) {
      ctx.save(); ctx.font = Math.max(11, ISO.TW * 0.18) + 'px ' + CJK_FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      var sx = hpX + hpW + 4, sy = hpY + hpH / 2;
      for (var ii = 0; ii < icons.length; ii++) { ctx.fillStyle = '#ffd45e'; ctx.fillText(icons[ii], sx, sy); sx += ISO.TW * 0.32; }
      ctx.restore();
    }
  }

  if (unit.waitingJump && unit.alive) {
    var ip = isoProject(wx, wz, baseY + 1.15);
    ctx.save(); ctx.font = 'bold ' + ISO.TW * 0.26 + 'px ' + CJK_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText('⏳' + Math.ceil(unit.jumpWaitTurns / 2), ip.x, ip.y); ctx.restore();
  }

  if (unit._aiThinking) {
    var tip = isoProject(wx, wz, baseY + 1.5);
    ctx.font = ISO.TW * 0.5 + 'px ' + CJK_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🤔', tip.x, tip.y);
  }

  if (isUnitExhausted(unit) && unit.alive) {
    ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = '#556';
    isoDiamond(ctx, sp.x, sp.y, ISO.TW * 0.95, ISO.TH * 0.95, 2); ctx.fill(); ctx.restore();
  }
}

function drawUndergroundMound(ctx, unit, t, a) {
  var wp = isoProject(a.wx, a.wz, 0);
  var pulse = 0.85 + 0.15 * Math.sin(t * 4 + a.seed);
  var base = ISO.TW * 0.28;
  var dirtTop = unit.team === 'red' ? '#8a4a3a' : '#3a5a8a';
  var dirtSide = unit.team === 'red' ? '#5c2e24' : '#243a5c';
  ctx.save(); ctx.translate(wp.x, wp.y); ctx.scale(1, 0.55);
  var R = base * pulse;
  var g = ctx.createRadialGradient(0, -base * 0.3, 4, 0, 0, R);
  g.addColorStop(0, shade(dirtTop, 0.3)); g.addColorStop(0.6, dirtTop); g.addColorStop(1, dirtSide);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.fillStyle = '#fff'; ctx.font = 'bold ' + ISO.TW * 0.20 + 'px ' + CJK_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2.5;
  var numY = wp.y - ISO.TW * 0.28;
  ctx.strokeText('' + unit.moveStepsLeft, wp.x, numY); ctx.fillText('' + unit.moveStepsLeft, wp.x, numY); ctx.restore();
}

function drawMissileOrNuke(ctx, unit, a, phi, wx, wz, baseY, t) {
  var cfg = unit.cfg, bodyColor = cfg.color || '#5d8a3c';
  var len = cfg.isNuke ? 0.75 : 0.62, wid = cfg.isNuke ? 0.30 : 0.20, hgt = cfg.isNuke ? 0.30 : 0.18;
  drawBox3D(ctx, wx, wz, baseY + 0.10, len / 2, wid / 2, hgt, phi,
    cfg.isNuke ? '#f5f5f5' : shade(bodyColor, 1.2), shade(bodyColor, 0.85), shade(bodyColor, 0.65));
  var tipP = isoProject(wx + Math.cos(phi) * (len / 2 + 0.10), wz + Math.sin(phi) * (len / 2 + 0.10), baseY + 0.10 + hgt * 0.5);
  ctx.fillStyle = cfg.isNuke ? '#d63031' : '#ff8844';
  ctx.beginPath(); ctx.arc(tipP.x, tipP.y, ISO.TW * 0.07, 0, Math.PI * 2); ctx.fill();
}

function drawUnitBody(ctx, unit, a, phi, wx, wz, baseY, t) {
  var cfg = unit.cfg;
  var bc = bodyCol(cfg), tc = turretCol(cfg);
  var acol = cfg.accentColor || cfg.color;
  var chassis = cfg.chassisType;
  var isSuper = cfg.weight === 'super_heavy';
  var isHeavy = cfg.weight === 'heavy' || isSuper;
  var bodyL = cfg.isRobot ? 0.55 : isSuper ? 0.90 : isHeavy ? 0.84 : 0.78;
  var bodyW = cfg.isRobot ? 0.50 : isSuper ? 0.76 : isHeavy ? 0.68 : 0.62;
  var bodyH = cfg.isRobot ? 0.20 : isSuper ? 0.30 : 0.26;
  var recoil = a.recoil * 0.08;

  var shakeX = 0, shakeY = 0;
  if (a.digShake > 0.05) { shakeX = Math.sin(t * 40) * ISO.TW * 0.02 * a.digShake; shakeY = Math.cos(t * 35) * ISO.TH * 0.02 * a.digShake; }
  ctx.save(); ctx.translate(shakeX, shakeY);

  if (chassis === 'tracked' || chassis === 'amphibious') {
    drawBox3D(ctx, wx, wz, baseY + 0.02, bodyL * 0.52, bodyW * 0.56, bodyH * 0.45, phi, '#333', '#262626', '#1c1c1c');
  } else if (chassis === 'wheeled') {
    var wheelR = ISO.TW * 0.10;
    var wheels = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (var wi = 0; wi < wheels.length; wi++) {
      var llx = wheels[wi][0], llz = wheels[wi][1];
      var wx2 = wx + llx * Math.cos(phi) * bodyL * 0.36 - llz * Math.sin(phi) * bodyW * 0.36;
      var wz2 = wz + llx * Math.sin(phi) * bodyL * 0.36 + llz * Math.cos(phi) * bodyW * 0.36;
      var wp = isoProject(wx2, wz2, baseY + 0.06);
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(wp.x, wp.y, wheelR, wheelR * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  drawBox3D(ctx, wx - Math.cos(phi) * recoil, wz - Math.sin(phi) * recoil, baseY + bodyH * 0.42,
    bodyL / 2, bodyW / 2, bodyH, phi, bc[0], bc[1], bc[2]);

  // 炮塔
  var noTurret = cfg.id === 'engineer' || cfg.id === 'melee_tank' || cfg.id === 'siege_tank' ||
    cfg.isRobot || cfg.isNukeLauncher || cfg.special === 'rocket_builder' ||
    cfg.special === 'dig' || cfg.special === 'artillery';
  if (!noTurret && !cfg.isMissile && !cfg.isNuke) {
    var tphi = (a.turretDir - 45) * Math.PI / 180;
    drawBox3D(ctx, wx, wz, baseY + bodyH * 1.42, 0.24, 0.20, 0.17, tphi, tc[0], tc[1], tc[2]);

    var isFlame = cfg.special === 'burn' || cfg.special === 'fire_burn';
    var barrelLen = isFlame ? 0.55 : isHeavy ? 0.58 : 0.52;
    var barrelThick = isFlame ? 0.085 : (isHeavy ? 0.07 : 0.055);
    var b0 = isoProject(wx + Math.cos(tphi) * 0.18, wz + Math.sin(tphi) * 0.18, baseY + bodyH * 1.42 + 0.09);
    var b1 = isoProject(wx + Math.cos(tphi) * (0.18 + barrelLen), wz + Math.sin(tphi) * (0.18 + barrelLen), baseY + bodyH * 1.42 + 0.09);
    ctx.strokeStyle = isFlame ? '#1a1a1a' : '#252525';
    ctx.lineWidth = ISO.TW * barrelThick; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    ctx.strokeStyle = isFlame ? acol : '#555'; ctx.lineWidth = ISO.TW * 0.018;
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
  }

  if (cfg.special === 'artillery') {
    var tphi2 = (a.turretDir - 45) * Math.PI / 180;
    drawBox3D(ctx, wx, wz, baseY + bodyH * 1.42, 0.30, 0.28, 0.20, tphi2, tc[0], tc[1], tc[2]);
    var ab0 = isoProject(wx + Math.cos(tphi2) * 0.22, wz + Math.sin(tphi2) * 0.22, baseY + bodyH * 1.42 + 0.14);
    var ab1 = isoProject(wx + Math.cos(tphi2) * 0.52, wz + Math.sin(tphi2) * 0.52, baseY + bodyH * 1.42 + 0.14 + 0.45);
    ctx.strokeStyle = '#252525'; ctx.lineWidth = ISO.TW * 0.28; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ab0.x, ab0.y); ctx.lineTo(ab1.x, ab1.y); ctx.stroke();
    ctx.strokeStyle = '#666'; ctx.lineWidth = ISO.TW * 0.04;
    ctx.beginPath(); ctx.moveTo(ab0.x, ab0.y); ctx.lineTo(ab1.x, ab1.y); ctx.stroke();
  }

  if (cfg.id === 'melee_tank') {
    var tip2 = isoProject(wx + Math.cos(phi) * (bodyL / 2 + 0.15), wz + Math.sin(phi) * (bodyL / 2 + 0.15), baseY + bodyH * 0.5);
    var blade = isoProject(wx + Math.cos(phi) * (bodyL / 2 + 0.35), wz + Math.sin(phi) * (bodyL / 2 + 0.35), baseY + bodyH * 0.5);
    ctx.fillStyle = '#ddd';
    var dx = blade.x - tip2.x, dy = blade.y - tip2.y; var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    ctx.beginPath(); ctx.moveTo(blade.x, blade.y); ctx.lineTo(tip2.x + nx * ISO.TW * 0.06, tip2.y + ny * ISO.TW * 0.06);
    ctx.lineTo(tip2.x - nx * ISO.TW * 0.06, tip2.y - ny * ISO.TW * 0.06); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  if (cfg.special === 'dig') {
    var d0 = isoProject(wx + Math.cos(phi) * (bodyL / 2), wz + Math.sin(phi) * (bodyL / 2), baseY + bodyH * 0.5);
    var d1 = isoProject(wx + Math.cos(phi) * (bodyL / 2 + 0.22), wz + Math.sin(phi) * (bodyL / 2 + 0.22), baseY + bodyH * 0.5);
    ctx.fillStyle = '#A8A8A8';
    var ddx = d1.x - d0.x, ddy = d1.y - d0.y; var dlen = Math.hypot(ddx, ddy) || 1;
    var dnx = -ddy / dlen, dny = ddx / dlen; var halfW = ISO.TW * 0.12;
    ctx.beginPath(); ctx.moveTo(d0.x + dnx * halfW, d0.y + dny * halfW); ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d0.x - dnx * halfW, d0.y - dny * halfW); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  if (cfg.isRobot) {
    var topP = isoProject(wx, wz, baseY + bodyH * 1.42 + 0.20);
    var antP = isoProject(wx, wz, baseY + bodyH * 1.42 + 0.42);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(topP.x, topP.y); ctx.lineTo(antP.x, antP.y); ctx.stroke();
    var redPulse = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.fillStyle = 'rgba(255,60,60,' + (0.6 + redPulse * 0.4) + ')';
    ctx.beginPath(); ctx.arc(antP.x, antP.y, ISO.TW * 0.05, 0, Math.PI * 2); ctx.fill();
  }

  if (cfg.isBaseTank) {
    var tphi3 = (a.turretDir - 45) * Math.PI / 180;
    var bn0 = isoProject(wx + Math.cos(tphi3) * 0.18 - Math.sin(tphi3) * 0.12, wz + Math.sin(tphi3) * 0.18 + Math.cos(tphi3) * 0.12, baseY + bodyH * 1.42 + 0.08);
    var bn1 = isoProject(wx + Math.cos(tphi3) * 0.70 - Math.sin(tphi3) * 0.12, wz + Math.sin(tphi3) * 0.70 + Math.cos(tphi3) * 0.12, baseY + bodyH * 1.42 + 0.08);
    var bs0 = isoProject(wx + Math.cos(tphi3) * 0.18 + Math.sin(tphi3) * 0.12, wz + Math.sin(tphi3) * 0.18 - Math.cos(tphi3) * 0.12, baseY + bodyH * 1.42 + 0.08);
    var bs1 = isoProject(wx + Math.cos(tphi3) * 0.70 + Math.sin(tphi3) * 0.12, wz + Math.sin(tphi3) * 0.70 - Math.cos(tphi3) * 0.12, baseY + bodyH * 1.42 + 0.08);
    ctx.strokeStyle = '#1a1a1a'; ctx.lineCap = 'round'; ctx.lineWidth = ISO.TW * 0.085;
    ctx.beginPath(); ctx.moveTo(bn0.x, bn0.y); ctx.lineTo(bn1.x, bn1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bs0.x, bs0.y); ctx.lineTo(bs1.x, bs1.y); ctx.stroke();
    var pole0 = isoProject(wx - Math.cos(phi) * (bodyL * 0.52), wz - Math.sin(phi) * (bodyL * 0.52), baseY + bodyH * 1.42 + 0.05);
    var pole1 = isoProject(wx - Math.cos(phi) * (bodyL * 0.52), wz - Math.sin(phi) * (bodyL * 0.52), baseY + bodyH * 1.42 + 0.55);
    ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(pole0.x, pole0.y); ctx.lineTo(pole1.x, pole1.y); ctx.stroke();
    var wave = Math.sin(t * 3) * 2.5;
    ctx.fillStyle = unit.team === 'red' ? '#e94560' : '#4da6ff';
    ctx.beginPath(); ctx.moveTo(pole1.x, pole1.y);
    ctx.quadraticCurveTo(pole1.x + ISO.TW * 0.14, pole1.y + 2 + wave, pole1.x + ISO.TW * 0.28, pole1.y + 4);
    ctx.lineTo(pole1.x + ISO.TW * 0.25, pole1.y + 13);
    ctx.quadraticCurveTo(pole1.x + ISO.TW * 0.12, pole1.y + 10 - wave, pole1.x, pole1.y + 13);
    ctx.closePath(); ctx.fill();
  }

  ctx.restore();
}

/* ========== 防御建筑 / 基地 ========== */
function drawDefenseBuilding(ctx, b, t) {
  if (!b.alive) return;
  var cfg = b.cfg, palette = cfg.palette;
  var teamTint = b.team === 'red' ? '#e94560' : '#4da6ff';
  var wx = b.col, wz = b.row, baseY = 0.10;
  var a = b.anim || { turretDir: b.team === 'red' ? 90 : 270, flash: 0, recoil: 0 };
  var tphi = (a.turretDir - 45) * Math.PI / 180;
  drawBox3D(ctx, wx, wz, baseY, 0.38, 0.38, 0.20, Math.PI / 4, shade(palette[0], 0.05), shade(palette[1], 0.05), shade(palette[2], 0.05));
  drawBox3D(ctx, wx, wz, baseY + 0.20, 0.32, 0.32, 0.06, Math.PI / 4, shade(teamTint, 0.1), shade(teamTint, -0.2), shade(teamTint, -0.35));
  var hpW = ISO.TW * 0.50, hpH = 3.5;
  var hpP = isoProject(wx, wz, baseY + 0.90);
  ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(hpP.x - hpW / 2 - 1.5, hpP.y - 1.5, hpW + 3, hpH + 3);
  ctx.fillStyle = '#2a2a3a'; ctx.fillRect(hpP.x - hpW / 2, hpP.y, hpW, hpH);
  ctx.fillStyle = teamTint; ctx.fillRect(hpP.x - hpW / 2, hpP.y, hpW * Math.max(0, b.hp / b.maxHp), hpH);
}

function drawHQ(ctx, hq, team, t) {
  var cx = hq.pos.col, cz = hq.pos.row;
  var isRed = team === 'red';
  var colTop = isRed ? '#a63a4a' : '#3a6ab0';
  var accent = isRed ? '#e94560' : '#4da6ff';
  var baseY = 0.10;
  drawBox3D(ctx, cx, cz, baseY, 0.42, 0.42, 0.16, Math.PI / 4, shade(colTop, 0.05), isRed ? '#7a2230' : '#22487a', isRed ? '#5a1824' : '#183458');
  drawBox3D(ctx, cx, cz, baseY + 0.16, 0.32, 0.32, 0.14, Math.PI / 4, shade(colTop, 0.20), shade(colTop, -0.05), shade(colTop, -0.15));
  drawBox3D(ctx, cx, cz, baseY + 0.30, 0.20, 0.20, 0.18, Math.PI / 4, shade(colTop, 0.30), shade(colTop, -0.10), shade(colTop, -0.20));
  var poleA = isoProject(cx, cz, baseY + 0.58);
  var poleB = isoProject(cx, cz, baseY + 0.98);
  ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(poleA.x, poleA.y); ctx.lineTo(poleB.x, poleB.y); ctx.stroke();
  var wave = Math.sin(t * 3) * 2.5;
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.moveTo(poleB.x, poleB.y);
  ctx.quadraticCurveTo(poleB.x + ISO.TW * 0.14, poleB.y + 2 + wave, poleB.x + ISO.TW * 0.28, poleB.y + 4);
  ctx.lineTo(poleB.x + ISO.TW * 0.25, poleB.y + 13);
  ctx.quadraticCurveTo(poleB.x + ISO.TW * 0.12, poleB.y + 10 - wave, poleB.x, poleB.y + 13);
  ctx.closePath(); ctx.fill();
  if (hq.hp > 0) {
    var hpP = isoProject(cx, cz, baseY + 1.15);
    var hpW = ISO.TW * 0.66, hpH = 4.2;
    var hpX = hpP.x - hpW / 2, hpY = hpP.y;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(hpX - 1.5, hpY - 1.5, hpW + 3, hpH + 3);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(hpX, hpY, hpW, hpH);
    ctx.fillStyle = accent; ctx.fillRect(hpX, hpY, hpW * Math.max(0, hq.hp / hq.maxHp), hpH);
    ctx.save(); ctx.font = 'bold ' + Math.max(8, ISO.TW * 0.16) + 'px ' + CJK_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2; ctx.strokeText(fmtHp(hq.hp), hpP.x, hpY + hpH / 2);
    ctx.fillStyle = '#fff'; ctx.fillText(fmtHp(hq.hp), hpP.x, hpY + hpH / 2); ctx.restore();
  }
}

/* ========== 特效绘制（精简版） ========== */
function drawEffect(ctx, e, t, now) {
  var dt = now - (e.startTime || now);
  var dur = e.duration || 1500;
  var progress = Math.min(1, dt / dur);
  var alpha = Math.max(0, 1 - progress);
  var p = (e.row !== undefined && e.col !== undefined) ? isoCell(e.row, e.col) : null;
  if (!p) return;
  switch (e.type) {
    case 'explosion':
    case 'explosion_big':
    case 'explosion_small': {
      var big = e.type === 'explosion_big', small = e.type === 'explosion_small';
      var mul = small ? 0.5 : (big ? 1.4 : 1);
      var R = ISO.TW * ((big ? 0.4 : 0.22) + progress * (big ? 1.0 : 0.72)) * mul;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.55);
      ctx.strokeStyle = 'rgba(255,200,90,' + (alpha * 0.85) + ')';
      ctx.lineWidth = Math.max(1, ISO.TW * (big ? 0.20 : 0.14) * (1 - progress));
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      fg.addColorStop(0, 'rgba(255,255,225,' + alpha + ')');
      fg.addColorStop(0.35, 'rgba(255,175,50,' + (alpha * 0.85) + ')');
      fg.addColorStop(1, 'rgba(220,60,20,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    }
    case 'smoke':
    case 'residue_smoke': {
      var cx = p.x + e.ox * ISO.TW * 0.6, cy = p.y + e.oy * ISO.TH * 0.6 + e.vy * progress * ISO.TW * 0.9;
      ctx.save(); ctx.globalAlpha = alpha * (e.type === 'residue_smoke' ? 0.25 : 0.55);
      ctx.fillStyle = e.color || 'rgba(60,60,60,';
      ctx.beginPath(); ctx.arc(cx, cy, ISO.TW * e.size * (1 + progress * 0.8), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    }
    case 'burn_ember': {
      var bx = p.x + e.ox * ISO.TW * 0.6, by = p.y + e.oy * ISO.TH * 0.4 - Math.abs(e.vy) * progress * ISO.TW * 0.9;
      var bg = ctx.createRadialGradient(bx, by, 0, bx, by, ISO.TW * e.size * (1 + progress * 0.5));
      bg.addColorStop(0, 'rgba(255,255,180,' + alpha + ')');
      bg.addColorStop(0.5, 'rgba(255,160,40,' + (alpha * 0.9) + ')');
      bg.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, ISO.TW * e.size * (1 + progress * 0.5), 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'shield_flash': {
      var hp = isoCell(e.row, e.col, 0.35);
      ctx.save(); ctx.globalAlpha = alpha * 0.95; ctx.fillStyle = '#e8ffff';
      ctx.beginPath(); ctx.ellipse(hp.x, hp.y, ISO.TW * (0.55 + progress * 0.3), ISO.TH * (0.55 + progress * 0.3), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    }
    case 'shield_shatter': {
      var hs = isoCell(e.row, e.col, 0.35);
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#7fffd4';
      ctx.lineWidth = Math.max(2, ISO.TW * 0.06 * (1 - progress)); ctx.lineCap = 'round';
      for (var si = 0; si < 8; si++) {
        var a2 = (si / 8) * Math.PI * 2;
        var r1 = ISO.TW * (0.5 + progress * 0.4);
        ctx.beginPath(); ctx.arc(hs.x, hs.y, r1, a2 - 0.2 + progress * 0.4, a2 + 0.2 + progress * 0.4); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'nuke_blast': {
      var np = isoCell(e.row, e.col, 0.4);
      var p1 = Math.min(1, dt / 320); var maxR = Math.max(ISO.TW, ISO.TH * 2) * 5.5;
      var curR = maxR * easeOutCubic(p1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var wa = Math.max(0, 0.95 - p1 * 0.95);
      if (wa > 0) { ctx.fillStyle = 'rgba(255,255,255,' + wa + ')'; ctx.beginPath(); ctx.arc(np.x, np.y, curR, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      break;
    }
    case 'hq_destroy_stage1':
    case 'hq_destroy_stage2':
    case 'hq_destroy_stage3': {
      var hp3 = isoCell(e.row, e.col, 0.4);
      var R2 = ISO.TW * (0.4 + progress * 0.8);
      var fg2 = ctx.createRadialGradient(hp3.x, hp3.y, 0, hp3.x, hp3.y, R2);
      fg2.addColorStop(0, 'rgba(255,200,200,' + alpha + ')');
      fg2.addColorStop(0.5, 'rgba(255,60,60,' + (alpha * 0.85) + ')');
      fg2.addColorStop(1, 'rgba(120,0,0,0)');
      ctx.fillStyle = fg2; ctx.beginPath(); ctx.arc(hp3.x, hp3.y, R2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'sink': {
      var sy = p.y + progress * ISO.TH * 0.8;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.ellipse(p.x, sy, ISO.TW * (0.45 - progress * 0.25), ISO.TH * (0.45 - progress * 0.25), 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = ISO.TW * 0.4 + 'px ' + CJK_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', p.x, sy); ctx.restore();
      break;
    }
    case 'dust': {
      ctx.save(); ctx.globalAlpha = alpha * 0.75; ctx.fillStyle = e.color || '#b8a888';
      var dcx = p.x + e.ox * ISO.TW * 0.6 - progress * e.ox * 20;
      var dcy = p.y + e.oy * ISO.TH * 0.6 - progress * 18 - e.oy * 8;
      ctx.beginPath(); ctx.arc(dcx, dcy, ISO.TW * e.size * (1 + progress * 0.6), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      break;
    }
    case 'flame_hit': case 'flame_miss': {
      ctx.save(); ctx.globalAlpha = alpha;
      if (e.type === 'flame_hit') {
        var fg3 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, ISO.TW * 0.6);
        fg3.addColorStop(0, 'rgba(255,255,200,0.9)'); fg3.addColorStop(0.4, 'rgba(255,150,30,0.7)'); fg3.addColorStop(1, 'rgba(200,50,20,0)');
        ctx.fillStyle = fg3; ctx.beginPath(); ctx.arc(p.x, p.y, ISO.TW * (0.3 + progress * 0.3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'build_ring': {
      ctx.save(); ctx.strokeStyle = 'rgba(90,255,150,' + (alpha * 0.9) + ')';
      ctx.lineWidth = Math.max(1.5, ISO.TW * 0.10 * (1 - progress));
      ctx.beginPath(); ctx.ellipse(p.x, p.y, ISO.TW * (0.5 + progress * 0.5), ISO.TH * (0.5 + progress * 0.5), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      break;
    }
    case 'knockback': case 'jump_land': case 'crush': {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = e.type === 'crush' ? 'rgba(0,0,0,0.5)' : '#ddd';
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.ellipse(p.x, p.y, ISO.TW * (0.3 + progress * 0.4), ISO.TH * (0.3 + progress * 0.4), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      break;
    }
  }
}

function drawFloatingText(ctx, ft, now) {
  var dt = now - ft.startTime, progress = dt / ft.life;
  var alpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;
  var p = isoCell(ft.row, ft.col);
  ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
  ctx.font = 'bold ' + ISO.TW * 0.24 + 'px ' + CJK_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
  var px = p.x + ft.offsetX, py = p.y - ISO.Z * 0.7 + ft.offsetY - progress * 22;
  ctx.strokeText(ft.text, px, py); ctx.fillStyle = ft.color; ctx.fillText(ft.text, px, py); ctx.restore();
}

function drawProjectile(ctx, p) {
  var k = clamp((performance.now() - p.startTime) / p.duration, 0, 1);
  var sp = isoCell(p.fromR, p.fromC, 0.4), ep = isoCell(p.toR, p.toC, 0.4);
  var cx = lerp(sp.x, ep.x, k), isArt = p.type === 'artillery';
  var arc = (p.type === 'shell' || isArt) ? -Math.sin(k * Math.PI) * ISO.Z * (isArt ? 2.8 : 1.4) : 0;
  var cy = lerp(sp.y, ep.y, k) + arc;
  ctx.save();
  if (p.type === 'bullet') {
    var ang = Math.atan2(ep.y - sp.y, ep.x - sp.x);
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,240,150,.95)';
    ctx.fillRect(-ISO.TW * 0.16, -ISO.TW * 0.035, ISO.TW * 0.32, ISO.TW * 0.07);
  } else {
    var R = ISO.TW * 0.10;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.5, 'rgba(255,170,60,.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawFlameJet(ctx, f, now) {
  var k = clamp((now - f.startTime) / f.duration, 0, 1);
  var alpha = 1 - k * 0.7;
  var sp = isoCell(f.fromR, f.fromC, 0.35), ep = isoCell(f.toR, f.toC, 0.35);
  var dx = ep.x - sp.x, dy = ep.y - sp.y, len = Math.hypot(dx, dy) || 1;
  var px = -dy / len, py = dx / len;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  var widthOuter = ISO.TW * 0.55 * (1 - k * 0.4);
  ctx.strokeStyle = 'rgba(255,140,30,0.55)'; ctx.lineWidth = widthOuter;
  ctx.beginPath(); ctx.moveTo(sp.x, sp.y);
  for (var i = 1; i <= 6; i++) { var pp = i / 6; var wobble = Math.sin(pp * 8 + now * 0.01) * ISO.TW * 0.10 * pp; ctx.lineTo(sp.x + dx * pp + px * wobble, sp.y + dy * pp + py * wobble); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,190,60,0.85)'; ctx.lineWidth = widthOuter * 0.6;
  ctx.beginPath(); ctx.moveTo(sp.x, sp.y);
  for (var i2 = 1; i2 <= 6; i2++) { var pp2 = i2 / 6; var wob2 = Math.sin(pp2 * 8 + now * 0.012 + 1) * ISO.TW * 0.06 * pp2; ctx.lineTo(sp.x + dx * pp2 + px * wob2, sp.y + dy * pp2 + py * wob2); }
  ctx.stroke();
  ctx.restore();
}

function drawRepairBeam(ctx, h, now) {
  var k = clamp((now - h.startTime) / h.duration, 0, 1);
  var alpha = 1 - k;
  var sp = isoCell(h.fromR, h.fromC, 0.4), ep = isoCell(h.toR, h.toC, 0.4);
  var isRed = h.mode === 'damage';
  var colMain = isRed ? '#ff3355' : '#4ee070';
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  ctx.strokeStyle = colMain; ctx.lineWidth = Math.max(3, ISO.TW * 0.13 * (1 - k * 0.4));
  ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(ep.x, ep.y); ctx.stroke(); ctx.restore();
}

function drawMeleeAnim(ctx, ma, now) {
  var k = clamp((now - ma.startTime) / ma.duration, 0, 1);
  var alpha = 1 - k;
  var sp = isoCell(ma.row, ma.col, 0.5), ep = isoCell(ma.targetR, ma.targetC, 0.5);
  var cx = lerp(sp.x, ep.x, easeOutCubic(k)), cy = lerp(sp.y, ep.y, easeOutCubic(k));
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy);
  var ang = Math.atan2(ep.y - sp.y, ep.x - sp.x); ctx.rotate(ang);
  var L = ISO.TW * 0.6;
  ctx.fillStyle = 'rgba(220,220,220,.9)';
  ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * 0.2, -L * 0.25); ctx.lineTo(-L * 0.2, L * 0.25); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTrackMarks(ctx, now) {
  for (var i = 0; i < trackMarkPool.length; i++) {
    var tr = trackMarkPool[i];
    var alpha = clamp(1 - (now - tr.startTime) / tr.duration, 0, 1) * 0.45;
    if (alpha <= 0 || tr.pts.length < 2) continue;
    ctx.save(); ctx.strokeStyle = 'rgba(20,20,20,' + alpha + ')';
    ctx.lineWidth = Math.max(2, ISO.TW * 0.10); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var j = 0; j < tr.pts.length; j++) { var pt = tr.pts[j]; j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); }
    ctx.stroke(); ctx.restore();
  }
}
function drawWakeTrail(ctx, now) {
  for (var i = 0; i < wakeTrailPool.length; i++) {
    var w = wakeTrailPool[i]; if (w.pts.length < 2) continue;
    var alpha = clamp(1 - (now - w.startTime) / w.duration, 0, 1);
    if (alpha <= 0) continue;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var offsets = [-1, 1];
    for (var oi = 0; oi < offsets.length; oi++) {
      var off = offsets[oi];
      ctx.strokeStyle = 'rgba(170,225,255,' + (alpha * 0.55) + ')';
      ctx.lineWidth = Math.max(2, ISO.TW * 0.10);
      ctx.beginPath();
      for (var j = 0; j < w.pts.length; j++) { var p = w.pts[j]; var oy = off * ISO.TH * 0.15; j === 0 ? ctx.moveTo(p.x, p.y + oy) : ctx.lineTo(p.x, p.y + oy); }
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawRadiationField(ctx, t) {
  if (!radiationSources.length) return;
  for (var si = 0; si < radiationSources.length; si++) {
    var src = radiationSources[si]; if (src.x <= 0) continue;
    var radius = 3 - src.x;
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + src.row + src.col);
    for (var dr = -radius; dr <= radius; dr++) for (var dc = -radius; dc <= radius; dc++) {
      var r = src.row + dr, c = src.col + dc;
      if (r < 0 || r >= ROWS.length || c < 0 || c >= COLS) continue;
      if (Math.max(Math.abs(dr), Math.abs(dc)) > radius) continue;
      var p = isoCell(r, c);
      var isSrc = (dr === 0 && dc === 0);
      var alpha = isSrc ? 0.5 + pulse * 0.15 : 0.10 + (src.x / 3) * 0.16;
      ctx.fillStyle = 'rgba(230,126,34,' + alpha + ')';
      isoDiamond(ctx, p.x, p.y, ISO.TW * 0.96, ISO.TH * 0.96, TILE_H.plain * ISO.Z + 2); ctx.fill();
    }
    var ps = isoCell(src.row, src.col);
    ctx.font = ISO.TW * 0.3 + 'px ' + CJK_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,180,60,' + (0.7 + pulse * 0.3) + ')';
    ctx.fillText('☢', ps.x, ps.y - TILE_H.plain * ISO.Z - 4);
  }
}

function drawHighlights(ctx, t) {
  if (currentState !== 'GAME_PLAY') return;
  var u = currentUnit;
  var isRepairAction = u && u.cfg.special === 'repair' && selectedAction === 'attack';
  for (var hi = 0; hi < highlightedCells.length; hi++) {
    var h = highlightedCells[hi], p = isoCell(h.row, h.col);
    var pulse = 0.5 + 0.5 * Math.sin(t * 5 + (h.row + h.col) * 0.7);
    var bc = highlightedBuildCells.find(function (b) { return b.row === h.row && b.col === h.col; });
    var color;
    if (bc) color = bc.canBuild ? 'rgba(120,255,160,' + (0.30 + pulse * 0.35) + ')' : 'rgba(255,80,80,' + (0.25 + pulse * 0.25) + ')';
    else if (selectedAction === 'move') color = 'rgba(120,200,255,' + (0.28 + pulse * 0.30) + ')';
    else if (selectedAction === 'attack') color = isRepairAction ? 'rgba(120,255,160,' + (0.32 + pulse * 0.30) + ')' : 'rgba(255,120,120,' + (0.28 + pulse * 0.30) + ')';
    else color = 'rgba(255,240,140,' + (0.25 + pulse * 0.25) + ')';
    ctx.fillStyle = color; isoDiamond(ctx, p.x, p.y, ISO.TW * 0.95, ISO.TH * 0.95, TILE_H.plain * ISO.Z + 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (rangeDisplayUnit && rangeDisplayUnit.alive && rangeDisplayUnit.cfg.range > 0) {
    var cells = getAttackRangeCells(rangeDisplayUnit);
    for (var ci = 0; ci < cells.length; ci++) {
      var cc = cells[ci], pp = isoCell(cc.row, cc.col);
      ctx.fillStyle = cc.los ? 'rgba(180,60,255,0.32)' : 'rgba(180,60,255,0.10)';
      isoDiamond(ctx, pp.x, pp.y, ISO.TW * 0.95, ISO.TH * 0.95, TILE_H.plain * ISO.Z + 3); ctx.fill();
    }
  }
}

/* ========== 主渲染 ========== */
function drawGameCanvas(now) {
  if (!gridData) return;
  var canvas = document.getElementById('game-canvas');
  var container = document.getElementById('canvas-container');
  if (!canvas || !container) return;
  var size = isoLayout(); var w = size.w, h = size.h;
  var cssW = Math.round(w), cssH = Math.round(h);
  if (canvas._w !== cssW || canvas._h !== cssH) {
    canvas.width = Math.round(cssW * DPR); canvas.height = Math.round(cssH * DPR);
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas._w = cssW; canvas._h = cssH;
  }
  container.style.height = h + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
  var t = now / 1000;
  var last = drawGameCanvas._last || now;
  var dt = Math.min(0.05, (now - last) / 1000);
  drawGameCanvas._last = now;
  updateAnimations(dt, t);

  var bgGrad = ctx.createRadialGradient(w / 2, h * 0.15, 10, w / 2, h * 0.65, Math.max(w, h));
  bgGrad.addColorStop(0, '#12273c'); bgGrad.addColorStop(0.6, '#0a1622'); bgGrad.addColorStop(1, '#05080d');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

  ctx.save();
  if (now < nukeScreenShakeUntil) { var k = (nukeScreenShakeUntil - now) / 1800; ctx.translate((Math.random() - 0.5) * 14 * k, (Math.random() - 0.5) * 14 * k); }
  if (now < baseScreenShakeUntil) { var k2 = (baseScreenShakeUntil - now) / 2000; ctx.translate((Math.random() - 0.5) * 10 * k2, (Math.random() - 0.5) * 10 * k2); }

  var list = [];
  for (var r = 0; r < ROWS.length; r++) for (var c = 0; c < COLS; c++) list.push({ d: r + c, kind: 'tile', r: r, c: c });
  var allUnits = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos && !u.isUnderground; });
  for (var ui = 0; ui < allUnits.length; ui++) { var u = allUnits[ui]; list.push({ d: u.pos.row + u.pos.col + 0.5, kind: 'unit', u: u }); }
  for (var di = 0; di < defenseBuildings.length; di++) { var b = defenseBuildings[di]; if (!b.alive) continue; list.push({ d: b.row + b.col + 0.5, kind: 'defense', b: b }); }
  var underground = redUnits.concat(blueUnits).filter(function (u) { return u.alive && u.pos && u.isUnderground; });
  list.sort(function (a, b) { return a.d - b.d; });

  for (var li = 0; li < list.length; li++) {
    var it = list[li];
    if (it.kind === 'tile') drawIsoTile(ctx, it.r, it.c, t);
    else if (it.kind === 'defense') drawDefenseBuilding(ctx, it.b, t);
    else drawUnit3D(ctx, it.u, t);
  }
  for (var ug = 0; ug < underground.length; ug++) drawUnit3D(ctx, underground[ug], t);
  if (redHQ && redHQ.hp > 0) drawHQ(ctx, redHQ, 'red', t);
  if (blueHQ && blueHQ.hp > 0) drawHQ(ctx, blueHQ, 'blue', t);

  drawTrackMarks(ctx, now); drawWakeTrail(ctx, now);
  drawRadiationField(ctx, t); drawHighlights(ctx, t);

  for (var pi = 0; pi < projectiles.length; pi++) drawProjectile(ctx, projectiles[pi]);
  for (var fi = 0; fi < flameJets.length; fi++) drawFlameJet(ctx, flameJets[fi], now);
  for (var hi2 = 0; hi2 < healBeams.length; hi2++) drawRepairBeam(ctx, healBeams[hi2], now);
  for (var mi = 0; mi < meleeAnims.length; mi++) drawMeleeAnim(ctx, meleeAnims[mi], now);
  for (var ei = 0; ei < effects.length; ei++) drawEffect(ctx, effects[ei], t, now);
  for (var fti = 0; fti < floatingTexts.length; fti++) drawFloatingText(ctx, floatingTexts[fti], now);

  ctx.restore();
  if (now < nukeWhiteFlashUntil) {
    var a = clamp((nukeWhiteFlashUntil - now) / 200, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.85) + ')'; ctx.fillRect(0, 0, w, h);
  }
}
drawGameCanvas._last = 0;

/* ========== 渲染循环 ========== */
function startRenderLoop() {
  if (renderRaf) return;
  lastFrame = performance.now();
  function loop(now) {
    if (currentState !== 'GAME_PLAY' && currentState !== 'GAME_OVER') { renderRaf = null; return; }
    renderRaf = requestAnimationFrame(loop);
    var realNow = performance.now();
    _pruneTimedList(effects, realNow); _pruneTimedList(projectiles, realNow);
    _pruneTimedList(trackMarkPool, realNow); _pruneTimedList(wakeTrailPool, realNow);
    _pruneTimedList(healBeams, realNow); _pruneTimedList(flameJets, realNow);
    _pruneTimedList(meleeAnims, realNow); _pruneTimedList(buildAnims, realNow);
    var ww = 0;
    for (var i = 0; i < floatingTexts.length; i++) { var ft = floatingTexts[i]; if (realNow - ft.startTime < ft.life) floatingTexts[ww++] = ft; }
    floatingTexts.length = ww;
    drawGameCanvas(now);
  }
  renderRaf = requestAnimationFrame(loop);
}
function stopRenderLoop() { if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = null; } }
function _pruneTimedList(arr, now) {
  var w = 0;
  for (var i = 0; i < arr.length; i++) { var it = arr[i]; var life = (it.duration || it.life || 1500) + (it.holdAfter || 0); if (now - (it.startTime || 0) < life) arr[w++] = it; }
  arr.length = w;
}
function updateEffects(dt) { /* 由渲染循环处理 */ }

/* ========== 地图缩略图 ========== */
function renderMapThumb25D(canvas, cfg) {
  if (!canvas) return;
  var rows = cfg.rows || 10, cols = cfg.cols || 7;
  var w = canvas.clientWidth || 140, h = canvas.clientHeight || 95;
  canvas.width = Math.round(w * 2); canvas.height = Math.round(h * 2);
  var ctx = canvas.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, w, h);
  var cw = w / cols, ch = cw * 0.72, padTop = ch * 0.55;
  var totalH = padTop + rows * ch;
  ctx.save();
  if (totalH > h) { ctx.scale(1, h / totalH); } else { ctx.translate(0, (h - totalH) / 2); }
  var letters = getRowLetters(rows);
  var TERRAIN_STYLE = {
    plain: { top: '#3a5a34', bot: '#233d20' }, river: { top: '#1f5a8c', bot: '#0f3556' },
    bridge: { top: '#b07c46', bot: '#7a5028' }, jump_pad: { top: '#2b7a43', bot: '#14472a' },
    base_red: { top: '#6b2836', bot: '#3c1520' }, base_blue: { top: '#25457a', bot: '#132b52' },
    obstacle: { top: '#3d3d3d', bot: '#242424' }
  };
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
    var pos = letters[r] + (c + 1), terrain = 'plain';
    for (var si = 0; si < (cfg.specialTerrain || []).length; si++) {
      var st = cfg.specialTerrain[si]; if (st.pos !== pos) continue;
      if (st.type === 'base_red') terrain = 'base_red';
      else if (st.type === 'base_blue') terrain = 'base_blue';
      else if (st.type === 'obstacle') terrain = 'obstacle';
      else if (st.type === 'jump_pad') terrain = 'jump_pad';
      else if (st.type === 'bridge') terrain = 'bridge';
    }
    if (terrain === 'plain' && isInRiverRangeStatic(r, c, cfg)) terrain = 'river';
    var style = TERRAIN_STYLE[terrain] || TERRAIN_STYLE.plain;
    var x = c * cw, y = padTop + r * ch;
    var tg = ctx.createLinearGradient(0, y, 0, y + ch);
    tg.addColorStop(0, style.top); tg.addColorStop(1, style.bot);
    ctx.fillStyle = tg; ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = 'rgba(0,0,0,.38)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.25, y + 0.25, cw - 0.5, ch - 0.5);
  }
  ctx.restore();
}