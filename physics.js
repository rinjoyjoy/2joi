// ============================================================
// physics.js — 物理演算（シンプル版）
// ============================================================

function reflectWalls(piece) {
  let hit = false;
  if (piece.x - piece.r < 0) {
    piece.x = piece.r + 0.5;
    piece.vx = Math.abs(piece.vx);
    if (piece.vx < 0.5) piece.vx = 0.5;
    hit = true;
  } else if (piece.x + piece.r > CW) {
    piece.x = CW - piece.r - 0.5;
    piece.vx = -Math.abs(piece.vx);
    if (piece.vx > -0.5) piece.vx = -0.5;
    hit = true;
  }
  if (piece.y - piece.r < 0) {
    piece.y = piece.r + 0.5;
    piece.vy = Math.abs(piece.vy);
    if (piece.vy < 0.5) piece.vy = 0.5;
    hit = true;
  } else if (piece.y + piece.r > CH) {
    piece.y = CH - piece.r - 0.5;
    piece.vy = -Math.abs(piece.vy);
    if (piece.vy > -0.5) piece.vy = -0.5;
    hit = true;
  }
  if (hit) piece.bounceCount++;
}

function reflectObstacle(piece, obst) {
  const cx = piece.x, cy = piece.y;
  const nearX = Math.max(obst.x, Math.min(cx, obst.x + obst.w));
  const nearY = Math.max(obst.y, Math.min(cy, obst.y + obst.h));
  const dx = cx - nearX, dy = cy - nearY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < piece.r) {
    let nx, ny;
    if (dist > 0) {
      nx = dx / dist; ny = dy / dist;
    } else {
      // 完全に重なっている場合は障害物中心から押し出す
      const ocx = obst.x + obst.w / 2, ocy = obst.y + obst.h / 2;
      const ex = cx - ocx, ey = cy - ocy;
      const ed = Math.sqrt(ex*ex + ey*ey) || 1;
      nx = ex / ed; ny = ey / ed;
    }
    piece.x = nearX + nx * (piece.r + 1);
    piece.y = nearY + ny * (piece.r + 1);
    // 盤面内に必ず収める
    piece.x = Math.max(piece.r, Math.min(CW - piece.r, piece.x));
    piece.y = Math.max(piece.r, Math.min(CH - piece.r, piece.y));
    const dot = piece.vx * nx + piece.vy * ny;
    piece.vx -= 2 * dot * nx; piece.vy -= 2 * dot * ny;
    piece.bounceCount++;
  }
}

function circleOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy < (ar + br) * (ar + br);
}

function physicsStep(piece, allPieces, obstacles) {
  if (!piece.moving) return [];
  const events = [];

  piece.x += piece.vx; piece.y += piece.vy;
  piece.vx *= FRICTION; piece.vy *= FRICTION;

  reflectWalls(piece);
  for (const obs of obstacles) reflectObstacle(piece, obs);

  const spd = Math.sqrt(piece.vx * piece.vx + piece.vy * piece.vy);
  if (spd < STOP_SPEED || piece.bounceCount > piece.maxBounces) {
    piece.moving = false; piece.vx = 0; piece.vy = 0;
    return events;
  }

  // 自分以外の生存している全駒を判定対象にする
  const targets = allPieces.filter(p => p.id !== piece.id && p.hp > 0);
  const now = performance.now();
  for (const target of targets) {
    if (piece.hitTargets.has(target.id)) {
      const lastHit = piece.hitTargets.get(target.id);
      if (now - lastHit < 400) continue; // 400ms のクールダウン
    }
    
    const dx = target.x - piece.x;
    const dy = target.y - piece.y;
    const distSq = dx * dx + dy * dy;
    const minDist = piece.r + target.r;

    if (distSq < minDist * minDist) {
      piece.hitTargets.set(target.id, now);
      if (!target.hitTargets) target.hitTargets = new Map();
      target.hitTargets.set(piece.id, now); // 相互衝突を防止（攻撃側が弾かれたりダメージを受けないようにする）
      
      // 敵ならダメージ (ただし、操作中の駒はダメージを受けない)
      if (target.owner !== piece.owner && !target.isOperated) {
        target.hp -= piece.atk;
        events.push({ type: 'damage', x: target.x, y: target.y - 10, text: `-${piece.atk}` });
        if (target.hp <= 0) {
          events.push({ type: 'capture', id: target.id, x: target.x, y: target.y });
        }
      }

      // ノックバック（滑らかな押し出し）
      const dist = Math.sqrt(distSq);
      const nx = dist === 0 ? 0 : dx / dist;
      const ny = dist === 0 ? 0 : dy / dist;
      
      const spd = Math.sqrt(piece.vx*piece.vx + piece.vy*piece.vy) || 1.0;
      const basePush = target.owner === piece.owner ? 1.25 : 4.0;
      const weightFactor = (piece.weight || 1.0) / (target.weight || 1.0);
      let pushSpeed = basePush * weightFactor;
      pushSpeed = Math.min(pushSpeed, spd); // ぶつかった駒の速度を超えないように制限

      target.vx = (target.vx || 0) + nx * pushSpeed;
      target.vy = (target.vy || 0) + ny * pushSpeed;
      if (!target.moving) {
        target.moving = true;
        target.bounceCount = 0;
        target.maxBounces = 2; // 押し出された駒はすぐ止まるように
      }

      // 盤面外に少しでも出たら反射は後で処理されるのでOK
      
      // 停止処理：味方衝突は貫通（速度をわずかに減衰）、敵衝突は止まる
      const isAlly = target.owner === piece.owner;
      if (isAlly) {
        // 味方にぶつかっても止まらない。速度を少し落とすだけ
        piece.vx *= 0.82;
        piece.vy *= 0.82;
      } else if (piece.piercing === true) {
        // 敵・貫通
      } else if (piece.piercing === 'once') {
        if (piece.pierceCount === 0) piece.pierceCount++;
        else { piece.moving = false; piece.vx = 0; piece.vy = 0; return events; }
      } else {
        piece.moving = false; piece.vx = 0; piece.vy = 0; return events;
      }
    }
  }
  return events;
}

function calcTrajectory(piece, dvx, dvy, obstacles, allPieces) {
  const points = [{ x: piece.x, y: piece.y }];
  let x = piece.x, y = piece.y, vx = dvx, vy = dvy;
  let bounces = 0;
  const maxB = 6 + (piece.extraBounces || 0);

  for (let i = 0; i < 300; i++) {
    x += vx; y += vy; vx *= 0.998; vy *= 0.998;
    if (x-piece.r < 0 || x+piece.r > CW) { vx = -vx; bounces++; points.push({x,y}); }
    if (y-piece.r < 0 || y+piece.r > CH) { vy = -vy; bounces++; points.push({x,y}); }
    if (bounces >= maxB) break;
    const spd = Math.sqrt(vx*vx+vy*vy);
    if (spd < 0.5) break;
  }
  points.push({x, y});
  return points;
}
