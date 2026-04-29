// ============================================================
// game.js — メインゲームロジック（安定版 + 演出対応）
// ============================================================

const G = {
  mode: 'cpu',
  phase: 'title',
  stage: 1,
  currentPlayer: 0,
  deckSelect: [[], []],
  pieces: [],
  obstacles: [],
  effects: [],
  aiming: null,
  aimBlocked: null,
  trajectory: null,
  knightTarget: null,
  knightMode: null,
  jumpAnim: null,
  highlightOwner: -1,
  movingPiece: null,
  placementStep: 0,
  placePalette: [],
  placeObsLeft: 0,
  dragging: null,
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CW;
canvas.height = CH;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  
  const sidebar = document.getElementById('sidebar');
  const app = document.getElementById('app');
  if (sidebar && app) {
    if (id === 'screen-title') {
      sidebar.style.display = 'none';
      app.classList.add('sidebar-hidden');
    } else {
      sidebar.style.display = 'flex';
      app.classList.remove('sidebar-hidden');
    }
  }
}

// ---- タイトル ----
document.getElementById('btn-pvp').onclick = () => { G.mode = 'pvp'; G.stage = 1; startDeckSelect(0); };
document.getElementById('btn-cpu').onclick = () => { G.mode = 'cpu'; G.stage = 1; startDeckSelect(0); };

// ---- デッキ選択 ----
function startDeckSelect(player) {
  const screen = document.getElementById('screen-deck');
  screen.classList.remove('p1-active', 'p2-active');
  screen.classList.add(player === 0 ? 'p1-active' : 'p2-active');
  
  G.phase = 'deck';
  G.currentPlayer = player;
  G.deckSelect[player] = [];
  document.getElementById('deck-label').textContent = `プレイヤー${player+1} デッキ選択`;
  document.getElementById('sel-count').textContent = '0';
  document.getElementById('sel-list').innerHTML = '';
  document.getElementById('btn-deck-ok').disabled = true;

  const grid = document.getElementById('piece-options');
  grid.innerHTML = '';
  FREE_PIECES.forEach(type => {
    const def = PIECE_DEFS[type];
    const card = document.createElement('div');
    card.className = 'piece-card';
    const dir = def.desc ? def.desc.split('\n')[0] : '';
    const wt = def.weight || 1.0;
    card.innerHTML = `<div class="kanji" style="color:${def.color}; text-shadow: 2px 2px 0 #000;">${def.kanji}</div>
      <div class="pname">${def.name}</div>
      <div class="pdir">${dir}</div>
      <div class="pstats">
        <div class="stat-row"><span class="s-lbl">HP</span><div class="bar-bg"><div class="bar bg-hp" style="width:${Math.min(100, def.hp/15*100)}%"></div></div><span class="s-val">${def.hp}</span></div>
        <div class="stat-row"><span class="s-lbl">ATK</span><div class="bar-bg"><div class="bar bg-atk" style="width:${Math.min(100, def.atk/6*100)}%"></div></div><span class="s-val">${def.atk}</span></div>
        <div class="stat-row"><span class="s-lbl">WT</span><div class="bar-bg"><div class="bar bg-wt" style="width:${Math.min(100, wt/2.0*100)}%"></div></div><span class="s-val">${wt}</span></div>
        <div class="stat-row"><span class="s-lbl">SPD</span><div class="bar-bg"><div class="bar bg-spd" style="width:${Math.min(100, def.speed/12*100)}%"></div></div><span class="s-val">${def.speed}</span></div>
      </div>`;
    card.onclick = () => {
      const sel = G.deckSelect[player];
      if (sel.length < 3) { sel.push(type); updateDeckUI(player); }
    };
    grid.appendChild(card);
  });
  showScreen('screen-deck');
}

