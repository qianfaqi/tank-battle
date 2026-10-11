# 🎮 坦克大战 V7.2 — 2.5D 立体战场

一个纯前端 + Cloudflare 全栈的回合制坦克对战游戏，支持用户注册登录、坦克解锁、云存档与排行榜。

> **本 README 目的**：为后续 AI 辅助开发提供完整上下文，任何新的对话只需附上本文件，即可快速理解项目全貌，无需重复解释。

---

## 一、项目速览

| 项目 | 说明 |
|------|------|
| 名称 | 坦克大战 (Tank Battle) |
| 当前版本 | **V7.2** |
| 类型 | 回合制 2.5D 坦克对战游戏 |
| 前端 | 单文件 HTML（含 CSS + JS），Canvas 2D 绘制 |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 (SQLite) |
| 部署 | Cloudflare Pages（GitHub 集成） |
| 作者 | DeepSeek × 钱发麒 联合生成，龚兆琦设计 |
| 起始版本 | V5.0（2026-08-30） |
| 最新版本 | V7.2（2026-09-18） |

---

## 二、目录结构

```
tank-battle/
├── README.md
├── index.html
├── admin.html                         ← 新增
├── wrangler.toml
├── functions/
│   └── api/
│       ├── _middleware.js
│       ├── auth/
│       │   ├── register.js
│       │   ├── login.js
│       │   ├── me.js
│       │   └── logout.js
│       ├── game/
│       │   ├── unlock.js
│       │   ├── load.js
│       │   └── campaign-clear.js      ← 新增
│       ├── admin/                     ← 新增目录
│       │   ├── _helpers.js
│       │   ├── users.js
│       │   └── user.js
│       └── leaderboard.js
└── migrations/
    ├── 0001_init.sql
    └── 0002_campaign.sql              ← 新增
```

### 关键说明

- **前端只有一个文件**：`index.html` 包含了 HTML、CSS、JS，没有构建步骤，没有 npm 依赖。
- **后端用文件路由**：`functions/api/auth/login.js` 自动映射到 `/api/auth/login`。
- **数据库表**：4 张表，见下方 SQL 结构。
- **部署方式**：GitHub 推送 → Cloudflare Pages 自动构建部署。

---

## 三、技术栈详解

### 3.1 前端

| 技术 | 用途 |
|------|------|
| 原生 HTML/CSS/JS | 无框架，无构建工具 |
| Canvas 2D API | 游戏画面绘制（2.5D 投影） |
| Web Audio API | 音效和背景音乐合成（无音频文件） |
| localStorage | 存储登录 token |
| fetch API | 调用后端 |

**为什么不用框架？** 项目最初是单文件 HTML 游戏，保持"零依赖、零构建"的特点，方便直接部署和迭代。所有逻辑都写在 `index.html` 的 `<script>` 标签内。

### 3.2 后端

| 技术 | 用途 |
|------|------|
| Cloudflare Pages Functions | Serverless 后端 API |
| Cloudflare D1 | Serverless SQLite 数据库 |
| Web Crypto API | 密码哈希（SHA-256 + salt） |
| Bearer Token | 会话认证 |

### 3.3 部署

| 技术 | 用途 |
|------|------|
| GitHub | 代码托管 |
| Cloudflare Pages | 静态托管 + 自动部署 |
| Cloudflare Dashboard | 手动绑定 D1、查看数据库 |

**没有使用**：npm、wrangler CLI、Node.js（可选，但非必须）。

---

## 四、部署方式（完整流程）

### 4.1 首次部署

由于开发者环境可能禁止运行 npm/wrangler，本项目提供**纯网页操作**方案：

1. **创建 D1 数据库**
   - Cloudflare Dashboard → Storage & Databases → D1 → Create Database
   - 数据库名：`tank-battle-db`

2. **建表**
   - D1 数据库页面 → Console 标签 → 粘贴 `migrations/0001_init.sql` 全部内容 → Execute

3. **上传代码到 GitHub**
   - 在 GitHub 新建仓库 `tank-battle`
   - 通过网页上传所有文件（保留目录结构）

