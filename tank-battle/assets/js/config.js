/* ========== 通用工具 ========== */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    if (typeof r==='number') r={tl:r,tr:r,br:r,bl:r};
    else r=Object.assign({tl:0,tr:0,br:0,bl:0},r);
    this.beginPath();this.moveTo(x+r.tl,y);this.lineTo(x+w-r.tr,y);
    this.quadraticCurveTo(x+w,y,x+w,y+r.tr);this.lineTo(x+w,y+h-r.br);
    this.quadraticCurveTo(x+w,y+h,x+w-r.br,y+h);this.lineTo(x+r.bl,y+h);
    this.quadraticCurveTo(x,y+h,x,y+h-r.bl);this.lineTo(x,y+r.tl);
    this.quadraticCurveTo(x,y,x+r.tl,y);this.closePath();
  };
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
function lerp(a,b,t){return a+(b-a)*t;}
function easeOutCubic(t){return 1-Math.pow(1-t,3);}
function lerpAngle(a,b,t){var d=((b-a+540)%360)-180;return a+d*t;}
function shade(hex,amt){
  if(!hex)return '#888';if(hex.startsWith('rgb'))return hex;
  var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');
  var n=parseInt(h,16);var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(amt>0){r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt;}
  else{r*=(1+amt);g*=(1+amt);b*=(1+amt);}
  return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
}
function rgba(hex,a){
  if(hex.startsWith('rgb'))return hex;
  var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');
  var n=parseInt(h,16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
}
function fmtHp(v){if(!isFinite(v))return '0';return Number.isInteger(v)?v.toString():parseFloat(v.toFixed(1)).toString();}
function formatDamage(v){if(Number.isInteger(v))return v.toString();return parseFloat(v.toFixed(2)).toString();}

/* ========== 音频 ========== */
var AudioManager = {
  ctx:null,isBgPlaying:true,isSfxEnabled:true,currentMusic:null,
  menuMusicInterval:null,battleMusicInterval:null,masterGain:null,
  init:function(){
    if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.masterGain=this.ctx.createGain();this.masterGain.gain.value=0.9;
      this.masterGain.connect(this.ctx.destination);}catch(e){return false;}}
    if(this.ctx.state==='suspended'){try{this.ctx.resume();}catch(e){}}
    return true;
  },
  _tone:function(freq,duration,type,volume,force,slideTo){
    if(!this.ctx)return;if(!force&&!this.isSfxEnabled)return;
    try{var osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
      osc.type=type;osc.frequency.value=freq;
      if(slideTo!==undefined)osc.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo),this.ctx.currentTime+duration);
      gain.gain.setValueAtTime(volume,this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001,this.ctx.currentTime+duration);
      osc.connect(gain);gain.connect(this.masterGain);osc.start();osc.stop(this.ctx.currentTime+duration);
    }catch(e){}
  },
  _noise:function(duration,volume,filterFreq,force,filterType){
    if(!this.ctx)return;if(!force&&!this.isSfxEnabled)return;
    try{var bs=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
      var buf=this.ctx.createBuffer(1,bs,this.ctx.sampleRate);
      var data=buf.getChannelData(0);
      for(var i=0;i<bs;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(bs*0.25));
      var noise=this.ctx.createBufferSource();noise.buffer=buf;
      var gain=this.ctx.createGain();
      gain.gain.setValueAtTime(volume,this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001,this.ctx.currentTime+duration);
      var filter=this.ctx.createBiquadFilter();
      filter.type=filterType||'lowpass';filter.frequency.value=filterFreq||1000;
      noise.connect(filter);filter.connect(gain);gain.connect(this.masterGain);
      noise.start();noise.stop(this.ctx.currentTime+duration);
    }catch(e){}
  },
  playTone:function(f,d,t,v,s){this._tone(f,d,t||'sine',v||0.3,false,s);},
  musicTone:function(f,d,t,v){this._tone(f,d,t||'sine',v||0.1,true);},
  playClick:function(){this.playTone(820,.07,'square',.13);},
  playMove:function(){this.playTone(120,.09,'sawtooth',.13);this.playTone(80,.11,'square',.09);this._noise(.07,.16,400,false);},
  playMiss:function(){this.playTone(900,.14,'sine',.13);},
  playBuild:function(){this.playTone(200,.09,'square',.13);var self=this;setTimeout(function(){self.playTone(300,.08,'square',.11);},60);},
  playLaunch:function(){this._noise(.22,.28,800,false,'highpass');this.playTone(180,.18,'square',.16,500);},
  playExplosion:function(){this._noise(.5,.6,200,false);this.playTone(50,.4,'sine',.4);},
  playNukeExplosion:function(){this._noise(1.5,.85,120,false);this.playTone(35,1.2,'sine',.5);this.playTone(22,1.5,'triangle',.4);},
  playVictory:function(){var self=this;[523,659,784,1047].forEach(function(f,i){setTimeout(function(){self.playTone(f,.26,'sine',.24);},i*150);});},
  playBulletHit:function(){this._noise(.1,.28,3800,false,'highpass');this.playTone(1400,.05,'square',.12,900);},
  playShellHit:function(){this._noise(.42,.5,260,false);this.playTone(58,.32,'sine',.34);},
  playRicochet:function(){this.playTone(1800,.08,'square',.16,1200);},
  playGroundHit:function(){this._noise(.3,.35,300,false);this.playTone(45,.24,'sine',.26);},
  playMeleeImpact:function(){this._noise(.2,.42,1500,false,'bandpass');this.playTone(120,.18,'sawtooth',.24,40);},
  playWaterSplash:function(){this._noise(.22,.30,2200,false,'highpass');this.playTone(560,.10,'sine',.14,240);},
  playDustHit:function(){this._noise(.20,.22,600,false);this.playTone(150,.12,'triangle',.10,80);},
  playSparkHit:function(){this._noise(.12,.30,4200,false,'highpass');this.playTone(1600,.06,'square',.12,1000);},
  playWoodHit:function(){this._noise(.14,.26,1200,false,'bandpass');this.playTone(340,.10,'square',.14,180);},
  playHQDestroy:function(){this._noise(1.2,.75,180,false);this.playTone(42,.9,'sine',.5);},
  playShieldBlock:function(){this.playTone(700,.18,'triangle',.22,1500);},
  playShieldBreak:function(){this._noise(.3,.5,2600,false,'highpass');this.playTone(1200,.12,'square',.22,400);},
  playHeal:function(){this.playTone(660,.18,'sine',.18,990);var self=this;setTimeout(function(){self.playTone(880,.22,'sine',.14,1100);},100);},
  playBurn:function(){this._noise(.18,.22,900,false,'bandpass');this.playTone(320,.12,'sawtooth',.10,180);},
  playDig:function(){this._noise(.35,.40,400,false);this.playTone(70,.30,'sawtooth',.18,30);},
  playSurface:function(){this._noise(.30,.35,800,false);this.playTone(120,.22,'triangle',.18,260);},
  playRepairBeam:function(){this.playTone(1100,.14,'sine',.16,1600);},
  playSplit:function(){this.playTone(300,.18,'sawtooth',.18,700);var self=this;setTimeout(function(){self.playTone(600,.14,'square',.14,1200);},80);},
  playUnlock:function(){var self=this;[523,659,784,1047,1319].forEach(function(f,i){setTimeout(function(){self.playTone(f,.32,'triangle',.22);},i*100);});},
  stopAllMusic:function(){if(this.menuMusicInterval){clearInterval(this.menuMusicInterval);this.menuMusicInterval=null;}if(this.battleMusicInterval){clearInterval(this.battleMusicInterval);this.battleMusicInterval=null;}this.currentMusic=null;},
  startMenuMusic:function(){
    this.stopAllMusic();if(!this.isBgPlaying)return;if(!this.init())return;
    this.currentMusic='menu';var melody=[262,294,330,349,392,349,330,294];var i=0;var self=this;
    this.menuMusicInterval=setInterval(function(){
      if(!self.isBgPlaying||self.currentMusic!=='menu')return;
      self.musicTone(melody[i%melody.length],.38,'sine',.085);
      self.musicTone(melody[i%melody.length]/2,.38,'triangle',.045);i++;
    },450);
  },
  startBattleMusic:function(){
    this.stopAllMusic();if(!this.isBgPlaying)return;if(!this.init())return;
    this.currentMusic='battle';var melody=[262,330,392,523,392,330,262,196],bass=[131,165,196,131,165,196,131,165];var i=0;var self=this;
    this.battleMusicInterval=setInterval(function(){
      if(!self.isBgPlaying||self.currentMusic!=='battle')return;
      self.musicTone(melody[i%melody.length],.16,'square',.085);
      self.musicTone(bass[i%bass.length],.21,'sawtooth',.07);i++;
    },220);
  },
  startCampaignMusic:function(){
    this.stopAllMusic();if(!this.isBgPlaying)return;if(!this.init())return;
    this.currentMusic='campaign';var melody=[220,262,330,262,294,349,294,262],bass=[110,131,165,131,147,175,147,131];var i=0;var self=this;
    this.battleMusicInterval=setInterval(function(){
      if(!self.isBgPlaying||self.currentMusic!=='campaign')return;
      self.musicTone(melody[i%melody.length],.28,'sine',.075);
      self.musicTone(bass[i%bass.length],.32,'triangle',.055);i++;
    },400);
  },
  toggleBackgroundMusic:function(){
    this.isBgPlaying=!this.isBgPlaying;
    if(this.isBgPlaying){this.init();
      if(typeof currentState!=='undefined'&&(currentState==='GAME_PLAY'||currentState==='GAME_OVER')){
        if(typeof campaignRunning!=='undefined'&&campaignRunning)this.startCampaignMusic();else this.startBattleMusic();
      }else this.startMenuMusic();
    }else this.stopAllMusic();
    syncMusicButton();
  },
  toggleSFX:function(){this.isSfxEnabled=!this.isSfxEnabled;syncSfxButton();}
};
function syncMusicButton(){var b=document.getElementById('btn-music-toggle');if(b){b.textContent=AudioManager.isBgPlaying?'🔊 开':'🔇 关';b.classList.toggle('on',AudioManager.isBgPlaying);}}
function syncSfxButton(){var b=document.getElementById('btn-sfx-toggle');if(b){b.textContent=AudioManager.isSfxEnabled?'🔊 开':'🔇 关';b.classList.toggle('on',AudioManager.isSfxEnabled);}}
function playClick(){AudioManager.playClick();}
function playMove(){AudioManager.playMove();}
function playMiss(){AudioManager.playMiss();}
function playBuild(){AudioManager.playBuild();}
function playLaunch(){AudioManager.playLaunch();}
function playExplosion(){AudioManager.playExplosion();}
function playNukeExplosion(){AudioManager.playNukeExplosion();}
function playVictory(){AudioManager.playVictory();}
function playBulletHit(){AudioManager.playBulletHit();}
function playShellHit(){AudioManager.playShellHit();}
function playRicochet(){AudioManager.playRicochet();}
function playGroundHit(){AudioManager.playGroundHit();}
function playMeleeImpact(){AudioManager.playMeleeImpact();}
function playWaterSplash(){AudioManager.playWaterSplash();}
function playDustHit(){AudioManager.playDustHit();}
function playSparkHit(){AudioManager.playSparkHit();}
function playWoodHit(){AudioManager.playWoodHit();}
function playHQDestroy(){AudioManager.playHQDestroy();}
function playShieldBlock(){AudioManager.playShieldBlock();}
function playShieldBreak(){AudioManager.playShieldBreak();}
function playHeal(){AudioManager.playHeal();}
function playBurn(){AudioManager.playBurn();}
function playDig(){AudioManager.playDig();}
function playSurface(){AudioManager.playSurface();}
function playRepairBeam(){AudioManager.playRepairBeam();}
function playSplit(){AudioManager.playSplit();}
function playUnlock(){AudioManager.playUnlock();}
function toggleMusic(){AudioManager.init();AudioManager.toggleBackgroundMusic();}
function toggleSFX(){AudioManager.toggleSFX();}

