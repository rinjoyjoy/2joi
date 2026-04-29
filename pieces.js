// ============================================================
// pieces.js — 駒の定義
// ============================================================

const PIECE_DEFS = {
  king: {
    name: '王将', kanji: '王',
    color: '#E8C547', border: '#A08000',
    speed: 8,
    hp: 20,
    atk: 1,
    weight: 5,
    maxSpeed: 3,
    piercing: false,
    jumpType: false,
    launchAngle: 'any',
    desc: '全方向・超重量\nHP:20 ATK:1 WT:5',
    canPromote: false,
  },
  pawn: {
    name: '歩兵', kanji: '歩',
    color: '#C8C8C8', border: '#888',
    speed: 6,
    hp: 2,
    atk: 1,
    weight: 0.3,
    maxSpeed: 7,
    piercing: false,
    jumpType: false,
    launchAngle: 'forward',
    desc: '最弱・軽量\nHP:2 ATK:1 WT:0.3',
    canPromote: true,
    prom: {
      name: 'と金', kanji: 'と',
      color: '#FFD060', border: '#B88000',
      speed: 10, hp: 6, atk: 2, weight: 1.0, maxSpeed: 7, piercing: false, launchAngle: 'any',
    },
  },
  rook: {
    name: '飛車', kanji: '飛',
    color: '#FF7070', border: '#CC2020',
    speed: 10,
    hp: 10,
    atk: 4,
    weight: 2.0,
    piercing: false,
    jumpType: false,
    launchAngle: 'rook',
    desc: '縦横・高火力\nHP:10 ATK:4 WT:2.0',
    canPromote: true,
    prom: {
      name: '龍王', kanji: '龍',
      color: '#FF3030', border: '#990000',
      speed: 12, hp: 15, atk: 5, weight: 2.5, piercing: false, launchAngle: 'any',
    },
  },
  bishop: {
    name: '角行', kanji: '角',
    color: '#60C050', border: '#2A7020',
    speed: 11,
    hp: 6,
    atk: 4,
    weight: 0.8,
    piercing: false,
    jumpType: false,
    launchAngle: 'any',
    extraBounces: 8,
    desc: '斜め・高速\nHP:6 ATK:4 WT:0.8',
    canPromote: true,
    prom: {
      name: '龍馬', kanji: '馬',
      color: '#30A030', border: '#105010',
      speed: 10, hp: 10, atk: 3, weight: 1.0, piercing: false, launchAngle: 'any', extraBounces: 12,
    },
  },
  gold: {
    name: '金将', kanji: '金',
    color: '#FFA040', border: '#CC6000',
    speed: 4,
    hp: 12,
    atk: 3,
    weight: 4,
    maxSpeed: 4,
    piercing: false,
    jumpType: false,
    launchAngle: 'gold',
    desc: '後方斜め以外\nHP:12 ATK:3 WT:4',
    canPromote: true,
    prom: {
      name: '成金', kanji: '全',
      color: '#FF7800', border: '#AA3000',
      speed: 10, hp: 16, atk: 4, piercing: false, launchAngle: 'any',
    },
  },
  silver: {
    name: '銀将', kanji: '銀',
    color: '#90A8B8', border: '#406080',
    speed: 5,
    hp: 10,
    atk: 3,
    weight: 1.2,
    maxSpeed: 5,
    piercing: false,
    jumpType: false,
    launchAngle: 'silver',
    desc: '前方+後方斜め\nHP:10 ATK:3 WT:1.2',
    canPromote: true,
    prom: {
      name: '成銀', kanji: '全',
      color: '#5080A0', border: '#204060',
      speed: 11, hp: 14, atk: 3, piercing: false, launchAngle: 'any',
    },
  },
  lance: {
    name: '香車', kanji: '香',
    color: '#40C8E0', border: '#008090',
    speed: 11,
    hp: 4,
    atk: 2,
    weight: 0.5,
    piercing: true,
    jumpType: false,
    launchAngle: 'narrow_forward',
    desc: '貫通・紙装甲\nHP:4 ATK:2 WT:0.5',
    canPromote: true,
    prom: {
      name: '成香', kanji: '杏',
      color: '#00B0C8', border: '#005060',
      speed: 13, hp: 6, atk: 8, weight: 0.8, piercing: true, launchAngle: 'forward',
    },
  },
  knight: {
    name: '桂馬', kanji: '桂',
    color: '#9060D0', border: '#500090',
    speed: 7, // 表示上の最大移動距離パラメータ（実際の動きはジャンプ軌道でこれまで通り）
    hp: 5,
    atk: 5,
    weight: 1.0,
    piercing: false,
    jumpType: true,
    launchAngle: 'jump',
    desc: '爆撃・奇襲\nHP:5 ATK:5 WT:1.0',
    landRadius: KNIGHT_LAND_R,
    canPromote: true,
    prom: {
      name: '成桂', kanji: '圭',
      color: '#6030A8', border: '#300060',
      speed: 0, hp: 8, atk: 8, piercing: false, launchAngle: 'jump',
      landRadius: KNIGHT_LAND_R + 15,
    },
  },
  joi: {
    name: 'JOI', kanji: 'J',
    color: '#FF00FF', border: '#FFF',
    speed: 7, hp: 10, atk: 7, weight: 7,
    maxSpeed: 7, piercing: false, jumpType: false, launchAngle: 'any',
    desc: 'JOI専用駒\nATK:7 SPD:7 WT:7',
    canPromote: false,
  },
  super_joi: {
    name: '超JOI', kanji: 'JOI',
    color: '#FFFF00', border: '#FFF',
    speed: 10, hp: 30, atk: 10, weight: 10,
    maxSpeed: 4, piercing: true, jumpType: true, launchAngle: 'jump',
    desc: 'JOI王専用駒\n超強力ジャンプ',
    landRadius: 60,
    canPromote: false,
  },
};

