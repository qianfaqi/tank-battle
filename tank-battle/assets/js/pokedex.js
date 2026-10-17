/* ============================================================
   图鉴系统
============================================================ */
function renderPokedexContent() {
  var camC = document.getElementById('pokedex-campaign-tanks');
  if (camC) {
    camC.innerHTML = '';
    var pokedexTanks = TANK_CONFIGS.filter(function (cfg) { return !DERIVATIVE_TANK_IDS.has(cfg.id); });
    pokedexTanks.forEach(function (cfg) {
      var unlocked = devMode || (isTankUnlocked(cfg.id));
      var d = document.createElement('div');
      d.className = 'tank-card' + (unlocked ? '' : ' locked');
      if (unlocked) {
        d.innerHTML = '<div class="tank-icon">' + drawTankIconSVG(cfg, 55, 45) + '</div>' +
          '<div class="tank-name">' + cfg.name + '</div>' +
          '<div class="tank-stats">❤' + cfg.hp + ' ⚡' + cfg.speed + ' 🎯' + cfg.range + ' ⚔' + cfg.attack + '</div>' +
          '<div class="tank-special">' + (cfg.special ? getSpecialShort(cfg.special) : '无特殊词条') + '</div>';
        d.onclick = function () {
          var unlockedList = pokedexTanks.filter(function (t) { return devMode || isTankUnlocked(t.id); });
          showTankDetail(cfg, unlockedList);
        };
      } else {
        d.innerHTML = '<div class="tank-icon" style="opacity:.35">' + drawTankIconSVG(cfg, 55, 45) + '</div>' +
          '<div class="tank-name">？？？</div><div class="tank-stats">未解锁</div>' +
          '<div class="tank-locked-mark">🔒 通关或胜利解锁</div>';
      }
      camC.appendChild(d);
    });
  }
  var othC = document.getElementById('pokedex-other-tanks');
  if (othC) {
    othC.innerHTML = '';
    var otherUnits = [ROBOT, ROBOT_PLUS, MISSILE, NUKE, NANO_3, NANO_2, NANO_1, DEF_BUILDINGS.mg_bunker, DEF_BUILDINGS.mortar, DEF_BUILDINGS.at_gun, DEF_BUILDINGS.nuke_silo];
    otherUnits.forEach(function (cfg) {
      var d = document.createElement('div');
      d.className = 'tank-card';
      var isDef = cfg.turretStyle !== undefined;
      d.innerHTML = '<div class="tank-icon">' + (isDef ? '🏰' : drawTankIconSVG(cfg, 55, 45)) + '</div>' +
        '<div class="tank-name">' + cfg.name + '</div>' +
        '<div class="tank-stats">' + (isDef ? '❤' + cfg.hp + ' 🎯' + cfg.range : '❤' + cfg.hp + ' ⚡' + cfg.speed + ' ⚔' + cfg.attack) + '</div>' +
        '<div class="tank-special">' + (isDef ? cfg.short : getSpecialShort(cfg.special)) + '</div>';
      if (!isDef) d.onclick = function () { showTankDetail(cfg, otherUnits.filter(function (x) { return x.turretStyle === undefined; })); };
      othC.appendChild(d);
    });
  }
  var mapC = document.getElementById('pokedex-map-list');
  if (mapC) {
    mapC.innerHTML = '';
    MAP_CONFIGS.forEach(function (cfg) {
      if (!devMode && CAMPAIGN_ONLY_MAP_IDS.has(cfg.id)) return;
      var d = document.createElement('div');
      d.className = 'map-card';
      var cid = 'pk-map-' + cfg.id;
      d.innerHTML = '<div class="map-thumb"><canvas id="' + cid + '"></canvas></div>' +
        '<div class="map-name">' + cfg.name + '</div>' +
        '<div class="tank-special" style="font-style:normal;">' + (cfg.tags || []).join(' ') + '</div>';
      mapC.appendChild(d);
      setTimeout(function () { renderMapThumb25D(document.getElementById(cid), cfg); }, 30);
    });
  }
}