/* ========== 全局状态 ========== */
var ROWS=[],COLS=0;
var currentState='MAIN_MENU';
var gameMode='pvp';
var campaignRunning=false,onlineRunning=false;
var redReady=false,blueReady=false;
var redSelectedTank=null,blueSelectedTank=null;
var redSelectedMap=null,blueSelectedMap=null;
var redSelectedBase=null,blueSelectedBase=null;
var finalMap=null;
var tankSelectTimer=null,mapSelectTimer=null,baseSelectTimer=null;
var tankSelectTimeLeft=20,mapSelectTimeLeft=10,baseSelectTimeLeft=10;
var gameMap=null,gridData=null;
var redUnits=[],blueUnits=[];
var defenseBuildings=[];
var currentTeam='red',currentUnit=null,selectedAction=null;
var highlightedCells=[],highlightedBuildCells=[],rangeDisplayUnit=null;
var totalTurns=0,redRespawnCount=0,blueRespawnCount=0;
var redDamageDealt=0,blueDamageDealt=0;
var effects=[],floatingTexts=[],radiationSources=[];
var autoSkipEnabled=false;
var trustEnabled={red:false,blue:false};
var inputLocked=false,isEndingTurn=false;
var nukeScreenShakeUntil=0,baseScreenShakeUntil=0,nukeWhiteFlashUntil=0;
var baseTankRef={red:null,blue:null};
var basePosRef={red:null,blue:null};
var redHQ=null,blueHQ=null;
var trackMarkPool=[],wakeTrailPool=[],buildAnims=[],projectiles=[],meleeAnims=[];
var waterTransitions=[],healBeams=[],flameJets=[],deathFireExplosions=[],digTunnels=[];
var fogState=[],fogTotalCount=0,fogExploredCount=0;
var renderRaf=null,lastFrame=0;
var aiRunning=false,aiFocusTarget=null;
var aiWatchdogTimer=null;
var DPR=Math.min(window.devicePixelRatio||1,3);

