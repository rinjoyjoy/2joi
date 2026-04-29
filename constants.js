// ============================================================
// constants.js — ゲーム定数
// ============================================================

const CW = 600;   // canvas width
const CH = 800;   // canvas height

const PIECE_R = 22;         // 駒の半径
const OBS_W = 44;           // 障害物の幅・高さ（正方形）
const OBS_H = 44;

// 配置時の最小距離
const MIN_PP = PIECE_R * 2 + 6;  // 駒-駒
const MIN_PO = PIECE_R + OBS_W / 2 + 6;  // 駒-障害物
const MIN_OO = OBS_W + 6;        // 障害物-障害物
const MIN_WALL = PIECE_R + 4;     // 駒-壁

// ゾーン境界 (y座標)
const P1_ZONE_TOP_Y = CH * 2 / 3;   // P1陣地の上端 (≈533)
const P2_ZONE_BOT_Y = CH * 1 / 3;   // P2陣地の下端 (≈267)

// 成りの判定ライン
const P1_PROMOTE_Y = CH / 3;         // P1の駒がこれより上に行くと成る
const P2_PROMOTE_Y = CH * 2 / 3;     // P2の駒がこれより下に行くと成る

// 物理
const FRICTION = 0.985;          // 速度減衰（少し強くして止まりやすく）
const STOP_SPEED = 0.4;          // この速度以下で停止
const MAX_POWER = 11;            // 最大射出速度（さらに下げた）
const MAX_DRAG_DIST = 120;       // ひっぱり操作の最大距離制限

// 桂馬ジャンプ
const KNIGHT_JUMP_FRAMES = 35;   // ジャンプアニメーションフレーム数
const KNIGHT_LAND_R = 35;        // 着地判定半径

// 選択可能な自由駒リスト
const FREE_PIECES = ['rook','bishop','gold','silver','lance','knight'];