function updateDeckUI(player) {
  const sel = G.deckSelect[player];
  document.getElementById('sel-count').textContent = sel.length;
  const list = document.getElementById('sel-list');
  list.innerHTML = sel.map((t, idx) => 
    `<span class="sel-chip" onclick="removeDeckItem(${idx}, ${player})">${PIECE_DEFS[t].kanji} ${PIECE_DEFS[t].name} ✕</span>`
  ).join('');
  document.getElementById('btn-deck-ok').disabled = sel.length < 3;
}

window.removeDeckItem = (idx, player) => {
  G.deckSelect[player].splice(idx, 1);
  updateDeckUI(player);
};

document.getElementById('btn-deck-ok').onclick = () => {
  if (G.mode === 'pvp' && G.currentPlayer === 0) startDeckSelect(1);
  else {
    if (G.mode === 'cpu') G.deckSelect[1] = [...FREE_PIECES].sort(() => Math.random() - 0.5).slice(0, 3);
    startPlacement(0);
  }
};

// ---- 配置フェーズ ----
function startPlacement(player) {
  const screen = document.getElementById('screen-placement');
  screen.classList.remove('p1-active', 'p2-active');
  screen.classList.add(player === 0 ? 'p1-active' : 'p2-active');

  G.placementStep = player;
  G.currentPlayer = player;
  G.phase = 'placement';
  
  // 新しいステージ/試合の開始時（Player 0 の配置）に盤面をリセット
  if (player === 0) {
    G.pieces = [];
    G.obstacles = [];
  } else {
    // PvPなどでPlayer 1が配置する場合は、Player 1の分だけクリア（再配置用）
    G.pieces = G.pieces.filter(p => p.owner !== player);
    G.obstacles = G.obstacles.filter(o => o.owner !== player);
  }
  
  const types = ['king', 'pawn','pawn','pawn','pawn', ...G.deckSelect[player]];
  const counts = {};
  types.forEach(t => counts[t] = (counts[t]||0)+1);
  G.placePalette = Object.entries(counts).map(([type, count]) => ({ type, count, placed: 0 }));
  G.placeObsLeft = 2;

  document.getElementById('place-label').textContent = `プレイヤー${player+1} 配置フェーズ`;
  document.getElementById('place-inst').textContent = `${player===0?'下':'上'}の青枠内に駒を置いてください`;
  
  const ui = document.getElementById('placement-ui');
  if (player === 1) ui.classList.add('bottom');
  else ui.classList.remove('bottom');

  document.getElementById('btn-place-auto').onclick = () => autoPlaceAll(player);
  buildPlacePalette();
  showScreen('screen-placement');
  updatePlaceOkBtn();
}

function buildDeckTypes(player) {
  return ['king', 'pawn', 'pawn', 'pawn', 'pawn', ...G.deckSelect[player]];
}

function autoPlaceAll(player) {
  // すべての駒をクリア
  G.pieces = G.pieces.filter(p => p.owner !== player);
  G.obstacles = G.obstacles.filter(o => o.owner !== player);
  G.placePalette.forEach(e => e.placed = 0);
  G.placeObsLeft = 2; // リセット

  const py = (y) => player === 0 ? CH - y : y; // P1は下から、P2は上から

  // 1. 王将 (中央最後列)
  const kingX = CW / 2, kingY = py(40);
  placeOne(player, 'king', kingX, kingY);

  // 2. 障害物 (王を守るように2枚、十分な距離を離す)
  placeObsOne(player, kingX - 80, py(120));
  placeObsOne(player, kingX + 80, py(120));

  // 3. 歩兵 (最前列に4枚)
  for (let i = 0; i < 4; i++) {
    const px = (CW / 5) * (i + 1);
    placeOne(player, 'pawn', px, py(220));
  }

  // 4. 選択された駒 (中段に並べる)
  const selTypes = G.deckSelect[player];
  for (let i = 0; i < selTypes.length; i++) {
    const px = (CW / (selTypes.length + 1)) * (i + 1);
    placeOne(player, selTypes[i], px, py(140));
  }

  // 5. それ以外 (もしあればランダム)
  const remaining = G.placePalette.filter(e => e.placed < e.count);
  remaining.forEach(entry => {
    let attempts = 0;
    while (entry.placed < entry.count && attempts < 100) {
      const rx = Math.random() * (CW - 60) + 30;
      const ry = player === 0 ? (Math.random() * (CH/3 - 100) + CH*2/3 + 30)
                              : (Math.random() * (CH/3 - 100) + 70);
      placeOne(player, entry.type, rx, ry);
      attempts++;
    }
  });

  buildPlacePalette();
  updatePlaceOkBtn();
}