/* 用户系统状态 */
var authToken=localStorage.getItem('tank_token')||null;
var currentUser=null;
var userUnlockedTanks=null;
var userStats={total_wins:0,total_losses:0,total_games:0,total_damage:0,max_streak:0,campaign_cleared:0,unlocked_tanks:0};
var backendAvailable=false;
var isGuestMode=false;

/* 开发者模式 */
var DEV_PASSWORD='tankbattle#';
var devMode=false;
var devSnapshot=null;
var devTools={unlockAll:false,showHidden:false,infiniteSteps:false,godMode:false,speed:1};

/* ========== 通用辅助 ========== */
function getWeightValue(w){return w==='super_heavy'?4:w==='heavy'?3:w==='standard'?2:w==='light'?1:0;}
function getWeightLabel(w){return w==='super_heavy'?'超重型':w==='heavy'?'重':w==='light'?'轻':'标准';}
function getRowLetters(count){var a=[];for(var i=0;i<count;i++)a.push(String.fromCharCode(65+i));return a;}
function posToIndex(s){return {row:ROWS.indexOf(s[0].toUpperCase()),col:parseInt(s.substring(1),10)-1};}
function indexToPos(r,c){if(r<0||r>=ROWS.length||c<0||c>=COLS)return null;return ROWS[r]+(c+1);}
function getUnitAt(row,col){for(var i=0;i<redUnits.length;i++){var u=redUnits[i];if(u.alive&&u.pos&&u.pos.row===row&&u.pos.col===col&&!u.isUnderground)return u;}for(var j=0;j<blueUnits.length;j++){var u2=blueUnits[j];if(u2.alive&&u2.pos&&u2.pos.row===row&&u2.pos.col===col&&!u2.isUnderground)return u2;}return null;}
function getDefenseAt(row,col){for(var i=0;i<defenseBuildings.length;i++){var b=defenseBuildings[i];if(b.alive&&b.row===row&&b.col===col)return b;}return null;}
function getRiverRanges(cfg){return cfg.riverRanges||(cfg.riverRange?[cfg.riverRange]:[]);}
function isInRiverRange(row,col){
  if(!gameMap)return false;
  if(gridData&&gridData[row]&&gridData[row][col]){var t=gridData[row][col].terrain;if(t==='bridge'||t==='bridge_dmg'||t==='bridge_crt')return false;if(t==='river')return true;}
  var ranges=getRiverRanges(gameMap);
  for(var i=0;i<ranges.length;i++){var r=ranges[i];var rs=ROWS.indexOf(r.rowStart),re=ROWS.indexOf(r.rowEnd);if(row>=rs&&row<=re&&col>=r.colStart-1&&col<=r.colEnd-1)return true;}
  return false;
}
function isInRiverRangeStatic(row,col,cfg){var rows=getRowLetters(cfg.rows||10);var ranges=getRiverRanges(cfg);for(var i=0;i<ranges.length;i++){var r=ranges[i];var rs=rows.indexOf(r.rowStart),re=rows.indexOf(r.rowEnd);if(row>=rs&&row<=re&&col>=r.colStart-1&&col<=r.colEnd-1)return true;}return false;}
function isJumpPad(row,col){return gridData&&gridData[row]&&gridData[row][col]&&gridData[row][col].terrain==='jump_pad';}
function isBlocked(row,col){
  if(!gridData)return true;
  if(row<0||row>=ROWS.length||col<0||col>=COLS)return true;
  var t=gridData[row][col].terrain;
  return t==='obstacle'||t==='obstacle_dmg'||t==='obstacle_crt'||t==='ruins_block';
}
function isCellBase(row,col){if(!gridData)return false;var t=gridData[row][col].terrain;return t==='base_red'||t==='base_blue';}
function isHQCell(row,col){return (basePosRef.red&&basePosRef.red.row===row&&basePosRef.red.col===col)||(basePosRef.blue&&basePosRef.blue.row===row&&basePosRef.blue.col===col);}
function canJumpLand(row,col){if(row<0||row>=ROWS.length||col<0||col>=COLS)return false;var t=gridData[row][col].terrain;return t!=='obstacle'&&t!=='obstacle_dmg'&&t!=='obstacle_crt'&&t!=='ruins_block';}
function getJumpDestination(row,col){var posStr=indexToPos(row,col);if(!posStr||!JUMP_PAIRS[posStr])return null;var p=posToIndex(JUMP_PAIRS[posStr]);if(!canJumpLand(p.row,p.col))return null;return {row:p.row,col:p.col};}
function hasLineOfSight(fr,fc,tr,tc){var dr=Math.abs(tr-fr),dc=Math.abs(tc-fc);var steps=Math.max(dr,dc);if(steps===0)return true;var rs=(tr-fr)/steps,cs=(tc-fc)/steps;for(var i=1;i<steps;i++){if(isBlocked(Math.round(fr+rs*i),Math.round(fc+cs*i)))return false;}return true;}
function canWalkOnRiver(unit){if(unit.isUnderground)return true;return unit.cfg.special==='river_walker'||!!unit.cfg.isMissile||!!unit.cfg.isNuke||unit.cfg.weight==='super_heavy';}
function canTriggerJumpPad(unit){if(unit.isUnderground)return false;if(unit.cfg.isBaseTank)return false;return !unit.cfg.isMissile&&!unit.cfg.isNuke;}
function isFlyingUnit(unit){return !!(unit&&(unit.cfg.isMissile||unit.cfg.isNuke));}
function canDig(unit){return unit.cfg.special==='dig';}
function hasDodge(unit){return unit.cfg.dodgeChance!==undefined&&unit.cfg.dodgeChance>0;}
function isFireTank(unit){return unit&&unit.cfg&&unit.cfg.special==='fire_burn';}
function isNanoUnit(unit){return unit&&unit.cfg&&(unit.cfg.id==='nano_3'||unit.cfg.id==='nano_2'||unit.cfg.id==='nano_1');}
function isBaseTank(unit){return !!(unit&&unit.cfg&&unit.cfg.isBaseTank);}
function isTerrainAttackable(row,col){if(!gridData)return false;var t=gridData[row][col].terrain;var isObs=t==='obstacle'||t==='obstacle_dmg'||t==='obstacle_crt';var isBr=t==='bridge'||t==='bridge_dmg'||t==='bridge_crt';return (isObs||isBr)&&gridData[row][col].hp>0;}

