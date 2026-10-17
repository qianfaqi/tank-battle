/* ============================================================
   坦克大战 - 常量配置文件
   ★ 只放"配置数据"，不放函数
   ★ 加载顺序：config.js → core.js → auth.js → render.js → ai.js
                → game.js → campaign.js → pokedex.js → router.js
============================================================ */

/* ---------- 0. 中文字体栈（render.js / game.js 等大量使用） ---------- */
var CJK_FONT = '"PingFang SC","Hiragino Sans GB","Heiti SC","Microsoft YaHei","WenQuanYi Micro Hei","Noto Sans CJK SC","Source Han Sans SC","Segoe UI",sans-serif';
var CJK_FONT_BOLD = 'bold ' + CJK_FONT;

/* ---------- 1. 单位配置 ---------- */
var ENGINEER_TANK = {
  id:'engineer', name:'工程师坦克Ⅰ型', hp:1.5, speed:2, range:0, attack:0, weight:'standard',
  special:'builder', color:'#ff9900', turretColor:'#cc7a00', accentColor:'#ffc266',
  attackCount:0, attackCooldown:0, buildCount:3, buildCooldown:3, robotLimit:5,
  ammoType:'none', chassisType:'tracked', desc:'人海战术，建造机器人'
};
var ROBOT = {
  id:'robot', name:'机器人', hp:0.5, speed:2, range:1, attack:1, weight:'light',
  special:null, color:'#00cccc', turretColor:'#009999', accentColor:'#66e8e8',
  attackCount:1, attackCooldown:0, isRobot:true,
  ammoType:'melee', chassisType:'special', desc:'小型作战单位'
};
var ROBOT_PLUS = {
  id:'robot_plus', name:'机器人加强型', hp:0.5, speed:4, range:1, attack:1, weight:'light',
  special:null, color:'#00cccc', turretColor:'#009999', accentColor:'#66e8e8',
  attackCount:1, attackCooldown:0, isRobot:true, shield:0.5, shieldLayers:2,
  ammoType:'melee', chassisType:'special', desc:'高速作战单位，两层护盾各 0.5'
};
var ROCKET_LAUNCHER = {
  id:'rocket_launcher', name:'火箭发射车', hp:2.5, speed:2, range:0, attack:0, weight:'standard',
  special:'rocket_builder', color:'#d63031', turretColor:'#a02020', accentColor:'#ff8888',
  attackCount:0, attackCooldown:0, buildCount:1, buildCooldown:2, rocketLimit:3,
  ammoType:'none', chassisType:'wheeled', desc:'发射导弹，远程轰炸'
};
var MISSILE = {
  id:'missile', name:'导弹', hp:1, speed:2, range:0, attack:1.5, weight:'standard',
  special:'self_destruct', color:'#aaaaaa', turretColor:'#888888', accentColor:'#dddddd',
  attackCount:1, attackCooldown:0, isMissile:true,
  ammoType:'none', chassisType:'special', desc:'自爆攻击 3×3 范围'
};
var NUKE_LAUNCHER = {
  id:'nuke_launcher', name:'核弹发射车', hp:2, speed:1, range:0, attack:0, weight:'heavy',
  special:'nuke_builder', color:'#e67e22', turretColor:'#7f8c8d', accentColor:'#95a5a6',
  attackCount:0, attackCooldown:0, buildCount:1, buildCooldown:3, nukeLimit:1,
  isNukeLauncher:true, immuneRadiation:true,
  ammoType:'none', chassisType:'tracked', desc:'发射核弹，附带辐射场，无炮塔'
};
var NUKE = {
  id:'nuke', name:'核弹', hp:2, speed:2, range:0, attack:0, weight:'standard',
  special:'auto_fly', color:'#ffffff', turretColor:'#cccccc', accentColor:'#ffffff',
  attackCount:0, attackCooldown:0, isNuke:true,
  ammoType:'none', chassisType:'special', desc:'自动飞行，爆炸 5×5，留下辐射场'
};
var FLAME_TANK = {
  id:'flame_tank', name:'烈焰战车', hp:3, speed:2, range:3, attack:0.5, weight:'standard',
  special:'burn', color:'#8B1A1A', turretColor:'#E67E22', accentColor:'#FF6B00',
  attackCount:1, attackCooldown:1, ammoType:'flame', chassisType:'tracked',
  desc:'喷火，火焰有灼烧效果'
};
var DM_CAR = {
  id:'dm_car', name:'D.M.型装甲车', hp:1.5, speed:2, range:4, attack:0.5, weight:'light',
  special:'dodge', color:'#8e44ad', turretColor:'#8e44ad', accentColor:'#b875d6',
  attackCount:2, attackCooldown:0, ammoType:'bullet', chassisType:'wheeled',
  dodgeChance:0.5, desc:'受到伤害的miss概率为50%'
};
var DIGGER_CAR = {
  id:'digger_car', name:'钻地车', hp:2, speed:2, range:1, attack:1, weight:'light',
  special:'dig', color:'#5C3A21', turretColor:'#3D2418', accentColor:'#8B6F47',
  attackCount:1, attackCooldown:0, ammoType:'melee', chassisType:'wheeled',
  digSpeed:4, digMaxSteps:0, desc:'钻地：花一回合钻入地底'
};
var REPAIR_TANK = {
  id:'repair_tank', name:'维修坦克', hp:3, speed:2, range:0, attack:0.5, weight:'standard',
  special:'repair', color:'#FFFFFF', turretColor:'#FFFFFF', accentColor:'#E74C3C',
  attackCount:1, attackCooldown:0, ammoType:'bullet', chassisType:'tracked',
  healRange:2, healAmount:0.5, desc:'5×5范围治疗友军0.5或攻击敌人0.5'
};
var FIRE_TANK = {
  id:'fire_tank', name:'焚火战车', hp:10, speed:1, range:3, attack:0.5, weight:'super_heavy',
  special:'fire_burn', color:'#c0392b', turretColor:'#c0392b', accentColor:'#1a1a1a',
  attackCount:1, attackCooldown:2, ammoType:'flame', chassisType:'tracked',
  emoji:'🔥', selfBurnPerTurn:0.5,
  deathExplosionRadius:2, deathExplosionDamage:2, deathExplosionBurnTurns:2,
  desc:'烈焰战车Promax，点燃一切，包括自己'
};
var NANO_3 = {
  id:'nano_3', name:'纳米分裂战车', hp:0.5, speed:1, range:3, attack:1, weight:'standard',
  special:'nano_split', color:'#00cccc', turretColor:'#009999', accentColor:'#66eeee',
  attackCount:1, attackCooldown:0, shield:0.5, ammoType:'bullet', chassisType:'wheeled',
  nanoLevel:3, nanoNextId:'nano_2', desc:'护盾破碎时分裂为2辆2阶纳米分裂车'
};
var NANO_2 = {
  id:'nano_2', name:'纳米分裂车II', hp:0.5, speed:2, range:2, attack:0.5, weight:'light',
  special:'nano_split', color:'#33dddd', turretColor:'#22bbbb', accentColor:'#88eeee',
  attackCount:1, attackCooldown:0, shield:0.5, ammoType:'bullet', chassisType:'wheeled',
  nanoLevel:2, nanoNextId:'nano_1', desc:'护盾破碎时分裂为2辆1阶纳米分裂车'
};
var NANO_1 = {
  id:'nano_1', name:'纳米分裂车I', hp:0.5, speed:2, range:1, attack:0.5, weight:'light',
  special:null, color:'#66eeee', turretColor:'#44cccc', accentColor:'#aaeeee',
  attackCount:1, attackCooldown:0, ammoType:'bullet', chassisType:'wheeled',
  nanoLevel:1, desc:'最终形态，无护盾，不可分裂'
};
var ARTILLERY_TANK = {
  id:'artillery_tank', name:'巨炮坦克I型', hp:4, speed:1, range:5, minRange:2, attack:2, weight:'heavy',
  special:'artillery', color:'#4a4a52', turretColor:'#5a5a62', accentColor:'#ff8844',
  attackCount:1, attackCooldown:2, ammoType:'artillery', chassisType:'tracked',
  artilleryRadius:1, artilleryCenterDamage:1, artilleryEdgeDamage:0.5,
  desc:'抛射大炮弹，8方向直线，3×3范围伤害'
};
var NANO_REPAIR = {
  id:'nano_repair', name:'纳米自动修复坦克', hp:2, speed:2, range:5, attack:0.5, weight:'standard',
  special:'nano_repair', color:'#E8E8E8', turretColor:'#FFFFFF', accentColor:'#3498DB',
  attackCount:1, attackCooldown:0, ammoType:'bullet', chassisType:'tracked',
  selfHealAmount:0.5, desc:'原地不动时回合结束回复0.5血'
};
var BASE_TANK = {
  id:'base_tank', name:'基地坦克', hp:6, speed:1, range:4, attack:2, weight:'super_heavy',
  special:'base_tank', color:'#e94560', turretColor:'#b03340', accentColor:'#f0c040',
  attackCount:1, attackCooldown:2, ammoType:'shell', chassisType:'tracked',
  isBaseTank:true, immuneRadiation:true, nukeDamageOverride:3,
  desc:'出生即为基地，死亡则游戏结束'
};