function placeOne(player, type, x, y) {
  if (canPlacePiece(x, y)) {
    G.pieces.push(createPiece(type, player, x, y));
    const entry = G.placePalette.find(en => en.type === type);
    if (entry) entry.placed++;
    return true;
  }
  return false;
}

function placeObsOne(player, x, y) {
  if (canPlaceObs(x, y) && G.placeObsLeft > 0) {
    G.obstacles.push({ x: x, y: y, w: OBS_W, h: OBS_H, owner: player });
    G.placeObsLeft--;
    return true;
  }
  return false;
}

function buildPlacePalette() {
  const palette = document.getElementById('place-palette');
  palette.innerHTML = '';
  G.placePalette.forEach((entry, i) => {
    const def = PIECE_DEFS[entry.type];
    const rem = entry.count - entry.placed;
    const item = document.createElement('div');
    item.className = 'palette-item' + (rem <= 0 ? ' placed' : '');
    item.innerHTML = `<span class="p-kanji" style="color:${def.color}">${def.kanji}</span>
      <span class="p-label">${def.name}</span><span class="p-count">残 ${rem}</span>`;
    if (rem > 0) item.onmousedown = (e) => { e.preventDefault(); dragState = { mode: 'piece', type: entry.type }; };
    palette.appendChild(item);
  });
  if (G.placeObsLeft > 0) {
    const obs = document.createElement('div');
    obs.className = 'palette-item';
    obs.innerHTML = `<span class="p-kanji" style="color:#aaa">壁</span><span class="p-label">障害物</span><span class="p-count">残 ${G.placeObsLeft}</span>`;
    obs.onmousedown = (e) => { e.preventDefault(); dragState = { mode: 'obs' }; };
    palette.appendChild(obs);
  }
}

function updatePlaceOkBtn() {
  const allPlaced = G.placePalette.every(e => e.placed === e.count);
  document.getElementById('btn-place-ok').disabled = !allPlaced;
}

let dragState = null;
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: cx - rect.left, y: cy - rect.top };
}

// キャンバス内での駒移動（再配置）
canvas.addEventListener('mousedown', e => {
  if (G.phase !== 'placement') return;
  const pos = getCanvasPos(e);
  const pIdx = G.pieces.findIndex(p => p.owner === G.currentPlayer && Math.sqrt((p.x-pos.x)**2+(p.y-pos.y)**2) < p.r + 5);
  if (pIdx >= 0) {
    const p = G.pieces.splice(pIdx, 1)[0];
    const entry = G.placePalette.find(en => en.type === p.type);
    if (entry) entry.placed--;
    dragState = { mode: 'piece', type: p.type };
    G.dragging = { ...dragState, x: pos.x, y: pos.y };
    buildPlacePalette(); updatePlaceOkBtn();
    return;
  }
  // 壁の再配置
  const oIdx = G.obstacles.findIndex(o => o.owner === G.currentPlayer && pos.x >= o.x && pos.x <= o.x+o.w && pos.y >= o.y && pos.y <= o.y+o.h);
  if (oIdx >= 0) {
    const o = G.obstacles.splice(oIdx, 1)[0];
    G.placeObsLeft++;
    dragState = { mode: 'obs' };
    G.dragging = { ...dragState, x: pos.x, y: pos.y };
    buildPlacePalette(); updatePlaceOkBtn();
  }
});

window.addEventListener('mousemove', e => {
  if (!dragState) return;
  const pos = getCanvasPos(e);
  G.dragging = { ...dragState, x: pos.x, y: pos.y };
});