4. **连接 Cloudflare Pages**
   - Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
   - 选择 `tank-battle` 仓库
   - Framework preset：**None**
   - Build command：**`exit 0`**（关键！让 Pages 识别 `functions/` 目录）
   - Build output directory：**留空**
   - Root directory：**留空**

5. **绑定 D1**
   - Pages 项目 → Settings → Functions → D1 database bindings
   - Variable name：`DB`（必须大写）
   - D1 database：`tank-battle-db`
   - **绑定后必须重新部署才生效**（Deployments → Retry deployment）

6. **测试**
   - 打开 `https://你的项目.pages.dev`
   - 注册账号 → 打开 D1 Console 执行 `SELECT * FROM users;` 应能看到新用户

### 4.2 后续更新

- 修改 GitHub 上的文件 → Cloudflare 自动重新部署
- 若修改 `wrangler.toml` 中的绑定，需在 Dashboard 手动同步或重新部署

### 4.3 wrangler.toml 内容

```toml
name = "tank-battle"
compatibility_date = "2026-09-18"
pages_build_output_dir = "."

[[d1_databases]]
binding = "DB"
database_name = "tank-battle-db"
database_id = "你的数据库ID（从 Dashboard 复制）"
```

---

## 五、数据库结构

### 5.1 表：users

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT UNIQUE | 用户名（3-20 字符） |
| password_hash | TEXT | SHA-256(password + salt) 的 hex |
| salt | TEXT | 16 字节随机 hex |
| created_at | TEXT | 创建时间 |
| last_login | TEXT | 最后登录时间 |

### 5.2 表：user_saves

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | INTEGER PK | 外键 → users.id |
| unlocked_tanks | TEXT | 逗号分隔的坦克 ID，如 `basic,fast_tank` |
| total_wins | INTEGER | 总胜场 |
| total_losses | INTEGER | 总败场 |
| total_games | INTEGER | 总场次 |
| total_damage | REAL | 累计伤害 |
| best_turn_count | INTEGER | 最少回合数取胜记录（默认999） |
| updated_at | TEXT | 最后更新时间 |

### 5.3 表：match_records

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增 |
| user_id | INTEGER | 外键 → users.id |
| result | TEXT | `win` / `loss` |
| mode | TEXT | `pve` / `pvp` |
| tank_used | TEXT | 使用的坦克 ID |
| damage_dealt | REAL | 本局伤害 |
| turn_count | INTEGER | 本局回合数 |
| created_at | TEXT | 时间戳 |

### 5.4 表：sessions

| 字段 | 类型 | 说明 |
|------|------|------|
| token | TEXT PK | 32 字节随机 hex |
| user_id | INTEGER | 外键 → users.id |
| expires_at | TEXT | 过期时间（创建后 7 天） |
| created_at | TEXT | 时间戳 |
---

## 六、后端 API 文档

所有 API 路径前缀 `/api`，返回 JSON。CORS 由 `_middleware.js` 统一处理。

### 6.1 认证相关

#### POST /api/auth/register
- **Body**: `{ "username": "xxx", "password": "yyy" }`
- **成功**: `{ success, token, user: {id, username}, unlockedTanks: ["basic"] }`
- **失败**: `{ error }` + 状态码 400/409

#### POST /api/auth/login
- **Body**: `{ "username", "password" }`
- **成功**: `{ success, token, user, unlockedTanks, stats }`
- **失败**: `{ error }` + 状态码 401

#### GET /api/auth/me
- **Headers**: `Authorization: Bearer <token>`
- **成功**: `{ user, unlockedTanks, stats }`
- **失败**: 401

#### POST /api/auth/logout
- **Headers**: `Authorization: Bearer <token>`
- 删除会话记录

### 6.2 游戏相关

