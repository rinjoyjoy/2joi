// ============================================================
// renderer.js — Canvas描画（演出強化版・ドラッグ表示修正）
// ============================================================

function getCtx() {
  return document.getElementById('game-canvas').getContext('2d');
}

// ---- 盤面描画 ----
function drawBoard(ctx, highlightOwner) {
  // 明るいフィールド
  if (G.mode === 'joi') {
    ctx.fillStyle = '#ffcc00'; // 黄金
  } else {
    ctx.fillStyle = '#f5f0ee';
  }
  ctx.fillRect(0, 0, CW, CH);

  // グリッド線（単色・くっきり）
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let x = 0; x <= CW; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, CH); }
  for (let y = 0; y <= CH; y += 40) { ctx.moveTo(0, y); ctx.lineTo(CW, y); }
  ctx.stroke();

  // 中央分割ライン（青と赤のツートン・極太）
  ctx.fillStyle = '#0044a8';
  ctx.fillRect(0, CH/2 - 4, CW/2, 8);
  ctx.fillStyle = '#a81a00';
  ctx.fillRect(CW/2, CH/2 - 4, CW/2, 8);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, CH/2 - 4, CW, 8);

  // P1ゾーン（下、青）
  const isPlacement = G.phase === 'placement';
  const z1a = (isPlacement && G.currentPlayer === 0) ? 0.14 : (highlightOwner === 0 ? 0.08 : 0.03);
  ctx.fillStyle = `rgba(60, 100, 220, ${z1a})`;
  ctx.fillRect(0, P1_ZONE_TOP_Y, CW, CH - P1_ZONE_TOP_Y);

  // P2ゾーン（上、赤）
  const z2a = (isPlacement && G.currentPlayer === 1) ? 0.14 : (highlightOwner === 1 ? 0.08 : 0.03);
  ctx.fillStyle = `rgba(220, 40, 20, ${z2a})`;
  ctx.fillRect(0, 0, CW, P2_ZONE_BOT_Y);

  // ゾーン境界の点線
  ctx.strokeStyle = 'rgba(0,85,255,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(0, P1_ZONE_TOP_Y); ctx.lineTo(CW, P1_ZONE_TOP_Y); ctx.stroke();
  ctx.strokeStyle = 'rgba(204,34,0,0.6)';
  ctx.beginPath(); ctx.moveTo(0, P2_ZONE_BOT_Y); ctx.lineTo(CW, P2_ZONE_BOT_Y); ctx.stroke();
  ctx.setLineDash([]);

  // 配置禁止エリア（暗くオーバーレイ）
  if (isPlacement) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    if (G.currentPlayer === 0) ctx.fillRect(0, 0, CW, P1_ZONE_TOP_Y);
    else ctx.fillRect(0, P2_ZONE_BOT_Y, CW, CH - P2_ZONE_BOT_Y);
  }
}


// ---- 障害物描画 ----
function drawObstacle(ctx, obs) {
  ctx.save();
  // ハードシャドウ（右下にずらした単色の影）
  ctx.fillStyle = '#000000';
  ctx.fillRect(obs.x + 4, obs.y + 4, obs.w, obs.h);

  // 本体（ベタ塗り）
  ctx.fillStyle = '#333333';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  
  // 枠（フラットな太線）
  ctx.strokeStyle = '#a81a00';
  ctx.lineWidth = 4;
  ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

  // テキスト（影なしベタ）
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 14px "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('壁', obs.x + obs.w/2, obs.y + obs.h/2);
  ctx.restore();
}