var TANK_CONFIGS = [
  { id:'basic', name:'普通坦克', hp:3, speed:2, range:5, attack:1, weight:'standard', special:null,
    color:'#5d8a3c', attackCount:1, attackCooldown:0, ammoType:'shell', chassisType:'tracked',
    desc:'数值均衡', turretColor:'#4a6e30', accentColor:'#8ab85c' },
  { id:'water_ghost', name:'水陆两栖战车', hp:2, speed:1, range:3, attack:1, weight:'standard',
    special:'river_walker', color:'#3a7cc3', attackCount:1, attackCooldown:0,
    ammoType:'bullet', chassisType:'amphibious', waterSpeed:3,
    desc:'我会游水，水中攻击+1', turretColor:'#2e6aa5', accentColor:'#6db3e0' },
  { id:'fast_tank', name:'快速坦克', hp:1.5, speed:4, range:4, attack:1, weight:'light', special:null,
    color:'#d4a017', attackCount:1, attackCooldown:0, ammoType:'shell', chassisType:'tracked',
    desc:'速度很快', turretColor:'#b88710', accentColor:'#e8c84a' },
  { id:'armored_car', name:'装甲车', hp:2, speed:2, range:4, attack:0.5, weight:'standard',
    special:'multi_attack', color:'#8e44ad', attackCount:3, attackCooldown:0,
    ammoType:'bullet', chassisType:'wheeled',
    desc:'一梭三发', turretColor:'#723a8a', accentColor:'#b875d6' },
  DM_CAR,
  { id:'heavy_tank', name:'重型坦克', hp:4, speed:1, range:5, attack:2, weight:'heavy', special:null,
    color:'#8B4513', attackCount:1, attackCooldown:1, ammoType:'shell', chassisType:'tracked',
    desc:'坚固前排', turretColor:'#6e3710', accentColor:'#c47a3a' },
  { id:'apocalypse', name:'天启坦克', hp:2, speed:1, range:4, attack:999, weight:'standard',
    special:'straight_only', color:'#ff3300', attackCount:1, attackCooldown:2,
    ammoType:'shell', chassisType:'tracked',
    desc:'一炮带走', turretColor:'#cc2800', accentColor:'#ff9966' },
  { id:'shield_tank', name:'护盾车', hp:2, speed:2, range:4, attack:0.5, weight:'standard',
    special:'shield', color:'#7f8c8d', attackCount:2, attackCooldown:0, shield:0.5,
    ammoType:'bullet', chassisType:'wheeled',
    desc:'护盾抵挡（可挡一次核弹）', turretColor:'#687677', accentColor:'#a8b5b6' },
  { id:'siege_tank', name:'攻城车', hp:5, speed:1, range:1, attack:3, weight:'heavy',
    special:'siege', color:'#bdc3c7', attackCount:1, attackCooldown:2,
    ammoType:'melee', chassisType:'tracked',
    desc:'对基地与地形伤害×2', turretColor:'#9aa0a3', accentColor:'#d5dadd' },
  { id:'super_heavy', name:'超重型坦克', hp:6.5, speed:1, range:3, attack:0.5, weight:'super_heavy', special:null,
    color:'#2c3e50', attackCount:1, attackCooldown:0,
    ammoType:'shell', chassisType:'tracked',
    desc:'碾压一切', turretColor:'#1f2d3a', accentColor:'#54708a' },
  { id:'melee_tank', name:'近战坦克', hp:3, speed:3, range:1, attack:2, weight:'light', special:null,
    color:'#16A085', attackCount:1, attackCooldown:0,
    ammoType:'melee', chassisType:'tracked',
    desc:'坦克拼刺刀', turretColor:'#0e7862', accentColor:'#5cc8b0' },
  FLAME_TANK, DIGGER_CAR, REPAIR_TANK,
  ENGINEER_TANK, ROCKET_LAUNCHER, NUKE_LAUNCHER,
  FIRE_TANK,
  NANO_3, NANO_2, NANO_1,
  ROBOT_PLUS,
  ARTILLERY_TANK,
  NANO_REPAIR,
  BASE_TANK
];