window.addEventListener('mouseup', e => {
  if (!dragState) return;
  const pos = getCanvasPos(e);
  if (dragState.mode === 'piece') {
    const entry = G.placePalette.find(en => en.type === dragState.type);
    if (entry && entry.placed < entry.count && canPlacePiece(pos.x, pos.y)) {
      G.pieces.push(createPiece(dragState.type, G.currentPlayer, pos.x, pos.y));
      entry.placed++;
      buildPlacePalette(); updatePlaceOkBtn();
    }
  } else if (dragState.mode === 'obs') {
    const ox = pos.x - OBS_W/2, oy = pos.y - OBS_H/2;
    if (canPlaceObs(ox, oy) && G.placeObsLeft > 0) {
      G.obstacles.push({ x: ox, y: oy, w: OBS_W, h: OBS_H, owner: G.currentPlayer });
      G.placeObsLeft--; buildPlacePalette();
    }
  }
  dragState = null; G.dragging = null;
});

canvas.addEventListener('contextmenu', e => {
  if (G.phase !== 'placement') return;
  e.preventDefault();
  const pos = getCanvasPos(e);
  // 駒の削除
  const pIdx = G.pieces.findIndex(p => p.owner === G.currentPlayer && Math.sqrt((p.x-pos.x)**2+(p.y-pos.y)**2) < PIECE_R + 5);
  if (pIdx >= 0) {
    const p = G.pieces.splice(pIdx, 1)[0];
    const entry = G.placePalette.find(en => en.type === p.type);
    if (entry) entry.placed--;
    buildPlacePalette(); updatePlaceOkBtn();
    return;
  }
  // 壁の削除
  const oIdx = G.obstacles.findIndex(o => o.owner === G.currentPlayer && pos.x >= o.x && pos.x <= o.x+o.w && pos.y >= o.y && pos.y <= o.y+o.h);
  if (oIdx >= 0) {
    G.obstacles.splice(oIdx, 1);
    G.placeObsLeft++;
    buildPlacePalette(); updatePlaceOkBtn();
  }
});

function isInZone(x, y, owner) {
  const m = PIECE_R + 2;
  if (owner === 0) return x >= m && x <= CW-m && y >= P1_ZONE_TOP_Y+m && y <= CH-m;
  return x >= m && x <= CW-m && y >= m && y <= P2_ZONE_BOT_Y-m;
}
function canPlacePiece(x, y) {
  if (!isInZone(x, y, G.currentPlayer)) return false;
  if (G.pieces.some(p => Math.sqrt((p.x-x)**2+(p.y-y)**2) < MIN_PP)) return false;
  if (G.obstacles.some(o => Math.sqrt((o.x+o.w/2-x)**2+(o.y+o.h/2-y)**2) < MIN_PO+OBS_W/2)) return false;
  return true;
}
function canPlaceObs(ox, oy) {
  const cx = ox+OBS_W/2, cy = oy+OBS_H/2;
  const m = 2;
  const inZ = G.currentPlayer === 0 ? (ox >= m && ox+OBS_W <= CW-m && oy >= P1_ZONE_TOP_Y+m && oy+OBS_H <= CH-m)
                                  : (ox >= m && ox+OBS_W <= CW-m && oy >= m && oy+OBS_H <= P2_ZONE_BOT_Y-m);
  if (!inZ) return false;
  if (G.pieces.some(p => Math.sqrt((p.x-cx)**2+(p.y-cy)**2) < MIN_PO+OBS_W/2)) return false;
  if (G.obstacles.some(o => Math.sqrt((o.x+o.w/2-cx)**2+(o.y+o.h/2-cy)**2) < MIN_OO)) return false;
  return true;
}

document.getElementById('btn-place-ok').onclick = () => {
  if (G.mode === 'pvp' && G.placementStep === 0) startPlacement(1);
  else {
    if (G.mode === 'cpu' || G.mode === 'joi') {
      let deck;
      if (G.mode === 'joi') {
        // JOI戦：王が超JOIに、それ以外もJOIになる
        deck = ['super_joi', 'joi', 'joi', 'joi', 'joi', 'joi', 'joi', 'joi'];
      } else {
        deck = buildDeckTypes(1);
      }
      const { pieces, obstacles } = cpuAutoPlace(deck, G.obstacles);
      G.pieces.push(...pieces); G.obstacles.push(...obstacles);
    }
    startBattle();
  }
};