#### POST /api/game/unlock
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ mode, result, tankUsed, damageDealt, turnCount }`
- **行为**:
  - 记录到 `match_records`
  - 更新 `user_saves` 的统计
  - 若 `result === 'win' && mode === 'pve'`，按 `UNLOCK_ORDER` 顺序解锁下一辆坦克
- **成功**: `{ success, unlockedTanks, newUnlock, stats }`

#### GET /api/game/load
- **Headers**: `Authorization: Bearer <token>`
- **成功**: `{ unlockedTanks, stats }`

### 6.3 排行榜

#### GET /api/leaderboard?sort=wins&limit=20
- **参数**:
  - `sort`: `wins` | `damage` | `games`（默认 `wins`）
  - `limit`: 最多 100（默认 20）
- **成功**: `{ leaderboard: [{ rank, username, wins, losses, games, damage, bestTurns }] }`

### 6.4 坦克解锁顺序

坦克解锁顺序定义在 `functions/api/game/unlock.js` 的 `UNLOCK_ORDER` 数组中：

```javascript
const UNLOCK_ORDER = [
  'basic',           // 初始解锁
  'fast_tank',
  'heavy_tank',
  'water_ghost',
  'armored_car',
  'shield_tank',
  'melee_tank',
  'siege_tank',
  'apocalypse',
  'super_heavy',
  'engineer',
  'rocket_launcher',
  'nuke_launcher'
];
```

**规则**：每次人机对战胜利，按稀有度加权随机从"未解锁坦克池"中抽取一辆。稀有度越高的坦克权重越低（权重 ≈ 10 - 稀有度 × 1.2）。

---

## 七、前端架构

### 7.1 屏幕（Screen）系统

所有界面都是 `.screen` 元素，通过 `switchScreen(id)` 切换。屏幕列表：

| ID | 用途 |
|-----|------|
| `main-menu` | 主菜单 |
| `dual-menu` | 双人/人机准备界面 |
| `info-menu` | 版本信息 |
| `settings-menu` | 设置（音乐/音效） |
| `auth-menu` | 登录/注册/用户面板 |
| `tank-select-screen` | 坦克选择 |
| `map-select-screen` | 地图选择 |
| `base-select-screen` | 基地选择 |
| `game-screen` | 游戏主界面 |
| `pokedex-screen` | 图鉴 |
| `tutorial-screen` | 教程 |
| `leaderboard-screen` | 排行榜 |

`SCREEN_IDS` 数组定义在脚本顶部，新屏幕需要加入数组。

### 7.2 全局状态（关键变量）

```javascript
// 游戏状态
currentState       // 'MAIN_MENU' | 'GAME_PLAY' | ...
gameMode           // 'pvp' | 'pve'
redSelectedTank    // 红方坦克 ID
blueSelectedTank   // 蓝方坦克 ID
redSelectedMap     // 红方地图 ID
finalMap           // 最终地图配置
gridData           // 2D 数组，每格的 terrain/occupant 等
redHQ / blueHQ     // { pos:{row,col}, hp, maxHp }
redUnits / blueUnits // 单位对象数组
currentTeam        // 'red' | 'blue'
currentUnit        // 当前控制的单位
selectedAction     // 'move' | 'attack' | null
highlightedCells   // 高亮格子
radiationSources   // 辐射源数组
effects / floatingTexts // 特效
totalTurns         // 完整回合数
redDamageDealt / blueDamageDealt // 累计伤害