/* ---------- 坦克 SVG 图标 ---------- */
function drawTankIconSVG(cfg, w, h) {
  var c = cfg.color || '#5d8a3c', tc = cfg.turretColor || c, ac = cfg.accentColor || c;
  var isEngineer = cfg.id === 'engineer', isMelee = cfg.id === 'melee_tank', isSiege = cfg.id === 'siege_tank';
  var isRobot = cfg.isRobot, isMissile = cfg.isMissile, isRocket = cfg.id === 'rocket_launcher', isNukeL = cfg.id === 'nuke_launcher', isNuke = cfg.isNuke;
  var isFlame = cfg.special === 'burn', isDM = cfg.special === 'dodge', isDig = cfg.special === 'dig';
  var isRepair = cfg.special === 'repair', isFire = cfg.special === 'fire_burn', isArt = cfg.special === 'artillery';
  var isNanoRepair = cfg.special === 'nano_repair', isBaseTank = cfg.isBaseTank;
  var isNano = cfg.id === 'nano_3' || cfg.id === 'nano_2' || cfg.id === 'nano_1';
  var isRobotPlus = cfg.id === 'robot_plus';

  if (isRobot) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="14" width="34" height="18" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.5"/>' +
      '<rect x="0" y="18" width="14" height="10" rx="3" fill="' + c + '" stroke="#111" stroke-width="2"/>' +
      '<circle cx="14" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="36" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<text x="25" y="26" font-size="7" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="bold">' + (isRobotPlus ? 'R+' : 'R') + '</text>' +
      (isRobotPlus ? '<circle cx="25" cy="22" r="11" fill="none" stroke="#00ffff" stroke-width="1.6" stroke-dasharray="3,2" opacity="0.85"/>' : '') +
      '</svg>';
  }
  if (isMissile) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="10" y="16" width="30" height="8" rx="4" fill="' + c + '" stroke="#111" stroke-width="2"/>' +
      '<polygon points="40,16 50,20 40,24" fill="' + ac + '" stroke="#111" stroke-width="1.5"/>' +
      '</svg>';
  }
  if (isNuke) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="25" cy="20" rx="18" ry="9" fill="#f5f5f5" stroke="#111" stroke-width="2.5"/>' +
      '<text x="22" y="20" font-size="9" fill="#d63031" text-anchor="middle" dominant-baseline="middle">☢️</text></svg>';
  }
  if (isRocket) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="14" width="34" height="18" rx="4" fill="#d63031" stroke="#111" stroke-width="2.5"/>' +
      '<rect x="0" y="18" width="14" height="10" rx="3" fill="#333" stroke="#111" stroke-width="2"/>' +
      '<circle cx="14" cy="24" r="5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="36" cy="24" r="5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<text x="25" y="25" font-size="5" fill="#fff" text-anchor="middle" dominant-baseline="middle">🚀</text></svg>';
  }
  if (isNukeL) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="16" width="34" height="16" rx="4" fill="#e67e22" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="14" cy="24" r="4.5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="34" cy="24" r="4.5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<text x="25" y="26" font-size="7" fill="#fff" text-anchor="middle" dominant-baseline="middle">☢️</text></svg>';
  }
  if (isFlame) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="20" width="34" height="14" rx="3" fill="' + c + '" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="13" cy="26" r="4" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="35" cy="26" r="4" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<path d="M34 16 L46 12 L44 17 L46 20 L34 18 Z" fill="rgba(255,160,30,.9)"/>' +
      '<path d="M35 16 L44 13 L43 16 L44 19 L35 18 Z" fill="#FFD93D"/></svg>';
  }
  if (isFire) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="14" width="42" height="20" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.8"/>' +
      '<circle cx="10" cy="26" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="40" cy="26" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<text x="25" y="22" font-size="7" fill="#fff" text-anchor="middle" dominant-baseline="middle">🔥</text></svg>';
  }
  if (isDM) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="14" width="34" height="18" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="14" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="36" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="25" cy="22" r="8" fill="' + tc + '" stroke="#111" stroke-width="1.5"/>' +
      '<text x="25" y="24" font-size="5" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="bold">D.M.</text></svg>';
  }
  if (isDig) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="12" y="18" width="30" height="12" rx="3" fill="' + c + '" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="20" cy="30" r="4" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="32" cy="30" r="4" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<polygon points="12,20 2,24 12,28" fill="' + ac + '" stroke="#111" stroke-width="1.5"/></svg>';
  }
  if (isRepair) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="14" width="34" height="18" rx="4" fill="#F0F0F0" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="14" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="36" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<rect x="23" y="17" width="4" height="10" fill="#E74C3C"/>' +
      '<rect x="20" y="20" width="10" height="4" fill="#E74C3C"/></svg>';
  }
  if (isNanoRepair) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="8" y="14" width="34" height="18" rx="4" fill="#E8E8E8" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="14" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="36" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
      '<text x="25" y="24" font-size="12" fill="#3498DB" text-anchor="middle" dominant-baseline="middle" font-weight="bold">✚</text></svg>';
  }
  if (isArt) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="6" y="16" width="38" height="18" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.8"/>' +
      '<circle cx="12" cy="27" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="38" cy="27" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<rect x="18" y="8" width="18" height="10" rx="3" fill="' + tc + '" stroke="#111" stroke-width="2"/>' +
      '<rect x="34" y="6" width="16" height="7" rx="3" fill="#252525" stroke="#111" stroke-width="2" transform="rotate(-30 34 6)"/>' +
      '<text x="25" y="22" font-size="7" fill="#fff" text-anchor="middle" dominant-baseline="middle">💥</text></svg>';
  }
  if (isBaseTank) {
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="4" y="14" width="42" height="20" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.8"/>' +
      '<rect x="-2" y="18" width="12" height="12" rx="3" fill="' + c + '" stroke="#111" stroke-width="2"/>' +
      '<circle cx="10" cy="26" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<circle cx="40" cy="26" r="5.5" fill="#222" stroke="#555" stroke-width="1.5"/>' +
      '<rect x="16" y="6" width="18" height="10" rx="3" fill="' + tc + '" stroke="#111" stroke-width="2"/>' +
      '<rect x="30" y="4" width="18" height="5" rx="2" fill="#1a1a1a" stroke="#111" stroke-width="1.5"/>' +
      '<rect x="30" y="12" width="18" height="5" rx="2" fill="#1a1a1a" stroke="#111" stroke-width="1.5"/>' +
      '<text x="25" y="26" font-size="7" fill="#fff" text-anchor="middle" dominant-baseline="middle">🏠</text></svg>';
  }
  if (isNano) {
    var lvl = cfg.nanoLevel || 1;
    var size = lvl === 3 ? 1 : lvl === 2 ? 0.85 : 0.7;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="' + ((1 - size) * 25) + '" y="' + (20 - size * 6) + '" width="' + (50 * size) + '" height="' + (12 * size) + '" rx="3" fill="' + c + '" stroke="#111" stroke-width="2.2"/>' +
      '<circle cx="' + (25 - 14 * size) + '" cy="26" r="' + (4 * size) + '" fill="#333" stroke="#555" stroke-width="1.3"/>' +
      '<circle cx="' + (25 + 14 * size) + '" cy="26" r="' + (4 * size) + '" fill="#333" stroke="#555" stroke-width="1.3"/>' +
      '<circle cx="25" cy="' + (20 - size * 2) + '" r="' + (8 * size) + '" fill="' + tc + '" stroke="#111" stroke-width="1.5"/>' +
      '<text x="25" y="' + (21 - size * 2) + '" font-size="' + (7 * size) + '" fill="#fff" text-anchor="middle" dominant-baseline="middle" font-weight="bold">N' + lvl + '</text>' +
      (lvl >= 2 ? '<circle cx="25" cy="' + (20 - size * 2) + '" r="' + (11 * size) + '" fill="none" stroke="#00ffff" stroke-width="1.4" stroke-dasharray="3,2" opacity="0.85"/>' : '') +
      '</svg>';
  }
  var extra = '';
  if (cfg.special === 'river_walker') extra += '<path d="M15 28 Q20 22 25 28 Q30 22 35 28" fill="none" stroke="#fff" stroke-width="2"/>';
  if (cfg.id === 'apocalypse') extra += '<text x="25" y="25" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="middle">💀</text>';
  if (cfg.id === 'shield_tank') extra += '<circle cx="25" cy="22" r="12" fill="none" stroke="#00ffff" stroke-width="2" stroke-dasharray="4,2" opacity="0.8"/>';
  if (isSiege) extra += '<rect x="38" y="18" width="8" height="8" rx="1" fill="#333" stroke="#555" stroke-width="1"/>';
  if (isMelee) extra += '<path d="M38 18 L46 14 L44 22 Z" fill="#888" stroke="#555" stroke-width="1"/>';
  if (isEngineer) extra += '<text x="25" y="22" font-size="8" fill="#fff" text-anchor="middle" dominant-baseline="middle">🔧</text>';
  var turret = '';
  if (!isEngineer && !isMelee && !isSiege) {
    turret = '<rect x="17" y="12" width="16" height="8" rx="3" fill="' + tc + '" stroke="#111" stroke-width="2"/>' +
      '<rect x="30" y="13" width="14" height="3" rx="1" fill="#333" stroke="#222" stroke-width="1"/>';
  }
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="8" y="14" width="34" height="18" rx="4" fill="' + c + '" stroke="#111" stroke-width="2.5"/>' +
    '<rect x="8" y="14" width="34" height="4" rx="2" fill="' + ac + '" opacity="0.5"/>' +
    '<rect x="0" y="18" width="14" height="10" rx="3" fill="' + c + '" stroke="#111" stroke-width="2"/>' +
    '<rect x="38" y="20" width="12" height="6" rx="2" fill="#444" stroke="#222" stroke-width="1.5"/>' +
    '<circle cx="14" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
    '<circle cx="36" cy="24" r="5" fill="#333" stroke="#555" stroke-width="1.5"/>' +
    turret + extra + '</svg>';
}