// ---- バトル ----
function startBattle() {
  G.phase = 'battle'; G.currentPlayer = 0; G.effects = [];
  showScreen('screen-battle'); updateBattleUI();
}

function updateBattleUI() {
  const p1c = G.pieces.filter(p => p.owner === 0).length, p2c = G.pieces.filter(p => p.owner === 1).length;
  document.getElementById('p1-count').innerHTML = `自分の残り: <strong>${p1c}</strong>`;
  const enemyLabel = (G.mode === 'cpu') ? `CPU (Stage ${G.stage})` : '相手';
  document.getElementById('p2-count').innerHTML = `${enemyLabel}の残り: <strong>${p2c}</strong>`;
  
  const turnText = G.mode === 'cpu' ? (G.currentPlayer === 0 ? 'あなたのターン' : `CPUのターン`) : `プレイヤー${G.currentPlayer+1}のターン`;
  document.getElementById('turn-banner').textContent = turnText;

  const winCountEl = document.getElementById('cpu-win-count');
  if (G.mode === 'cpu') {
    winCountEl.style.display = 'block';
    winCountEl.querySelector('strong').textContent = G.stage - 1;
  } else {
    winCountEl.style.display = 'none';
  }
  
  const inst = G.currentPlayer === 0 ? '駒をドラッグして飛ばしてください' : (G.mode === 'cpu' ? 'CPUが思考中...' : '相手の操作を待ってください');
  document.getElementById('battle-inst').textContent = inst;
}

let aimPiece = null;
canvas.addEventListener('mousedown', e => {
  if (G.phase !== 'battle') return;
  if (G.mode === 'cpu' && G.currentPlayer === 1) return;
  const pos = getCanvasPos(e);
  if (G.jumpAnim) return;

  const p = G.pieces.find(p => p.owner === G.currentPlayer && !p.moving && Math.sqrt((p.x-pos.x)**2+(p.y-pos.y)**2) < p.r + 10);
  if (p) {
    aimPiece = p;
    G.aiming = { piece: p, mx: pos.x, my: pos.y };
  }
});

canvas.addEventListener('mousemove', e => {
  if (G.phase !== 'battle' || !aimPiece) return;
  const pos = getCanvasPos(e);
  G.aiming = { piece: aimPiece, mx: pos.x, my: pos.y };

  const dx = aimPiece.x - pos.x, dy = aimPiece.y - pos.y;
  let d = Math.sqrt(dx*dx+dy*dy);
  if (d < 10) { G.trajectory = null; G.knightTarget = null; return; }
  d = Math.min(d, MAX_DRAG_DIST);

  const pw = Math.min(d/4, MAX_POWER), vx = (dx/d)*pw, vy = (dy/d)*pw;
  
  if (aimPiece.jumpType) {
    // 桂馬の着地予想地点 (力に応じて距離が変わる)
    const jumpDist = d * 1.75; 
    const angle = Math.atan2(dy, dx);
    const tx = aimPiece.x + Math.cos(angle) * jumpDist;
    const ty = aimPiece.y + Math.sin(angle) * jumpDist;
    
    const ok = aimPiece.owner === 0 ? ty < aimPiece.y : ty > aimPiece.y;
    G.knightTarget = ok ? { x: tx, y: ty, r: aimPiece.landRadius } : null;
    G.aimBlocked = null;
    G.trajectory = null;
  } else {
    G.knightTarget = null;
    if (!isAngleAllowed(Math.atan2(vy, vx), aimPiece.launchAngle, aimPiece.owner)) {
      G.trajectory = null; G.aimBlocked = { piece: aimPiece, mx: pos.x, my: pos.y };
    } else {
      G.aimBlocked = null; G.trajectory = calcTrajectory(aimPiece, vx, vy, G.obstacles, G.pieces.filter(p => p.owner !== aimPiece.owner));
    }
  }
});