var DERIVATIVE_TANK_IDS = new Set([
  'robot', 'robot_plus',
  'missile', 'nuke',
  'nano_3', 'nano_2', 'nano_1'
]);

var DEF_BUILDINGS = {
  mg_bunker: {
    id:'mg_bunker', name:'机枪堡垒', short:'机枪堡', icon:'🔫',
    hp:2, range:3, attack:0.5, shotsPerTurn:2, turretStyle:'mg',
    palette:['#8a8a92','#5f5f68','#3a3a42'],
    desc:'射程3 · 攻击0.5×2 · 单格'
  },
  mortar: {
    id:'mortar', name:'自行迫击炮', short:'迫击炮', icon:'💣',
    hp:2, range:4, attack:0.5, shotsPerTurn:1, turretStyle:'mortar',
    palette:['#a8855a','#6a4a2a','#3a2818'],
    desc:'射程4 · 3×3抛射 · 无视遮挡'
  },
  at_gun: {
    id:'at_gun', name:'自行反坦克炮', short:'反坦克', icon:'🎯',
    hp:2, range:5, attack:1, shotsPerTurn:1, turretStyle:'at',
    palette:['#6a7a8a','#3a4a5a','#1a2a3a'],
    desc:'射程5 · 攻击1 · 单格直射'
  },
  nuke_silo: {
    id:'nuke_silo', name:'核弹发射井', short:'核弹井', icon:'☢️',
    hp:3, range:0, attack:0, shotsPerTurn:0, turretStyle:'nuke',
    palette:['#f0a050','#c06020','#6a3010'],
    desc:'发射核弹 · CD 4'
  }
};
var DEF_BUILDING_IDS = new Set(Object.keys(DEF_BUILDINGS));

