// ============================================================
// ai.js — CPU AIロジック
// ============================================================

// CPU が射出する駒と方向を決定する
// 戻り値: { piece, vx, vy } or null（桂馬の場合はtargetX,targetY）
function cpuDecide(cpuPieces, playerPieces, obstacles) {
  // 射出可能な駒を選ぶ（桂馬以外）
  const nonKnight = cpuPieces.filter(p => !p.jumpType && !p.moving);
  const knights   = cpuPieces.filter(p => p.jumpType && !p.moving);

  // まず桂馬が使える場合、近くにターゲットがあれば使う
  for (const kn of knights) {
    // 着地できる範囲の敵を探す
    const target = playerPieces.find(ep => {
      const dx = ep.x - kn.x;
      const dy = ep.y - kn.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < 210; // 一定範囲内 (MAX_DRAG_DIST * 1.75 = 210)
    });
    if (target) {
      return { piece: kn, jumpType: true, tx: target.x, ty: target.y };
    }
  }

  if (nonKnight.length === 0) return null;

  // 駒を1つ選択（ランダムだが近い敵が多い方向を優先）
  let bestPiece = null;
  let bestResult = null;
  let bestScore = -1;

  for (const piece of nonKnight) {
    for (const enemy of playerPieces) {
      const dx = enemy.x - piece.x;
      const dy = enemy.y - piece.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) continue;

      // 角度チェック
      const angle = Math.atan2(dy, dx);
      if (!isAngleAllowed(angle, piece.launchAngle, 1)) continue;

      const spd = piece.speed;
      const vx = (dx / dist) * spd;
      const vy = (dy / dist) * spd;

      // スコア = 近いほど高い + 王は優先度高い
      const score = (300 - dist) + (enemy.type === 'king' ? 200 : 0)
                  + (enemy.promoted ? 50 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestPiece = piece;
        bestResult = { vx, vy };
      }
    }
  }

  if (!bestPiece) {
    // 打てる方向がなければ適当に撃つ
    const piece = nonKnight[Math.floor(Math.random() * nonKnight.length)];
    const angle = Math.PI / 2; // 真下
    bestPiece = piece;
    bestResult = { vx: 0, vy: piece.speed };
  }

  // 少しランダム誤差を加える（ステージが進むほど精度向上）
  const noiseLevel = Math.max(0.05, 0.35 - (G.stage * 0.05));
  const noise = (Math.random() - 0.5) * noiseLevel;
  const baseAngle = Math.atan2(bestResult.vy, bestResult.vx);
  const finalAngle = baseAngle + noise;
  const spd = bestPiece.speed;

  return {
    piece: bestPiece,
    jumpType: false,
    vx: Math.cos(finalAngle) * spd,
    vy: Math.sin(finalAngle) * spd,
  };
}

// CPU の配置フェーズ（P2陣地に自動配置）
function cpuAutoPlace(deck, obstacles) {
  const placed = [];
  const cpuObstacles = [];

  const margin = PIECE_R + 10;
  const zoneTop = 4;
  const zoneBottom = P2_ZONE_BOT_Y - margin;

  function isValidPos(x, y, r) {
    if (x - r < 2 || x + r > CW - 2) return false;
    if (y - r < 2 || y > zoneBottom) return false;
    for (const p of placed) {
      const dx = p.x - x; const dy = p.y - y;
      if (Math.sqrt(dx*dx+dy*dy) < MIN_PP) return false;
    }
    for (const obs of [...obstacles, ...cpuObstacles]) {
      const cx = obs.x + obs.w/2; const cy = obs.y + obs.h/2;
      const dx = cx - x; const dy = cy - y;
      if (Math.sqrt(dx*dx+dy*dy) < MIN_PO + OBS_W/2) return false;
    }
    return true;
  }

  function tryPlace(x, y, type, owner) {
    if (isValidPos(x, y, PIECE_R)) {
      const p = createPiece(type, owner, x, y);
      placed.push(p);
      return true;
    }
    return false;
  }

  // 障害物を2個置く
  for (let attempt = 0; attempt < 200 && cpuObstacles.length < 2; attempt++) {
    const ox = Math.random() * (CW - OBS_W - 20) + 10;
    const oy = Math.random() * (zoneBottom - OBS_H - 10) + 4;
    const obs = { x: ox, y: oy, w: OBS_W, h: OBS_H };
    // 他の障害物と離れているか
    let ok = true;
    for (const o2 of cpuObstacles) {
      const dx = (o2.x+o2.w/2)-(ox+OBS_W/2);
      const dy = (o2.y+o2.h/2)-(oy+OBS_H/2);
      if (Math.sqrt(dx*dx+dy*dy) < MIN_OO) { ok=false; break; }
    }
    if (ok) cpuObstacles.push(obs);
  }

  // 駒を配置
  const cpuDeck = [...deck];
  // ステージ2以降は駒を増やす
  if (G.stage >= 2) cpuDeck.push(G.mode === 'joi' ? 'joi' : 'pawn');
  if (G.stage >= 3) cpuDeck.push(G.mode === 'joi' ? 'joi' : 'pawn');
  if (G.stage >= 4) cpuDeck.push(G.mode === 'joi' ? 'joi' : 'gold'); 

  for (const type of cpuDeck) {
    let placed_ = false;
    for (let attempt = 0; attempt < 300 && !placed_; attempt++) {
      const x = Math.random() * (CW - PIECE_R * 2 - 20) + PIECE_R + 10;
      const y = Math.random() * (zoneBottom - margin - 4) + 4 + PIECE_R;
      placed_ = tryPlace(x, y, type, 1);
    }
  }

  // ステージ5以降は初期状態で一部の駒を成らせる
  if (G.stage >= 5) {
    placed.forEach(p => {
      if (p.type !== 'king' && Math.random() < 0.3) {
        p.promoted = true;
      }
    });
  }

  return { pieces: placed, obstacles: cpuObstacles };
}