canvas.addEventListener('mouseup', e => {
  if (G.phase !== 'battle' || !aimPiece) return;
  const pos = getCanvasPos(e);
  const dx = aimPiece.x - pos.x, dy = aimPiece.y - pos.y;
  let d = Math.sqrt(dx*dx+dy*dy);
  d = Math.min(d, MAX_DRAG_DIST);

  if (d > 12) {
    if (aimPiece.jumpType) {
      if (G.knightTarget) {
        G.jumpAnim = { 
          piece: aimPiece, 
          sx: aimPiece.x, sy: aimPiece.y, 
          tx: G.knightTarget.x, ty: G.knightTarget.y, 
          frame: 0, totalFrames: KNIGHT_JUMP_FRAMES, landRadius: aimPiece.landRadius 
        };
        aimPiece.moving = true; aimPiece.isOperated = true; G.movingPiece = aimPiece;
      }
    } else {
      const pieceMaxSpd = aimPiece.maxSpeed ? Math.min(MAX_POWER, aimPiece.maxSpeed) : MAX_POWER;
      const pw = Math.min(d/4, pieceMaxSpd), vx = (dx/d)*pw, vy = (dy/d)*pw;
      if (isAngleAllowed(Math.atan2(vy, vx), aimPiece.launchAngle, aimPiece.owner)) {
        aimPiece.vx = vx; aimPiece.vy = vy; aimPiece.moving = true; aimPiece.hitTargets = new Map();
        aimPiece.isOperated = true;
        G.movingPiece = aimPiece;
      }
    }
  }
  aimPiece = null; G.aiming = null; G.trajectory = null; G.knightTarget = null;
});

// ターン終了時に重なりを解消する
function resolveOverlaps() {
  const PUSH_STEP = (CW / 9) / 5; // 1/5マスの移動量 (約13.3px)
  for (let iter = 0; iter < 15; iter++) {
    let moved = false;
    for (let i = 0; i < G.pieces.length; i++) {
      const p = G.pieces[i];
      // 他の駒との重なり解消
      for (let j = i + 1; j < G.pieces.length; j++) {
        const other = G.pieces[j];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p.r + other.r;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.1;
          const nx = dx / dist;
          const ny = dy / dist;
          // 重なっている場合、1/5マス分を基本として押し出す
          const moveDist = Math.max(minDist - dist + 1, PUSH_STEP);
          p.x += nx * moveDist * 0.5;
          p.y += ny * moveDist * 0.5;
          other.x -= nx * moveDist * 0.5;
          other.y -= ny * moveDist * 0.5;
          moved = true;
        }
      }

      // 壁（障害物）との重なり解消
      for (const obs of G.obstacles) {
        const nearX = Math.max(obs.x, Math.min(p.x, obs.x + obs.w));
        const nearY = Math.max(obs.y, Math.min(p.y, obs.y + obs.h));
        const dx = p.x - nearX;
        const dy = p.y - nearY;
        const distSq = dx * dx + dy * dy;
        if (distSq < p.r * p.r) {
          const dist = Math.sqrt(distSq) || 0.1;
          const nx = dx / dist;
          const ny = dy / dist;
          const moveDist = Math.max(p.r - dist + 1, PUSH_STEP);
          p.x += nx * moveDist;
          p.y += ny * moveDist;
          moved = true;
        }
      }

      // 盤面外補正：壁に実際にめり込んだときのみ、2マス分中央へ押し戻す
      const cellW = CW / 9;
      const pushDist = cellW * 2;
      const r = p.r;
      if (p.x < r) { p.x = r + pushDist; moved = true; }
      if (p.x > CW - r) { p.x = CW - r - pushDist; moved = true; }
      if (p.y < r) { p.y = r + pushDist; moved = true; }
      if (p.y > CH - r) { p.y = CH - r - pushDist; moved = true; }
    }
    if (!moved) break;
  }
}