/* ---------- 2. 地图配置 ---------- */
var MAP_CONFIGS = [
  { id:'position_zero', name:'0号阵地', rows:10, cols:7, tags:['⚖️ 平衡','🌊 水战'],
    specialTerrain:[
      {pos:'A2',type:'base_red'},{pos:'A4',type:'base_red'},{pos:'A6',type:'base_red'},
      {pos:'J2',type:'base_blue'},{pos:'J4',type:'base_blue'},{pos:'J6',type:'base_blue'},
      {pos:'C2',type:'obstacle'},{pos:'H6',type:'obstacle'},
      {pos:'D6',type:'jump_pad'},{pos:'G2',type:'jump_pad'},
      {pos:'E4',type:'bridge'},{pos:'F4',type:'bridge'}],
    riverRanges:[{rowStart:'E',rowEnd:'F',colStart:1,colEnd:7}] },

  { id:'crossroads', name:'十字路口', rows:10, cols:8, tags:['🗺️ 复杂','🎯 跳板'],
    specialTerrain:[
      {pos:'A2',type:'base_red'},{pos:'J7',type:'base_blue'},
      {pos:'G2',type:'jump_pad'},{pos:'D7',type:'jump_pad'},
      {pos:'C2',type:'obstacle'},{pos:'C6',type:'obstacle'},{pos:'H3',type:'obstacle'},{pos:'H7',type:'obstacle'},
      {pos:'E4',type:'bridge'},{pos:'E5',type:'bridge'},{pos:'F4',type:'bridge'},{pos:'F5',type:'bridge'},
      {pos:'E1',type:'bridge'},{pos:'F1',type:'bridge'},{pos:'B4',type:'bridge'},{pos:'B5',type:'bridge'},
      {pos:'E8',type:'bridge'},{pos:'F8',type:'bridge'},{pos:'I4',type:'bridge'},{pos:'I5',type:'bridge'}],
    riverRanges:[
      {rowStart:'E',rowEnd:'F',colStart:2,colEnd:3},{rowStart:'E',rowEnd:'F',colStart:6,colEnd:7},
      {rowStart:'C',rowEnd:'D',colStart:4,colEnd:5},{rowStart:'G',rowEnd:'H',colStart:4,colEnd:5},
      {rowStart:'A',rowEnd:'A',colStart:4,colEnd:5},{rowStart:'J',rowEnd:'J',colStart:4,colEnd:5}] },

  { id:'chu_han', name:'楚河汉界', rows:12, cols:8, tags:['🌊 水战','🎯 跳板'],
    specialTerrain:[
      {pos:'A2',type:'base_red'},{pos:'L7',type:'base_blue'},
      {pos:'C1',type:'obstacle'},{pos:'F2',type:'obstacle'},{pos:'I3',type:'obstacle'},
      {pos:'D6',type:'obstacle'},{pos:'G7',type:'obstacle'},{pos:'K8',type:'obstacle'},
      {pos:'E4',type:'bridge'},{pos:'E5',type:'bridge'},{pos:'H4',type:'bridge'},{pos:'H5',type:'bridge'},
      {pos:'C3',type:'jump_pad'},{pos:'B7',type:'jump_pad'},{pos:'J6',type:'jump_pad'},{pos:'K2',type:'jump_pad'},
      {pos:'E1',type:'jump_pad'},{pos:'H8',type:'jump_pad'},
      {pos:'A4',type:'bridge'},{pos:'A5',type:'bridge'},{pos:'L4',type:'bridge'},{pos:'L5',type:'bridge'}],
    riverRanges:[
      {rowStart:'A',rowEnd:'D',colStart:4,colEnd:5},
      {rowStart:'F',rowEnd:'G',colStart:4,colEnd:5},
      {rowStart:'I',rowEnd:'L',colStart:4,colEnd:5}] },

  { id:'twin_rivers', name:'双河对峙', rows:10, cols:8, tags:['🌊 水战','🎯 跳板'],
    specialTerrain:[
      {pos:'A2',type:'base_red'},{pos:'A4',type:'base_red'},{pos:'A6',type:'base_red'},
      {pos:'J2',type:'base_blue'},{pos:'J4',type:'base_blue'},{pos:'J6',type:'base_blue'},
      {pos:'C3',type:'bridge'},{pos:'C6',type:'bridge'},{pos:'D3',type:'bridge'},{pos:'D6',type:'bridge'},
      {pos:'G3',type:'bridge'},{pos:'G6',type:'bridge'},{pos:'H3',type:'bridge'},{pos:'H6',type:'bridge'},
      {pos:'B7',type:'jump_pad'},{pos:'I2',type:'jump_pad'}],
    riverRanges:[
      {rowStart:'C',rowEnd:'D',colStart:1,colEnd:8},
      {rowStart:'G',rowEnd:'H',colStart:1,colEnd:8}] },

  { id:'island', name:'孤岛', rows:10, cols:9, tags:['🌊 水战','🗺️ 复杂'],
    specialTerrain:[
      {pos:'A2',type:'base_red'},{pos:'A4',type:'base_red'},{pos:'A6',type:'base_red'},
      {pos:'J4',type:'base_blue'},{pos:'J6',type:'base_blue'},{pos:'J8',type:'base_blue'},
      {pos:'C1',type:'obstacle'},{pos:'C9',type:'obstacle'},{pos:'H1',type:'obstacle'},{pos:'H9',type:'obstacle'},
      {pos:'D3',type:'bridge'},{pos:'E3',type:'bridge'},{pos:'F3',type:'bridge'},{pos:'G3',type:'bridge'},
      {pos:'D6',type:'bridge'},{pos:'E6',type:'bridge'},{pos:'F6',type:'bridge'},{pos:'G6',type:'bridge'},
      {pos:'B4',type:'jump_pad'},{pos:'I6',type:'jump_pad'}],
    riverRanges:[{rowStart:'D',rowEnd:'G',colStart:3,colEnd:6}] },

  { id:'stone_field', name:'石阵', rows:10, cols:9, tags:['🏰 攻坚','🗺️ 复杂'],
    specialTerrain:[
      {pos:'A1',type:'base_red'},{pos:'A2',type:'base_red'},{pos:'A3',type:'base_red'},
      {pos:'J7',type:'base_blue'},{pos:'J8',type:'base_blue'},{pos:'J9',type:'base_blue'},
      {pos:'C2',type:'obstacle'},{pos:'C8',type:'obstacle'},{pos:'E2',type:'obstacle'},{pos:'E8',type:'obstacle'},
      {pos:'G2',type:'obstacle'},{pos:'G8',type:'obstacle'},{pos:'H4',type:'obstacle'},{pos:'H6',type:'obstacle'},
      {pos:'B5',type:'obstacle'},{pos:'I5',type:'obstacle'},
      {pos:'D4',type:'bridge'},{pos:'D5',type:'bridge'},{pos:'D6',type:'bridge'},
      {pos:'F4',type:'bridge'},{pos:'F5',type:'bridge'},{pos:'F6',type:'bridge'}],
    riverRanges:[{rowStart:'C',rowEnd:'G',colStart:4,colEnd:6}] }
];