function getSpecialShort(id){var d={river_walker:'🌊 可涉水',multi_attack:'🔫 三连击',straight_only:'➡️ 仅直线',shield:'🛡 护盾',siege:'🏰 攻城×2',builder:'🔧 建造机器人',rocket_builder:'🚀 发射导弹',self_destruct:'💥 自爆',nuke_builder:'☢️ 发射核弹',auto_fly:'🚀 自动飞行',burn:'🔥 灼烧',dodge:'💨 闪避50%',dig:'⛏️ 钻地',repair:'💚 治疗',fire_burn:'🔥 焚火',nano_split:'🧬 分裂',artillery:'💥 抛射',nano_repair:'✚ 自修复',base_tank:'🏠 基地'};return d[id]||id||'无';}
function getSpecialDesc(id){var d={river_walker:'🌊 可在河流中移动，水中速度3、陆上速度1，水中攻击力+1',multi_attack:'🔫 一回合可攻击 3 次（可重复目标）',straight_only:'⬆️⬇️⬅️➡️ 只能沿直线攻击（不能对角线）',shield:'🛡 护盾抵挡一次伤害，护盾值 0.5（可挡一次核弹）',siege:'🏰 对基地与地形伤害 ×2',builder:'🔧 建造机器人，每回合 3 次，冷却 3 完整回合，场上最多 5 个机器人',rocket_builder:'🚀 发射导弹，每回合 1 次，冷却 2 完整回合，场上最多 3 枚导弹',self_destruct:'💥 自爆，对 3×3 范围造成 1.5 伤害（含友伤）',nuke_builder:'☢️ 发射核弹，每回合 1 次，冷却 3 完整回合，场上最多 1 枚。',auto_fly:'🚀 自动飞行，撞到边界/单位/基地/障碍物即爆炸，5×5 范围。',burn:'🔥 喷火。命中后目标每回合扣 0.5 血，持续 2 回合（护盾可挡）',dodge:'💨 被攻击时有 50% 概率闪避（闪避优先于暴击/miss）',dig:'⛏️ 钻地：花一回合钻入地底，移速4。出土时击退目标格敌人。地底期间完全无敌。',repair:'💚 5×5 范围治疗友军 0.5（不能治自己）/ 攻击敌人 0.5。',fire_burn:'🔥 超重型。每个阵营回合结束自扣 0.5。死后 5×5 火焰爆炸 2 伤害并叠加灼烧。',nano_split:'🧬 护盾破碎时立刻分裂为 2 辆下一阶纳米分裂车；若本体血量归零则直接死亡。',artillery:'💥 抛射大炮弹，8 方向直线，落点 3×3 范围伤害，无视障碍和单位。',nano_repair:'✚ 原地不动时回合结束回复 0.5 血，攻击为直线 5 格伤害光波。',base_tank:'🏠 出生即为基地，不能进敌方基地格，无法被碾压/击退，死亡则游戏结束。'};return d[id]||id||'无';}
function getAmmoLabel(t){return t==='shell'?'炮弹':t==='bullet'?'子弹':t==='melee'?'近战撞击':t==='flame'?'喷火':t==='artillery'?'投射大炮弹':'无';}
function getChassisLabel(t){return t==='tracked'?'履带':t==='wheeled'?'轮式':t==='amphibious'?'履带+螺旋桨':'特殊';}
function getSpeakerStyle(speaker){var map={'谭雅':{main:'#7fdc8c',border:'#4a6b42',text:'#d8e8d8'},'西利上校':{main:'#ffb060',border:'#8b6b42',text:'#f0e0d0'},'普通坦克驾驶员':{main:'#8ac860',border:'#4a6b42',text:'#d8e8d8'},'装甲车驾驶员':{main:'#b875d6',border:'#6a4b8a',text:'#e8d8f8'},'快速坦克驾驶员':{main:'#e8c84a',border:'#8b7b42',text:'#f0ecd8'},'坦克驾驶员':{main:'#8ab85c',border:'#4a6b42',text:'#d8e8d8'}};if(map[speaker])return map[speaker];if(speaker&&speaker.indexOf('谭雅')>=0)return map['谭雅'];if(speaker&&speaker.indexOf('西利')>=0)return map['西利上校'];if(speaker&&speaker.indexOf('驾驶员')>=0)return map['坦克驾驶员'];return {main:'#7fdc8c',border:'#4a6b42',text:'#d8e8d8'};}