// 用户系统（V7.2 新增）
authToken          // 从 localStorage 读取
currentUser        // { id, username }
userUnlockedTanks  // 已解锁坦克 ID 数组；null = 未登录
userStats          // { total_wins, total_losses, ... }
```

### 7.3 游戏单位配置

所有单位/坦克配置都在脚本顶部定义：

```javascript
TANK_CONFIGS       // 数组，玩家可选坦克（13 种）
ENGINEER_TANK      // 工程师坦克（建造机器人）
ROBOT              // 机器人（工程师建造）
ROCKET_LAUNCHER    // 火箭发射车
MISSILE            // 导弹
NUKE_LAUNCHER      // 核弹发射车
NUKE               // 核弹
```

每个配置对象包含：`id, name, hp, speed, range, attack, weight, special, color, attackCount, attackCooldown, desc` 等。

### 7.4 地图配置

```javascript
MAP_CONFIGS  // 数组，6 张地图：0号阵地、十字路口、楚河汉界、双河对峙、孤岛、石阵
```

每张地图包含：`rows, cols, specialTerrain[], riverRanges[], tags[]`。

**地形类型**：`plain`、`river`、`bridge`、`jump_pad`、`base_red`、`base_blue`、`obstacle`。

### 7.5 跳板机制

`JUMP_PAIRS` 定义了跳板对：`{ '起点位置': '终点位置' }`，例如 `'G2': 'D2'` 表示站在 G2 的跳板会跳到 D2。

**跳板等待回合**（按重量）：
- 超重型：6 回合
- 重型：4 回合
- 标准：2 回合
- 轻型：0 回合（立即跳）

**跳板碰撞**：落点有敌方单位时按重量比较，重量小的被摧毁，同重量时落点单位被摧毁。

### 7.6 核心游戏逻辑函数

| 函数 | 用途 |
|------|------|
| `startGame()` | 开始游戏，初始化所有状态 |
| `initUnits()` | 创建双方初始单位 |
| `handleMapClick(row, col)` | 处理地图点击（移动/攻击/建造/切换单位） |
| `executeMove(unit, row, col)` | 执行移动（含碾压、跳板、地形改写） |
| `executeAttack(attacker, target)` | 执行攻击（含暴击/未命中判定） |
| `executeBuild(builder, row, col)` | 执行建造（机器人/导弹/核弹） |
| `executeSelfDestruct(missile, r, c)` | 导弹自爆 |
| `processNukePhase(team)` | 核弹自动飞行阶段（异步） |
| `triggerNukeExplosion(nuke, r, c)` | 核弹爆炸（5×5 范围） |
| `applyRadiationTurnDamage()` | 完整回合末结算辐射伤害 |
| `endTurn()` | 结束回合（含跳板、核弹、辐射、复活、切换） |
| `aiTakeTurnForTrust()` | AI 托管执行 |
| `aiUnitActionSmart(unit)` | 单个 AI 单位的智能决策 |
| `drawGameCanvas(time)` | 主绘制入口 |
| `drawTank3D(ctx, unit, m, time, isCurrent)` | 绘制坦克（2.5D） |
| `drawHQ(ctx, hq, team, m, time)` | 绘制总部 |
| `drawEffect(ctx, e, time)` | 绘制特效 |

### 7.7 2.5D 绘制原理

- 采用"斜视角"投影：每格是一个菱形/矩形（非严格等距），通过 `padTop`（顶部留白）+ `lift`（立体厚度）模拟高度。
- 所有单位按照行号排序绘制，行号大的后画（更靠前）。
- 单位本身用椭圆阴影 + 车身 + 炮塔 + 炮管的分层绘制。
- 每个格子大小由 `CV`（Canvas 度量对象）决定：`{ cw, ch, lift, padTop, w, h }`。

### 7.8 用户系统集成（V7.2 新增）

在 `<script>` 末尾有一段独立区块，标注为：

```javascript
/* ============================================================
   ★★★ V7.2 用户系统集成 ★★★
============================================================ */
```

包含所有用户系统函数：`openAuthMenu`、`doLogin`、`doRegister`、`doLogout`、`fetchUserInfo`、`reportGameResult`、`openLeaderboard`、`switchLeaderboard`。

**关键集成点**：
1. `renderTankChoices(team)` 会根据 `userUnlockedTanks` 过滤红方可选坦克。
2. `showSettlement()` 末尾会调用 `reportGameResult(winner)` 上报战绩。
3. 页面加载时 `restoreSession()` 会自动用 localStorage 中的 token 恢复登录。

---

## 八、游戏机制速查

### 8.1 回合流程

1. 红方回合 → 操作单位 → 结束回合
2. 蓝方回合 → 操作单位 → 结束回合
3. 蓝方结束 = 完整回合结束 → 冷却递减、辐射结算
4. 单位复活倒计时在各自回合末递减

### 8.2 单位操作

- **移动**：点击"移动"按钮后点相邻格，每格消耗 1 步
- **攻击**：点击"攻击"按钮后点射程内的格子（直线/对角线）
- **技能**：查看当前单位词条说明
- **切换单位**：点击己方单位
- **结束回合**：所有操作作废，攻击/步数重置

### 8.3 特殊机制

| 机制 | 说明 |
|------|------|
| 暴击 | 5% 概率双倍伤害 |
| 未命中 | 5% 概率伤害为 0 |
| 护盾 | 抵挡伤害，可挡一次核弹 |
| 冷却 | 攻击次数用完后进入 N 完整回合冷却 |
| 复活 | 坦克死亡后 6 完整回合复活 |
| 跳板 | 按重量等待 N 回合后跳跃到目标格 |
| 辐射场 | 核弹发射车本体和核弹爆点周围有辐射伤害 |
| 碾压 | 超重型坦克可以碾压单位、化桥为河、压碎障碍 |

### 8.4 坦克列表（24 种）

| ID | 名称 | HP | 速度 | 射程 | 攻击 | 特点 |
|----|------|-----|------|------|------|------|
| basic | 普通坦克 | 3 | 2 | 5 | 1 | 数值均等 |
| water_ghost | 水陆两栖战车 | 2 | 1 | 3 | 1 | 可涉水，水中攻击+1 |
| fast_tank | 快速坦克 | 1.5 | 4 | 4 | 1 | 速度快 |
| armored_car | 装甲车 | 2 | 2 | 4 | 0.5 | 一回合 3 次攻击 |
| heavy_tank | 重型坦克 | 4 | 1 | 5 | 2 | 坚固前排，冷却1 |
| apocalypse | 天启坦克 | 2 | 1 | 4 | 999 | 仅直线攻击，冷却2 |
| shield_tank | 防爆车 | 2 | 2 | 4 | 0.5 | 护盾0.5，攻击2次 |
| siege_tank | 攻城车 | 5 | 1 | 1 | 3 | 对基地×2伤害 |
| super_heavy | 超重型坦克 | 6.5 | 1 | 3 | 0.5 | 碾压一切 |
| melee_tank | 近战坦克 | 3 | 3 | 1 | 1.5 | 拼刺刀 |
| engineer | 工程师坦克 | 1.5 | 2 | 0 | 0 | 建造机器人 |
| rocket_launcher | 火箭发射车 | 1.5 | 2 | 0 | 0 | 建造导弹 |
| nuke_launcher | 核弹发射车 | 2 | 1 | 0 | 0 | 建造核弹 |

### 8.5 地图列表（6 张）

| ID | 名称 | 尺寸 | 标签 |
|----|------|------|------|
| position_zero | 0号阵地 | 10×7 | 平衡、水战 |
| crossroads | 十字路口 | 10×8 | 复杂、跳板 |
| chu_han | 楚河汉界 | 12×8 | 水战、跳板 |
| twin_rivers | 双河对峙 | 10×8 | 水战、跳板 |
| island | 孤岛 | 10×9 | 水战、复杂 |
| stone_field | 石阵 | 10×9 | 攻坚、复杂 |

---

## 九、版本历史

### V7.2（2026-09-18）当前版本
- **用户系统**：注册、登录、退出，基于 Cloudflare D1 云存档
- **坦克解锁**：人机对战胜利一局解锁下一辆坦克
- **排行榜**：按胜场/伤害/场次排名
- **前端集成**：`auth-menu` 和 `leaderboard-screen` 屏幕
- **后端 API**：`/api/auth/*`、`/api/game/*`、`/api/leaderboard`

### V7.1（2026-09-13）
- 2.5D 立体化：全场景 2.5D 投影
- 核弹系统：核弹发射车、5×5 爆炸、辐射污染格
- 导弹系统：火箭发射车、导弹自爆 3×3
- 超重型坦克：碾压一切、化桥为河、可下水
- 水陆两栖战车：水中速度 3、陆上 1
- 护盾可挡一次核弹
- 新增 3 张地图（双河对峙、孤岛、石阵）
- 修复：己方单位重叠、复活点重叠、跳板落点校验等

### V7.0（2026-09-12）
- 新增核弹发射车、核弹、辐射场
- 新增超重型坦克
- 新增水陆两栖战车
- 坦克炮塔随移动/攻击转向
- 伤害数字浮动显示

### V6.2（2026-09-06）
- 火箭发射车 + 导弹自爆
- 本体死亡建造物消失 + 死亡动画
- AI 完全利用步数/攻击次数
- 人机托管功能

### V6.1（2026-09-05）
- AI 局面评估 + 行动模拟
- 工程师建造冷却显示
- 跳板等待图标
- 楚河汉界增加桥梁

### V6.0（2026-09-05）
- 完整回合制、AI 增强、特效系统
- 工程师连续建造、机器人死亡移除、自动跳过
- 设置菜单：音效与音乐独立

### V5.0（2026-08-30）
- 多单位操作、工程师坦克与机器人
- 修复桥通行、跳板重量统一、护盾显示

---

## 十、开发约定

### 10.1 代码风格

- **前端**：单文件 `index.html`，所有 CSS 在 `<style>`，所有 JS 在 `<script>`。
- **命名**：
  - 函数：`camelCase`（如 `executeMove`）
  - 常量：`UPPER_SNAKE_CASE`（如 `TANK_CONFIGS`）
  - 屏幕 ID：`kebab-case`（如 `game-screen`）
  - 全局状态变量：`camelCase`（如 `currentTeam`）
- **注释**：关键区块用 `/* === 标题 === */` 分隔，中英文混用可接受。
- **中文字体**：Canvas 绘制文本统一使用 `CJK_FONT` 常量，防止乱码。

### 10.2 新增功能时的注意事项

1. **新增屏幕**：
   - 在 `#screens` 内加一个 `.screen` div
   - 把 ID 加入 `SCREEN_IDS` 数组
   - 用 `switchScreen('your-id')` 切换