var JUMP_PAIRS = {
  'G2':'D2','D7':'G7','C3':'C6','B7':'F7','J6':'J3','K2':'G2','D6':'G6','E1':'H1','H8':'E8',
  'I2':'B2','B4':'I6','I6':'B4'
};

var CAMPAIGN_ONLY_MAP_IDS = new Set(['dawn1', 'xijiao']);

/* ---------- 3. 战役专用地图（必须 push 到 MAP_CONFIGS） ---------- */
var CAMPAIGN_EXTRA_MAPS = [
  { id:'dawn1', name:'阵地西郊', rows:10, cols:7, tags:['🏰 攻坚'],
    specialTerrain:[
      {pos:'A4',type:'base_red',skin:'bunker'},{pos:'B2',type:'at_gun',team:'red'},{pos:'B6',type:'at_gun',team:'red'},
      {pos:'C1',type:'obstacle'},{pos:'C7',type:'obstacle'},{pos:'D1',type:'jump_pad'},{pos:'D2',type:'obstacle'},
      {pos:'D4',type:'mortar',team:'red'},{pos:'D6',type:'obstacle'},{pos:'D7',type:'jump_pad'},
      {pos:'E4',type:'obstacle'},{pos:'F4',type:'mg_bunker',team:'red'},
      {pos:'G2',type:'obstacle'},{pos:'G4',type:'obstacle'},{pos:'G6',type:'obstacle'},
      {pos:'H3',type:'jump_pad'},{pos:'H5',type:'jump_pad'},
      {pos:'J2',type:'spawn_blue',tank:'fast_tank'},{pos:'J4',type:'spawn_blue',tank:'fast_tank'},{pos:'J6',type:'spawn_blue',tank:'fast_tank'}
    ], riverRanges:[] },
  { id:'xijiao', name:'西郊林地', rows:10, cols:7, tags:['🏰 攻坚'],
    specialTerrain:[
      {pos:'A1',type:'spawn_red'},{pos:'A3',type:'spawn_red'},{pos:'A5',type:'spawn_red'},{pos:'A7',type:'spawn_red'},
      {pos:'B2',type:'spawn_red'},{pos:'B4',type:'spawn_red'},{pos:'B6',type:'spawn_red'},
      {pos:'C2',type:'jump_pad'},{pos:'C3',type:'spawn_red'},{pos:'C5',type:'spawn_red'},{pos:'C6',type:'jump_pad'},
      {pos:'D4',type:'spawn_red'},{pos:'E4',type:'jump_pad'},
      {pos:'F1',type:'obstacle'},{pos:'F3',type:'obstacle'},{pos:'F4',type:'at_gun',team:'blue'},{pos:'F5',type:'obstacle'},{pos:'F7',type:'obstacle'},
      {pos:'G4',type:'obstacle'},{pos:'H2',type:'obstacle'},{pos:'H6',type:'obstacle'},
      {pos:'I2',type:'mortar',team:'blue'},{pos:'I6',type:'mortar',team:'blue'},
      {pos:'J1',type:'spawn_blue'},{pos:'J3',type:'spawn_blue'},{pos:'J4',type:'base_blue',skin:'hq'},
      {pos:'J5',type:'spawn_blue'},{pos:'J7',type:'spawn_blue'}
    ], riverRanges:[] }
];
CAMPAIGN_EXTRA_MAPS.forEach(function(m) {
  if (!MAP_CONFIGS.find(function(x) { return x.id === m.id; })) MAP_CONFIGS.push(m);
});

/* ---------- 4. 用户系统常量 ---------- */
var INITIAL_TANKS = ['basic', 'armored_car'];