function endTurn() {
  resolveOverlaps(); // ターン終了時に重なり解消
  
  // 全ての駒の状態を完全にリセット
  G.pieces.forEach(p => {
    p.moving = false;
    p.vx = 0;
    p.vy = 0;
    p.bounceCount = 0;
    p.pierceCount = 0;
    p.isOperated = false;
    if (p.hitTargets) p.hitTargets.clear();
    else p.hitTargets = new Map();
  });
  
  G.movingPiece = null;
  if (!G.pieces.some(p => p.owner === 0 && p.type === 'king')) return gameover(1);
  const enemyKingType = G.mode === 'joi' ? 'super_joi' : 'king';
  if (!G.pieces.some(p => p.owner === 1 && p.type === enemyKingType)) {
    if (G.mode === 'cpu' || G.mode === 'joi') { G.stage++; startPlacement(0); } else gameover(0);
    return;
  }
  G.currentPlayer = G.currentPlayer === 0 ? 1 : 0; updateBattleUI();
  if ((G.mode === 'cpu' || G.mode === 'joi') && G.currentPlayer === 1) setTimeout(cpuTurn, 800);
}

function gameover(winner) {
  G.phase = 'result';
  const t = document.getElementById('result-title');
  if (G.mode === 'cpu') {
    if (winner === 0) {
      t.textContent = `${G.stage - 1}人抜き達成！`;
    } else {
      t.textContent = `${G.stage - 1}人抜きで終了`;
    }
  } else if (G.mode === 'joi') {
    if (winner === 0) {
      t.textContent = `${G.stage - 1}JOI達成！`; // 勝つことは基本的にないかステージ進行ですが念のため
    } else {
      t.textContent = `JOI!!!に負けた！！`;
    }
  } else {
    t.textContent = `プレイヤー${winner + 1}の勝利！`;
  }
  
  // もう一度ボタンの色を負けた方の色にする
  const retryBtn = document.getElementById('btn-retry');
  if (winner === 0) {
    retryBtn.style.backgroundColor = 'var(--red-main)'; // 負けたのはP2（赤）
  } else {
    retryBtn.style.backgroundColor = 'var(--blue-main)'; // 負けたのはP1（青）
  }

  showScreen('screen-result');
}

function cpuTurn() {
  const cpuP = G.pieces.filter(p => p.owner === 1 && !p.moving), playerP = G.pieces.filter(p => p.owner === 0);
  if (cpuP.length === 0) { G.currentPlayer = 0; updateBattleUI(); return; }
  const dec = cpuDecide(cpuP, playerP, G.obstacles);
  if (!dec) {
    const p = cpuP[Math.floor(Math.random()*cpuP.length)], a = Math.PI/2;
    p.vx = 0; p.vy = p.speed; p.moving = true; p.hitTargets = new Map(); p.isOperated = true; G.movingPiece = p;
  } else {
    if (dec.jumpType) {
      G.jumpAnim = { piece: dec.piece, sx: dec.piece.x, sy: dec.piece.y, tx: dec.tx, ty: dec.ty, frame: 0, totalFrames: KNIGHT_JUMP_FRAMES, landRadius: dec.piece.landRadius };
      dec.piece.moving = true; dec.piece.isOperated = true; G.movingPiece = dec.piece;
    } else {
      dec.piece.vx = dec.vx; dec.piece.vy = dec.vy; dec.piece.moving = true; dec.piece.hitTargets = new Map(); dec.piece.isOperated = true; G.movingPiece = dec.piece;
    }
  }
}

document.getElementById('btn-retry').onclick = () => { G.stage = 1; G.pieces = []; G.obstacles = []; startDeckSelect(0); };
document.getElementById('btn-to-title').onclick = () => { G.phase = 'title'; G.pieces = []; G.obstacles = []; showScreen('screen-title'); };