/* ---------- 坦克详情 ---------- */
var currentTankDetailIndex = 0;
var currentDetailList = TANK_CONFIGS;
function showTankDetail(cfg, list) {
  if (list) currentDetailList = list;
  currentTankDetailIndex = currentDetailList.indexOf(cfg);
  if (currentTankDetailIndex < 0) currentTankDetailIndex = 0;
  document.getElementById('tank-detail-icon').innerHTML = drawTankIconSVG(cfg, 120, 96);
  document.getElementById('tank-detail-name').textContent = cfg.name;
  document.getElementById('tank-detail-stats').innerHTML =
    '<div>❤ HP: ' + cfg.hp + '</div>' +
    '<div>⚡ 移速: ' + cfg.speed + ' 格' + (cfg.waterSpeed ? '（水中 ' + cfg.waterSpeed + '）' : '') + (cfg.digSpeed ? '（地底 ' + cfg.digSpeed + '）' : '') + '</div>' +
    '<div>🎯 射程: ' + (cfg.minRange ? '[' + cfg.minRange + ', ' + cfg.range + ']' : cfg.range) + ' 格</div>' +
    '<div>⚔ 攻击力: ' + cfg.attack + '</div>' +
    '<div>攻击次数: ' + cfg.attackCount + '</div>' +
    '<div>弹药: ' + getAmmoLabel(cfg.ammoType) + '</div>' +
    '<div>底盘: ' + getChassisLabel(cfg.chassisType) + '</div>' +
    '<div>重量: ' + getWeightLabel(cfg.weight) + '</div>' +
    '<div>冷却: ' + cfg.attackCooldown + ' 完整回合</div>' +
    (cfg.shield !== undefined ? '<div>🛡 护盾: ' + cfg.shield + (cfg.shieldLayers ? ' × ' + cfg.shieldLayers + ' 层' : '') + '</div>' : '') +
    (cfg.dodgeChance ? '<div>💨 闪避: ' + Math.round(cfg.dodgeChance * 100) + '%</div>' : '') +
    (cfg.healRange ? '<div>💚 治疗范围: ' + cfg.healRange + ' 格</div>' : '') +
    (cfg.selfHealAmount ? '<div>✚ 自修复: ' + cfg.selfHealAmount + '</div>' : '') +
    (cfg.deathExplosionRadius ? '<div>💥 死亡爆炸: ' + (cfg.deathExplosionRadius * 2 + 1) + '×' + (cfg.deathExplosionRadius * 2 + 1) + '</div>' : '');
  document.getElementById('tank-detail-special').textContent = cfg.special ? getSpecialDesc(cfg.special) : '无特殊词条';
  document.getElementById('tank-detail-desc').textContent = cfg.desc || '';
  openModal('modal-tank-detail');
}
function switchTankDetail(d) {
  if (!currentDetailList.length) return;
  currentTankDetailIndex = (currentTankDetailIndex + d + currentDetailList.length) % currentDetailList.length;
  showTankDetail(currentDetailList[currentTankDetailIndex]);
}