/* ========== UI 基础 ========== */
function showOverlay(msg,duration){duration=duration||1400;var el=document.getElementById('overlay-msg');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},duration);}
function openModal(id){var el=document.getElementById(id);if(el)el.classList.add('show');}
function closeModal(id){var el=document.getElementById(id);if(el)el.classList.remove('show');}
function switchScreen(id){
  var screens=['screen-main','screen-dual','screen-tank-select','screen-map-select','screen-base-select','screen-game','screen-campaign','screen-pokedex','screen-online'];
  screens.forEach(function(s){var el=document.getElementById(s);if(el)el.classList.toggle('active',s===id);});
  var bottombar=document.getElementById('bottombar');
  if(bottombar)bottombar.classList.toggle('hidden',id==='screen-game');
  var topbar=document.getElementById('topbar');
  if(topbar)topbar.classList.toggle('hidden',id==='screen-game');
  document.querySelectorAll('.bot-btn').forEach(function(btn){btn.classList.toggle('active',btn.dataset.tab===id);});
  if(id==='screen-campaign'&&typeof renderCampaignMenu==='function')renderCampaignMenu();
  if(id==='screen-pokedex'&&typeof renderPokedexContent==='function')renderPokedexContent();
  if(id==='screen-game'){
    ISO.ready=false;
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      if(typeof isoLayout==='function')isoLayout();
      if(typeof drawGameCanvas==='function')drawGameCanvas(performance.now());
      if(typeof startRenderLoop==='function')startRenderLoop();
    });});
  }else{if(typeof stopRenderLoop==='function')stopRenderLoop();}
}