function gameLoop() {
  if (G.phase === 'placement' || G.phase === 'battle') {
    if (G.jumpAnim) {
      G.jumpAnim.frame++;
      if (G.jumpAnim.frame >= G.jumpAnim.totalFrames) {
        const { piece, tx, ty, landRadius } = G.jumpAnim;
        piece.x = tx; piece.y = ty; piece.moving = false;
        G.pieces.filter(p => p.owner !== piece.owner && Math.sqrt((p.x-tx)**2+(p.y-ty)**2) < landRadius + p.r).forEach(t => {
          t.hp -= piece.atk;
          const dmgText = G.mode === 'joi' ? `${piece.atk * 15}pt JOI!!!` : `-${piece.atk}`;
          G.effects.push({ x: t.x, y: t.y - 10, frame: 0, type: 'damage', text: dmgText });
          if (t.hp <= 0) { 
            const capText = G.mode === 'joi' ? `JOI!!!!!!!!!` : '撃破!';
            G.effects.push({ x: t.x, y: t.y, frame: 0, type: 'capture', text: capText }); 
            G.pieces = G.pieces.filter(p => p.id !== t.id); 
          }
        });
        G.jumpAnim = null; updateBattleUI(); endTurn();
      }
    }
    const isMoving = G.pieces.some(p => p.moving);
    if ((G.movingPiece || isMoving) && !G.jumpAnim) {
      const removedIds = new Set();
      G.pieces.forEach(p => {
        if (p.moving) {
          const events = physicsStep(p, G.pieces, G.obstacles);
          events.forEach(ev => {
            if (ev.type === 'damage') {
              const dmgText = G.mode === 'joi' ? `${p.atk * 15}pt JOI!!!` : ev.text;
              G.effects.push({ x: ev.x, y: ev.y, frame: 0, type: 'damage', text: dmgText });
            } else if (ev.type === 'capture') {
              const capText = G.mode === 'joi' ? `JOI!!!!!!!!!` : '撃破!';
              G.effects.push({ x: ev.x, y: ev.y, frame: 0, type: 'capture', text: capText });
              removedIds.add(ev.id);
            }
          });
        }
      });
      if (removedIds.size > 0) {
        G.pieces = G.pieces.filter(p => !removedIds.has(p.id));
        updateBattleUI();
      }
      if (!G.pieces.some(p => p.moving)) {
        G.pieces.forEach(p => {
          if (p.promoted || !PIECE_DEFS[p.type]?.canPromote) return;
          if (p.owner === 0 ? p.y < P1_PROMOTE_Y : p.y > P2_PROMOTE_Y) { p.promoted = true; p.hp += 2; G.effects.push({ x: p.x, y: p.y, frame: 0 }); }
        });
        updateBattleUI(); endTurn();
      }
    }
    G.effects.forEach(ef => ef.frame++); G.effects = G.effects.filter(ef => ef.frame < 30);
    renderFrame(G);
  } else {
    if (G.phase === 'title' && document.body.classList.contains('kakuhen-active')) {
      ctx.clearRect(0, 0, CW, CH);
    } else {
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, CW, CH);
    }
  }
  requestAnimationFrame(gameLoop);
}
// ---- 隠しコマンド (J-O-I) ----
let commandIdx = 0;
const COMMAND_SEQ = ['j', 'o', 'i'];
window.addEventListener('keydown', e => {
  if (G.phase !== 'title') return;
  if (e.key.toLowerCase() === COMMAND_SEQ[commandIdx]) {
    commandIdx++;
    if (commandIdx === COMMAND_SEQ.length) {
      activateKakuhen();
      commandIdx = 0;
    }
  } else {
    commandIdx = 0;
  }
});

function activateKakuhen() {
  const overlay = document.getElementById('kakuhen-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.classList.add('kakuhen-active');
  
  // 演出
  setTimeout(() => {
    overlay.classList.remove('active');
  }, 2000);
}

document.getElementById('btn-joi').onclick = () => {
  G.mode = 'joi';
  G.stage = 1;
  startDeckSelect(0);
};

gameLoop();
showScreen('screen-title');