// 駒インスタンスを生成するファクトリー関数
function createPiece(type, owner, x, y) {
  const def = PIECE_DEFS[type];
  return {
    id: Math.random().toString(36).slice(2),
    type,
    owner,     // 0: P1（下）, 1: P2（上）
    x, y,
    vx: 0, vy: 0,
    r: PIECE_R,
    maxHp: def.hp || 1,
    hp: def.hp || 1,
    atk: def.atk || 1,
    promoted: false,
    moving: false,
    pierceCount: 0,
    bounceCount: 0,
    maxBounces: 30,
    jumpAnim: null,
    hitTargets: new Map(), // 1回の移動で同じ敵に連続ヒットするのを防ぐクールダウン用

    // 現在有効なパラメータ（成り後は prom を参照）
    get def() {
      if (this.promoted && def.prom) return { ...def, ...def.prom };
      return def;
    },
    get kanji() {
      if (this.promoted && def.prom) return def.prom.kanji;
      return def.kanji;
    },
    get color() {
      if (this.promoted && def.prom) return def.prom.color;
      return def.color;
    },
    get borderColor() {
      if (this.promoted && def.prom) return def.prom.border;
      return def.border;
    },
    get speed() {
      if (this.promoted && def.prom) return def.prom.speed;
      return def.speed;
    },
    get piercing() {
      if (this.promoted && def.prom) return def.prom.piercing;
      return def.piercing;
    },
    get launchAngle() {
      if (this.promoted && def.prom) return def.prom.launchAngle;
      return def.launchAngle;
    },
    get extraBounces() {
      if (this.promoted && def.prom) return def.prom.extraBounces || 0;
      return def.extraBounces || 0;
    },
    get jumpType() {
      if (this.promoted && def.prom && def.prom.jumpType !== undefined) return def.prom.jumpType;
      return def.jumpType;
    },
    get landRadius() {
      if (this.promoted && def.prom) return def.prom.landRadius || KNIGHT_LAND_R;
      return def.landRadius || KNIGHT_LAND_R;
    },
    get currentMaxHp() {
      if (this.promoted && def.prom) return def.prom.hp || def.hp;
      return def.hp;
    },
    get atk() {
      if (this.promoted && def.prom) return def.prom.atk || def.atk;
      return def.atk;
    },
    get weight() {
      if (this.promoted && def.prom) return def.prom.weight || def.weight || 1.0;
      return def.weight || 1.0;
    },
    get maxSpeed() {
      return def.maxSpeed || null; // nullなら無制限
    },
  };
}

// 射出角度が有効かチェック（owner: 0=P1は上方向、1=P2は下方向）
function isAngleAllowed(angleRad, launchAngle, owner) {
  if (launchAngle === 'any') return true;
  if (launchAngle === 'jump') return false; 

  const forwardY = owner === 0 ? -1 : 1;
  const nx = Math.cos(angleRad);
  const ny = Math.sin(angleRad);
  const dot = ny * forwardY; 
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);

  // 許容誤差（角度）: 約15度 -> cos(15) = 0.96
  const TOL = 0.96;

  switch (launchAngle) {
    case 'forward': // 歩兵・香車 (真前方のみ)
      return dot > 0.98; // 約10度以内
    case 'narrow_forward': // 香車 (さらに狭く)
      return dot > 0.99; // 約8度以内
    case 'gold': // 金将 (後方斜め以外)
      if (dot > 0.5) return true; // 前方120度
      if (absY < 0.2) return true; // 真横
      if (dot < -0.9) return true; // 真後ろ
      return false;
    case 'silver': // 銀将 (前方+後方斜め)
      if (dot > 0.5) return true; // 前方120度
      if (dot < -0.5 && absX > 0.5) return true; // 後方斜め
      return false;
    case 'rook': // 飛車 (縦横のみ)
      return (absX > TOL || absY > TOL);
    case 'bishop': // 角行 (斜めのみ)
      return Math.abs(absX - absY) < 0.15 && dot !== 0; 
    default:
      return true;
  }
}