var CAMPAIGN_TANK_UNLOCK = {
  'basic': 0,
  'armored_car': 0,
  'water_ghost': 1,
  'fast_tank': 2,
  'heavy_tank': 3,
  'siege_tank': 3,
  'artillery_tank': 4,
  'apocalypse': 5
};

var CAMPAIGN_DEF_UNLOCK = { mg_bunker:2, mortar:2, at_gun:2 };

var TANK_RARITY = {
  basic: 1, armored_car: 1,
  water_ghost: 2, fast_tank: 2,
  heavy_tank: 3, shield_tank: 3, melee_tank: 3,
  siege_tank: 4, dm_car: 4, repair_tank: 4,
  flame_tank: 5, digger_car: 5, engineer: 5, rocket_launcher: 5,
  super_heavy: 6, artillery_tank: 6, nano_3: 6, nano_repair: 6,
  apocalypse: 7, nuke_launcher: 7,
  fire_tank: 8, robot_plus: 8, nano_2: 8, nano_1: 8,
  base_tank: 9
};

var CampaignProgress = {
  key: 'tank_campaign_v2',
  data: { unlocked: 1, cleared: [] },
  load: function () {
    try {
      var s = localStorage.getItem(this.key);
      if (s) {
        var d = JSON.parse(s);
        if (d && typeof d.unlocked === 'number') {
          this.data = { unlocked: d.unlocked || 1, cleared: Array.isArray(d.cleared) ? d.cleared : [] };
        }
      }
    } catch (e) {}
    var fixUnlocked = 1;
    (this.data.cleared || []).forEach(function (c, i) { if (c) fixUnlocked = Math.max(fixUnlocked, i + 2); });
    if (this.data.unlocked < fixUnlocked) this.data.unlocked = fixUnlocked;
    if (this.data.unlocked > 5) this.data.unlocked = 5;
  },
  save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
  isUnlocked: function (i) { return i < this.data.unlocked; },
  isCleared: function (i) { return !!this.data.cleared[i]; },
  isCampaignTankUnlocked: function (id) {
    var at = CAMPAIGN_TANK_UNLOCK[id];
    if (at === undefined) return false;
    if (at === 0) return true;
    return !!this.data.cleared[at - 1];
  },
  isDefenseUnlocked: function (id) {
    var at = CAMPAIGN_DEF_UNLOCK[id];
    if (at === undefined) return false;
    return !!this.data.cleared[at - 1];
  },
  markCleared: function (i) {
    while (this.data.cleared.length <= i) this.data.cleared.push(false);
    this.data.cleared[i] = true;
    if (this.data.unlocked < i + 2) this.data.unlocked = i + 2;
    if (this.data.unlocked > 5) this.data.unlocked = 5;
    this.save();
  }
};
CampaignProgress.load();