2. **新增坦克**：
   - 在 `TANK_CONFIGS` 数组里加配置对象
   - 在 `functions/api/game/unlock.js` 的 `UNLOCK_ORDER` 里加入解锁顺序
   - 在 `drawTankIconSVG` 里加对应 SVG 图标（可选）
   - 在 `drawTank3D` 里加对应 Canvas 绘制逻辑（可选，默认会画通用坦克）

3. **新增地图**：
   - 在 `MAP_CONFIGS` 数组里加配置
   - 定义 `specialTerrain` 和 `riverRanges`
   - 图鉴缩略图会自动生成

4. **新增 API**：
   - 在 `functions/api/` 下新建 `.js` 文件，路径即 URL
   - 导出 `onRequestGet`、`onRequestPost` 等函数
   - 从 `context.env.DB` 访问 D1 数据库
   - 认证：从 `Authorization` 头读 Bearer token 并校验 `sessions` 表

5. **新增数据库表/字段**：
   - 写 SQL 到 `migrations/0002_xxx.sql`
   - 在 Cloudflare D1 Console 手动执行（或后续用 wrangler）
   - 更新本 README 的数据库结构章节

### 10.3 密码哈希

当前使用 Web Crypto API 的 SHA-256 + salt。**未使用 bcrypt**（因为 Cloudflare Workers 环境不原生支持）。