// ---- 駒描画 ----
function drawPiece(ctx, piece, alpha = 1, selected = false) {
  const { x, y, r, owner, hp, maxHp, kanji, color } = piece;
  const isP2 = owner === 1;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ハードシャドウ（ベタ塗り）
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(x + 3, y + 3, r, 0, Math.PI * 2);
  ctx.fill();

  // 本体（ベタ塗り）
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (isP2) {
    ctx.fillStyle = '#991100';
    ctx.strokeStyle = '#cc2200';
  } else {
    ctx.fillStyle = '#003388';
    ctx.strokeStyle = '#0055ff';
  }
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();

  // 選択ハイライト
  if (selected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 文字
  ctx.font = `900 ${r * 1.15}px "Noto Sans JP", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // プレイヤー固有の影
  ctx.shadowOffsetX = isP2 ? 3 : 3;
  ctx.shadowOffsetY = isP2 ? 3 : 3;
  ctx.shadowBlur = 0;
  ctx.shadowColor = isP2 ? '#a81a00' : '#0044a8';

  ctx.fillStyle = '#ffffff'; // 文字は白

  if (isP2) {
    ctx.translate(x, y); ctx.rotate(Math.PI); 
    ctx.fillText(kanji, 0, 0);
  } else {
    ctx.fillText(kanji, x, y);
  }
  ctx.restore();

  // HPバー
  const bw = r * 1.5, bh = 6;
  const bx = x - bw / 2, by = isP2 ? y - r - 14 : y + r + 10;
  ctx.fillStyle = '#000';
  ctx.fillRect(bx, by, bw, bh);
  const ratio = Math.max(0, hp / maxHp);
  ctx.fillStyle = ratio > 0.5 ? '#22aa44' : (ratio > 0.25 ? '#ffcc00' : '#a81a00');
  ctx.fillRect(bx, by, bw * ratio, bh);
}



function drawCaptureEffect(ctx, x, y, frame, text) {
  const t = frame / 20;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const dist = 20 + 70 * t;
    ctx.moveTo(x + Math.cos(ang)*(dist-20), y + Math.sin(ang)*(dist-20));
    ctx.lineTo(x + Math.cos(ang)*dist, y + Math.sin(ang)*dist);
  }
  
  if (G.mode === 'joi') {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1-t})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
  } else {
    ctx.strokeStyle = `rgba(255, 100, 50, ${1-t})`;
  }
  
  ctx.lineWidth = 5;
  ctx.stroke();

  if (text) {
    if (G.mode === 'joi') {
      ctx.fillStyle = `rgba(255, 255, 255, ${1-t})`;
      ctx.font = '900 64px "Noto Sans JP", sans-serif';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00ffff';
      // 黒い縁取りを追加
      ctx.strokeStyle = `rgba(0, 0, 0, ${1-t})`;
      ctx.lineWidth = 6;
      ctx.strokeText(text, x, y - 30 - 30 * t);
    } else {
      ctx.fillStyle = `rgba(255, 100, 50, ${1-t})`;
      ctx.font = '900 36px sans-serif';
    }
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 30 - 30 * t);
  }
  ctx.restore();
}

function drawDamageEffect(ctx, x, y, frame, text) {
  const t = frame / 20;
  ctx.save();
  
  if (G.mode === 'joi') {
    ctx.fillStyle = `rgba(255, 220, 0, ${1-t})`;
    ctx.font = '900 48px "Noto Sans JP", sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff0000';
  } else {
    ctx.fillStyle = `rgba(255, 50, 50, ${1-t})`;
    ctx.font = '900 32px sans-serif';
  }
  
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 10 - 30 * t);
  ctx.restore();
}

function drawPromoteEffect(ctx, x, y, frame) {
  const r = PIECE_R + frame * 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 220, 0, ${1 - frame/20})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---- ガイド描画 ----
function drawAimArrow(ctx, piece, mx, my, knightTarget) {
  const dx = piece.x - mx, dy = piece.y - my;
  const d = Math.sqrt(dx*dx+dy*dy);
  if (d < 10) return;
  const power = Math.min(d/4, MAX_POWER);
  const angle = Math.atan2(dy, dx);
  
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, power/MAX_POWER + 0.2)})`;

  if (piece.jumpType && knightTarget) {
    // 桂馬の放物線風ガイド
    ctx.moveTo(piece.x, piece.y);
    const midX = (piece.x + knightTarget.x) / 2;
    const midY = (piece.y + knightTarget.y) / 2 - 100;
    ctx.quadraticCurveTo(midX, midY, knightTarget.x, knightTarget.y);
  } else {
    // 射出制限チェック
    const isOk = isAngleAllowed(angle, piece.launchAngle, piece.owner);
    if (!isOk) ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.moveTo(piece.x, piece.y);
    ctx.lineTo(piece.x + Math.cos(angle)*power*15, piece.y + Math.sin(angle)*power*15);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrajectory(ctx, points) {
  if (!points || points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---- 全画面描画 ----
function renderFrame(state) {
  const ctx = getCtx();
  ctx.save();
  drawBoard(ctx, state.highlightOwner);
  for (const obs of state.obstacles) drawObstacle(ctx, obs);

  const aimId = state.aiming ? state.aiming.piece.id : null;
  const knId = state.knightMode ? state.knightMode.id : null;
  for (const p of state.pieces) {
    if (state.jumpAnim && state.jumpAnim.piece.id === p.id) continue;
    drawPiece(ctx, p, 1, (aimId === p.id || knId === p.id));
  }

  if (state.jumpAnim) {
    const { piece, sx, sy, tx, ty, frame, totalFrames } = state.jumpAnim;
    const t = frame / totalFrames, x = sx + (tx-sx)*t, y = sy + (ty-sy)*t;
    const h = Math.sin(t * Math.PI) * 100;
    ctx.save(); ctx.translate(0, -h); drawPiece(ctx, { ...piece, x, y }, 1, false); ctx.restore();
  }

  if (state.knightTarget) {
    ctx.beginPath(); ctx.arc(state.knightTarget.x, state.knightTarget.y, state.knightTarget.r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; ctx.stroke();
  }

  if (state.aiming) drawAimArrow(ctx, state.aiming.piece, state.aiming.mx, state.aiming.my, state.knightTarget);
  if (state.trajectory) drawTrajectory(ctx, state.trajectory);

  // 配置フェーズのガイド
  if (state.phase === 'placement' && state.dragging) {
    const { x, y, mode, type } = state.dragging;
    
    // 1. 既存の駒の周囲に間隔制限を表示
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([2, 4]);
    for (const p of state.pieces) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, MIN_PP, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. 配置中の駒/障害物の表示
    if (mode === 'piece') {
      const def = PIECE_DEFS[type];
      const ok = canPlacePiece(x, y);
      const alpha = ok ? 0.7 : 0.4;
      const color = ok ? (def.color || '#fff') : '#ff0000';
      
      // 配置不可時は背後に赤い警告円
      if (!ok) {
        ctx.beginPath(); ctx.arc(x, y, PIECE_R + 5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; ctx.fill();
      }
      drawPiece(ctx, { x, y, r: PIECE_R, owner: G.currentPlayer, hp: def.hp, maxHp: def.hp, kanji: def.kanji, color }, alpha);
    } else {
      const ok = canPlaceObs(x - OBS_W/2, y - OBS_H/2);
      ctx.fillStyle = ok ? 'rgba(150, 150, 150, 0.6)' : 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(x - OBS_W/2, y - OBS_H/2, OBS_W, OBS_H);
    }
  }


  for (const ef of state.effects) {
    if (ef.type === 'capture') drawCaptureEffect(ctx, ef.x, ef.y, ef.frame, ef.text);
    else if (ef.type === 'damage') drawDamageEffect(ctx, ef.x, ef.y, ef.frame, ef.text);
    else drawPromoteEffect(ctx, ef.x, ef.y, ef.frame);
  }
  ctx.restore();
}