/* ---------- 5. 战役关卡 ---------- */
var CAMPAIGN_LEVELS = [
  {
    id:'camp_01', name:'最后的防线', subtitle:'第一关 · 防御战 · 新手教程',
    type:'defense', mapId:'position_zero', playerTeam:'blue', enemyTeam:'red',
    isTutorial:true, tutorial:1,
    brief:['🎯 目标：守住 0 号阵地','🏆 获胜：消灭所有红方单位','💀 失败：蓝方基地被摧毁'],
    intro:[
      {speaker:'谭雅',text:'（电流杂音）指挥官，通讯……终于恢复了。'},
      {speaker:'谭雅',text:'红方突破了我们三条防线，前线指挥部已经沦陷。'},
      {speaker:'谭雅',text:'各级指挥官……几乎全部阵亡。'},
      {speaker:'谭雅',text:'现在，只剩下 0 号阵地——蓝方最后的基地。'},
      {speaker:'谭雅',text:'红方先头部队正在推进，预计很快抵达。'},
      {speaker:'谭雅',text:'您是现在蓝方最高级别的指挥官。请下令吧，长官。'},
      {speaker:'谭雅',text:'守住基地，就是守住蓝方的希望。'}
    ],
    victory:[
      {speaker:'谭雅',text:'（长长呼气）敌人……撤退了。'},
      {speaker:'谭雅',text:'我们守住了。指挥官，您……做到了。'},
      {speaker:'谭雅',text:'很荣幸为您提供战场指导，您已经是一名优秀的指挥官，您将带领我方走向胜利！'}
    ],
    defeat:[
      {speaker:'谭雅',text:'基地……被摧毁了。'},
      {speaker:'谭雅',text:'对不起，指挥官。是我的失职。'},
      {speaker:'谭雅',text:'请……请重新下令。我们还有机会。'}
    ],
    playerInitial:[
      {tank:'basic',pos:'I4'},
      {tank:'armored_car',pos:'J2'},
      {tank:'armored_car',pos:'J6'}
    ],
    waves:[
      {turn:1,spawns:[{tank:'basic',pos:'A4'}]},
      {turn:3,spawns:[{tank:'armored_car',pos:'A2'},{tank:'armored_car',pos:'A6'}]}
    ],
    reinforcements:[]
  },
  {
    id:'camp_02', name:'突破', subtitle:'第二关 · 攻坚战 · 新手教程',
    type:'attack', mapId:'position_zero', playerTeam:'blue', enemyTeam:'red',
    isTutorial:true, tutorial:2, baseTankSelect:true,
    brief:['🎯 目标：摧毁红方基地 A4','🏆 获胜：红方基地被摧毁','💀 失败：蓝方基地 J4 被摧毁','⚠️ 桥和障碍可被破坏'],
    intro:[
      {speaker:'谭雅',text:'非常荣幸能与您再次合作。这些该死的敌人竟然没有被您出色的指挥吓退，他们似乎在河对岸修筑了基地，准备反攻。'},
      {speaker:'谭雅',text:'让他们见识见识咱们的厉害吧。'},
      {speaker:'谭雅',text:'您上一次的战斗已经为我们恢复后勤积攒了充分的时间，现在可以从您的车库选择一辆坦克出战了。'}
    ],
    afterSelect:[
      {speaker:'谭雅',text:'不错的选择，指挥官。'},
      {speaker:'谭雅',text:'对了，后方给我们调来了一批新家伙——两栖战车。它们能直接趟过河流，在水里的攻击力还会更强。'},
      {speaker:'谭雅',text:'这次突破行动，它们会是主力。'}
    ],
    victory:[
      {speaker:'谭雅',text:'（长长呼气）敌方基地……炸开了。'},
      {speaker:'谭雅',text:'指挥官，恭喜您——突破成功。红方的桥头堡被彻底拔除，我们终于把战线推回去了。'},
      {speaker:'谭雅',text:'这仗打得太漂亮了。您指挥的每一辆坦克，都值得这枚勋章。'},
      {speaker:'谭雅',text:'（轻声）不过……红方这次退得太快了。我总觉得，后面还有更大的动作。请您随时待命，指挥官。'}
    ],
    defeat:[
      {speaker:'谭雅',text:'基地……被摧毁了。'},
      {speaker:'谭雅',text:'对不起，指挥官，是我的判断失误。'},
      {speaker:'谭雅',text:'请您重新下令吧——我们还有机会，蓝方不能在这里倒下。'}
    ],
    playerInitial:[],
    waves:[{turn:4,spawns:[{tank:'basic',pos:'A2'},{tank:'basic',pos:'A6'}]}],
    reinforcements:[{turn:2,spawns:[{tank:'water_ghost',pos:'J3'},{tank:'water_ghost',pos:'J5'}]}]
  },
  {
    id:'camp_03', name:'黎明行动Ⅰ', subtitle:'第三关 · 侦查任务',
    type:'scouting', mapId:'dawn1', playerTeam:'blue', enemyTeam:'red',
    isTutorial:true, tutorial:3,
    brief:['🎯 目标：点亮所有战争迷雾','🏆 获胜：地图全部照亮','💀 失败：所有快速坦克阵亡','⚠️ 快速坦克装甲薄弱，请避免交火'],
    intro:[
      {speaker:'谭雅',text:'（战场画面已切换）我军的雷达目前损坏，无法获知敌方在我方阵地周围部署情况。'},
      {speaker:'谭雅',text:'战场烟雾弥漫，后方为您调配了三辆快速坦克，请您操控他们为我们摸清敌情，清除黑雾。'}
    ],
    victory:[
      {speaker:'谭雅',text:'侦查任务完成！'},
      {speaker:'谭雅',text:'谢谢您，指挥官。有了这份情报，我们就能给红方一个"惊喜"了。'},
      {speaker:'谭雅',text:'稍作休整，准备下一次行动。'}
    ],
    defeat:[
      {speaker:'谭雅',text:'快速坦克全部损失了……'},
      {speaker:'谭雅',text:'情报没拿到，我们还得再试一次。'}
    ],
    playerInitial:[
      {tank:'fast_tank',pos:'J2'},
      {tank:'fast_tank',pos:'J4'},
      {tank:'fast_tank',pos:'J6'}
    ],
    waves:[],reinforcements:[]
  },
  {
    id:'camp_04', name:'黎明行动Ⅱ', subtitle:'第四关 · 攻坚战',
    type:'attack', mapId:'position_zero', playerTeam:'blue', enemyTeam:'red',
    isTutorial:false,
    brief:[
      '🎯 目标：摧毁敌方所有建筑与基地',
      '🏰 敌方工事：机枪堡 ×1、迫击炮 ×1、反坦克炮 ×2、基地 ×1',
      '🚚 增援：第 1、4 回合各抵达一批重装部队',
      '💥 攻城车对建筑与地形伤害 ×2'
    ],
    intro:[
      {speaker:'谭雅',text:'您优异的指挥才能已经获得了总部的高度重视，但由于其他战线现在仍存在压力，总部无法抽调充分的坦克力量。'},
      {speaker:'谭雅',text:'但不用担心，我还是已为您调遣了一支强大的重装部队，他们在战斗结束后会加入您的麾下。'},
      {speaker:'谭雅',text:'攻城车是强大的近战单位，对建筑和地形能造成2倍伤害，是您的清图利器。'},
      {speaker:'谭雅',text:'重型坦克火力强大，装甲厚重，适合用来进行大规模的攻坚战。'},
      {speaker:'谭雅',text:'祝，旗开得胜。'}
    ],
    victory:[
      {speaker:'谭雅',text:'漂亮！指挥官，敌方的防御工事在您的重装部队面前不堪一击。'},
      {speaker:'谭雅',text:'攻城车和重型坦克的表现果然没有让您失望，这支部队今后就正式归入您的麾下了。'},
      {speaker:'谭雅',text:'稍等长官，总部来电……'},
      {speaker:'谭雅',text:'总部对您的表现非常满意，接下来还有更艰巨的任务在等着您。'}
    ],
    defeat:[
      {speaker:'谭雅',text:'进攻受挫，我们的重装部队损失惨重……'},
      {speaker:'谭雅',text:'别灰心，指挥官。红方的工事比我们预想的要坚固，调整部署，再来一次！'}
    ],
    playerInitial:[],waves:[],
    reinforcements:[
      {turn:1,spawns:[{tank:'heavy_tank',pos:'J2'},{tank:'heavy_tank',pos:'J6'},{tank:'siege_tank',pos:'J4'}]},
      {turn:4,spawns:[{tank:'siege_tank',pos:'J4'},{tank:'heavy_tank',pos:'J2'},{tank:'heavy_tank',pos:'J6'}]}
    ]
  },
  {
    id:'camp_05', name:'黎明行动Ⅲ', subtitle:'第五关 · 防卫战',
    type:'defense', mapId:'xijiao', playerTeam:'blue', enemyTeam:'red',
    isTutorial:false, baseTankSelect:true,
    brief:['🎯 目标：守住基地，直到援军到来','🏰 敌方波次：第 2 / 4 / 6 / 8 回合各一批（红方双倍出怪）','🚚 援军：第 5 回合抵达（谭雅 + 巨炮坦克 + 装甲车）','⚠️ 基地被摧毁即任务失败'],
    intro:[
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'咳，咳~，我是西利上校，接下来由我指挥阵地防守，完成战斗。'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'我们在上个任务将敌方阵地攻破后，把这里改造成了坚固的防线。真不知道上级为什么要我领导你这么个新兵蛋子。'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'什么，你问谭雅？她上次未经允许私自调遣部队，现已革职接受调查。'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'好了，战场上得听我的，别给我乱来。要不是我那天大意了，怎么会让红军推到0号阵地，现在又要让我们……'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'——（远处传来火炮声）'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'我*，敌人来了，你还在干什么？准备防守，你的重装部队先给我用一用。'}
    ],
    victory:[
      {speaker:'谭雅',role:'蓝方前线副官',text:'好险，指挥官。谭雅向您报道。'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'哼……算你还有点本事，新兵。'},
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'基地守住了，援军也到了。这一仗打得……勉强合格。'},
      {speaker:'谭雅',role:'蓝方前线副官',text:'西利上校，总部已经恢复了我的职务。接下来的行动，由我和指挥官一起执行。'},
      {speaker:'谭雅',role:'蓝方前线副官',text:'指挥官，真正的反攻才刚刚开始。'}
    ],
    defeat:[
      {speaker:'西利上校',role:'蓝方阵地指挥官',text:'基地……没了。我早说过，靠一个毛头小子守不住阵地。'},
      {speaker:'谭雅',role:'蓝方前线副官',text:'别这么说，上校。是我来得太晚了。'},
      {speaker:'谭雅',role:'蓝方前线副官',text:'指挥官，调整部署，我们再来一次。'}
    ],
    playerInitial:[],
    waves:[
      {turn:2,spawns:[{tank:'basic',pos:'A1'},{tank:'basic',pos:'A3'},{tank:'basic',pos:'A5'},{tank:'basic',pos:'A7'}]},
      {turn:4,spawns:[{tank:'fast_tank',pos:'B2'},{tank:'fast_tank',pos:'B4'},{tank:'fast_tank',pos:'B6'}]},
      {turn:6,spawns:[{tank:'armored_car',pos:'C3'},{tank:'armored_car',pos:'C5'}]},
      {turn:8,spawns:[{tank:'apocalypse',pos:'D4'}]}
    ],
    reinforcements:[
      {turn:5,spawns:[{tank:'artillery_tank',pos:'J3'},{tank:'artillery_tank',pos:'J5'},{tank:'armored_car',pos:'J1'},{tank:'armored_car',pos:'J7'}]}
    ]
  }
];

/* ---------- 6. 版本历史 ---------- */
var VERSION_HISTORY = [
  { version: 'v8.0', tag: 'gold', date: '2026-10-17',
    details: [
      '项目拆分封装：config/core/auth/render/ai/game/campaign/pokedex/router',
      '修复：TANK_CONFIGS / MAP_CONFIGS / TANK_RARITY / CJK_FONT 等常量缺失',
      '修复：战役地图 dawn1 / xijiao 未注册',
      '修复：登录后主界面与登录界面叠层'
    ]
  },
  { version: 'v7.2', date: '2026-09-18',
    details: [
      '用户系统：注册、登录、退出',
      '坦克解锁：人机对战胜利一局解锁一辆',
      '排行榜：按胜场 / 伤害 / 场次排名'
    ]
  }
];