```javascript
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**安全提示**：SHA-256 不是密码哈希的推荐算法（易被彩虹表攻击），但配合随机 salt 已经能抵御基本攻击。若需更强安全性，可考虑改用 PBKDF2（Web Crypto 支持）。

### 10.4 会话 Token

- 32 字节随机 hex（`crypto.getRandomValues`）
- 存入 `sessions` 表，有效期 7 天
- 前端存 `localStorage.tank_token`
- 请求头：`Authorization: Bearer <token>`

---

## 十一、常见迭代场景指引

> 以下场景可直接复制给 AI 助手，配合本 README 使用。

### 场景 1：新增一辆坦克

```
参考 README 第 10.2 节"新增坦克"，
在 TANK_CONFIGS 中新增一辆坦克，配置如下：
- id: 'laser_tank'
- name: '激光坦克'
- hp: 2, speed: 3, range: 6, attack: 0.8
- weight: 'standard'
- special: 'pierce'（穿甲：攻击贯穿第一个单位）
- 颜色: #00ff88
并在 UNLOCK_ORDER 中加入解锁位置。
同时更新 README 第 8.4 节的坦克列表。
```

### 场景 2：新增一张地图

```
参考 README 第 10.2 节"新增地图"，
添加一张 12×10 的地图，名为"火山口"，
特点：中央有大片河流环绕的孤岛，
跳板对：B3 ↔ K8，
地形：边缘有障碍物。
```

### 场景 3：新增成就系统

```
参考 README 第 5 节数据库结构，
新增一张 achievements 表，字段：
- id, user_id, achievement_key, unlocked_at
achievement_key 取值：'first_win', '10_wins', 'no_loss_5',
'nuke_kill', 'perfect_win' 等。
新增 API /api/game/achievements GET/POST。
前端在结算界面检查并展示成就。
```

### 场景 4：AI 增强

```
参考 README 第 7.6 节，
当前 AI 逻辑在 aiUnitActionSmart() 和 aiSelectBestMove()。
请改进 AI，使其：
1. 优先攻击可以一击必杀的目标
2. 会保护己方总部
3. 会主动抢占跳板
```

### 场景 5：修复 Bug

```
（描述 Bug 现象）
相关代码在：
- 若涉及游戏逻辑：index.html 中的 executeXxx 函数
- 若涉及后端：functions/api/ 下对应文件
- 若涉及数据库：migrations/ 和 D1 Console
```

---

## 十二、已知问题 / 待办

### 待办功能

- [ ] 战役模式（主菜单按钮已预留，暂 disabled）
- [ ] 好友系统
- [ ] 成就系统
- [ ] 坦克皮肤
- [ ] 赛季排行
- [ ] 密码安全升级（PBKDF2 或 Argon2）
- [ ] PVP 联机对战（当前 PVP 是同一设备双方轮流操作）

### 已知问题

- 会话 token 未做刷新机制，7 天后需重新登录
- 排行榜无分页，只显示前 20
- 密码哈希用 SHA-256，安全性一般
- AI 决策是启发式的，非最优解
- 前端单文件较大（约 3000+ 行），后续可考虑模块化

---

## 十三、测试与验证

### 前端测试

直接在浏览器打开 `index.html`（本地文件）也能运行，但用户系统相关的 API 调用会失败（因无后端）。建议：

- 本地测试游戏逻辑：直接双击 `index.html` 打开
- 测试完整功能：部署到 Cloudflare Pages 后测试

### 后端测试

用浏览器或 curl 访问：

```bash
# 排行榜（无需认证）
GET https://你的域名.pages.dev/api/leaderboard