/* ========== Unit 类 ========== */
function Unit(cfg,team,pos){
  this.cfg=cfg;this.team=team;this.pos=pos;
  this.hp=cfg.hp;this.maxHp=cfg.hp;this.alive=true;
  this.respawnCountdown=0;this.isInRiver=false;
  this.cooldownRemaining=0;this.cooldownLocked=false;
  this.waitingJump=false;this.jumpWaitTurns=0;this.jumpDest=null;
  this.waterSteps=cfg.waterSpeed||3;
  if(cfg.shieldLayers&&cfg.shield!==undefined){this.shield=cfg.shield;this.shieldLayers=cfg.shieldLayers;}
  else{this.shield=cfg.shield!==undefined?cfg.shield:null;this.shieldLayers=0;}
  this.moveStepsLeft=cfg.speed;this.attackCountLeft=cfg.attackCount;
  this.buildCountLeft=cfg.buildCount||0;
  this.hasMoved=false;this.wasKnockbacked=false;
  this.type=cfg.isRobot?'robot':cfg.isMissile?'missile':cfg.isNuke?'nuke':'tank';
  this.freshBuild=false;this.builder=null;
  this.direction=0;this.bodyDir=team==='red'?90:270;this.turretDir=this.bodyDir;
  this.waterTint=0;this.burnTurns=0;
  this.isUnderground=false;this.digStepsLeft=0;this.digJustUsedThisTurn=false;
  this.waitingDigIn=false;this.pendingDigOut=false;
  this.aiRole=null;this._aiThinking=false;this.aimAnim=null;this.anim=null;
  this._lastEmberTs=0;this.nanoGroupId=null;this.nanoLevel=cfg.nanoLevel||0;
  this.isNanoReviving=false;this.deadAsBase=false;
  if(cfg.isBaseTank){this.cfg=Object.assign({},cfg,{color:team==='red'?'#e94560':'#4da6ff',turretColor:team==='red'?'#b03340':'#3070b0',accentColor:'#f0c040'});}
}
Unit.prototype.applySpeedPool=function(){
  if(this.isUnderground){this.moveStepsLeft=this.cfg.digSpeed||4;return;}
  if(this.pendingDigOut){this.moveStepsLeft=0;return;}
  if(this.waitingDigIn){this.moveStepsLeft=0;return;}
  if(this.cfg.special==='river_walker')this.moveStepsLeft=this.isInRiver?this.waterSteps:this.cfg.speed;
  else this.moveStepsLeft=this.cfg.speed;
};
Unit.prototype.resetTurn=function(){
  this.hasMoved=false;this.wasKnockbacked=false;this.freshBuild=false;this.digJustUsedThisTurn=false;
  if(this.cooldownRemaining>0){this.attackCountLeft=0;this.buildCountLeft=0;}
  else{this.attackCountLeft=this.cfg.attackCount;this.buildCountLeft=this.cfg.buildCount||0;}
  this.applySpeedPool();
};