# 注册
POST https://你的域名.pages.dev/api/auth/register
Body: { "username": "test", "password": "123456" }

# 登录后获取信息
GET https://你的域名.pages.dev/api/auth/me
Headers: Authorization: Bearer <token>
```

### 数据库验证

Cloudflare Dashboard → D1 → 你的数据库 → Console：

```sql
SELECT * FROM users;
SELECT * FROM user_saves;
SELECT * FROM match_records ORDER BY created_at DESC LIMIT 10;
SELECT * FROM sessions WHERE expires_at > datetime('now');
```

---

## 十四、联系与协作

- **项目起源**：由 DeepSeek 与 钱发麒 联合生成
- **设计**：龚兆琦
- **当前版本**：V7.2（2026-09-18）
- **迭代方式**：每次新功能开发时，将本 README 附给 AI 助手，即可获得完整上下文

---

## 十五、快速参考：给 AI 助手的一句话说明

> 这是一个名为"坦克大战"的回合制 2.5D 战棋游戏。前端是单文件 `index.html`（含 HTML/CSS/JS，Canvas 2D 绘制），后端是 Cloudflare Pages Functions，数据库是 Cloudflare D1。游戏支持双人对战和人机对战，有 13 种坦克、6 张地图、核弹/导弹/辐射等复杂机制。V7.2 加入了用户系统（注册/登录/云存档/坦克解锁/排行榜）。所有 API 在 `functions/api/` 下，数据库表结构见 `migrations/0001_init.sql`。请参考本 README 的详细说明进行迭代开发。