/* ========== 等距投影 ========== */
var ISO={TW:64,TH:32,Z:22,ox:0,oy:0,ready:false,_availW:0,_R:0,_C:0,_w:0,_h:0};
function isoLayout(){
  var container=document.getElementById('canvas-container');if(!container)return {w:400,h:400};
  var availW=container.clientWidth||420;var R=ROWS.length,C=COLS;
  if(!ISO.ready||availW!==ISO._availW||R!==ISO._R||C!==ISO._C){
    ISO._availW=availW;ISO._R=R;ISO._C=C;
    var tw=2*availW/(R+C);tw=Math.max(26,Math.min(tw,84));
    ISO.TW=tw;ISO.TH=tw*0.5;ISO.Z=tw*0.34;
    ISO.ox=R*ISO.TW/2;ISO.oy=ISO.TH*0.5+ISO.Z*0.9;
    ISO._w=(R+C)*ISO.TW/2;ISO._h=(R+C)*ISO.TH/2+ISO.Z*1.8+ISO.TH*0.5;
    ISO.ready=true;
  }
  return {w:ISO._w,h:ISO._h};
}
function isoProject(wx,wz,wy){wy=wy||0;return {x:ISO.ox+(wx-wz)*ISO.TW/2,y:ISO.oy+(wx+wz)*ISO.TH/2-wy*ISO.Z};}
function isoCell(row,col,y){y=y||0;return isoProject(col,row,y);}
function isoUnproject(px,py){var dx=(px-ISO.ox)/(ISO.TW/2);var dy=(py-ISO.oy)/(ISO.TH/2);return {col:(dx+dy)/2,row:(dy-dx)/2};}
function isoDiamond(ctx,cx,cy,tw,th,lift){lift=lift||0;var hw=tw/2,hh=th/2,y=cy-lift;ctx.beginPath();ctx.moveTo(cx,y-hh);ctx.lineTo(cx+hw,y);ctx.lineTo(cx,y+hh);ctx.lineTo(cx-hw,y);ctx.closePath();}

/* ========== 提示 ========== */
function devLog(msg,type){if(!devMode)return;console.log('[DEV]',msg);}
function showConfirm(message,onYes,onNo){
  var ov=document.getElementById('modal-confirm');
  document.getElementById('confirm-title').textContent='⚠️ 确认';
  document.getElementById('confirm-message').textContent=message;
  ov.classList.add('show');
  var yesBtn=document.getElementById('confirm-yes'),noBtn=document.getElementById('confirm-no');
  yesBtn.onclick=function(){ov.classList.remove('show');yesBtn.onclick=null;noBtn.onclick=null;onYes&&onYes();};
  noBtn.onclick=function(){ov.classList.remove('show');yesBtn.onclick=null;noBtn.onclick=null;onNo&&onNo();};
}