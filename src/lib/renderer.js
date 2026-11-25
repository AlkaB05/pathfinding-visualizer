import { CELL, COLORS, FADE_MS, VIS } from '../constants.js';

// Pre-computed colour ramp for "cooling" visited cells: bright cyan -> deep teal.
const RAMP_STEPS = 24;
const VISITED_RAMP = buildRamp(COLORS.visitedHot, COLORS.visitedCool, RAMP_STEPS);
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Draws the whole board on an HTML5 canvas.
 *
 * 51 x 25 = 1,275 cells, so a full repaint is ~1.3k fillRect calls: far
 * cheaper than re-rendering 1,275 React <div>s on every animation frame.
 *
 * scene = { grid, visual, visitTime, start, end, path, pathProgress }
 * Returns true while some cell is still mid-fade (caller keeps animating).
 */
export function drawGrid(ctx, scene, now) {
  const { grid, visual, visitTime, start, end, path, pathProgress } = scene;
  const { rows, cols, walls, weights } = grid;
  const width = cols * CELL;
  const height = rows * CELL;
  let fading = false;

  ctx.fillStyle = COLORS.empty;
  ctx.fillRect(0, 0, width, height);

  // Grid lines first so filled cells sit on top of them.
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, height);
  }
  for (let r = 0; r <= rows; r++) {
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(width, r * CELL + 0.5);
  }
  ctx.stroke();

  for (let i = 0; i < rows * cols; i++) {
    const x = (i % cols) * CELL;
    const y = Math.floor(i / cols) * CELL;

    if (walls[i]) {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(x, y, CELL, 1); // faint top edge so walls read as solid blocks
      continue;
    }

    const state = visual[i];
    if (state === VIS.VISITED) {
      const age = now - visitTime[i];
      const t = reducedMotion ? 1 : Math.min(1, Math.max(0, age / FADE_MS));
      if (t < 1) fading = true;
      ctx.fillStyle = VISITED_RAMP[Math.round(t * (RAMP_STEPS - 1))];
      // New cells "pop" in from slightly smaller to full size.
      const inset = t < 0.35 ? (1 - t / 0.35) * CELL * 0.22 : 0;
      ctx.fillRect(x + 1 + inset, y + 1 + inset, CELL - 1 - inset * 2, CELL - 1 - inset * 2);
    } else if (state === VIS.FRONTIER) {
      // Frontier = hollow ring: "discovered, not yet expanded".
      ctx.strokeStyle = COLORS.frontier;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4.5, y + 4.5, CELL - 8, CELL - 8);
    }

    if (weights[i] > 1) drawWeight(ctx, x, y, weights[i]);
  }

  if (path && pathProgress > 0) drawPath(ctx, path, pathProgress, cols);

  drawStart(ctx, start, cols);
  drawEnd(ctx, end, cols);
  return fading;
}

function center(i, cols) {
  return [(i % cols) * CELL + CELL / 2, Math.floor(i / cols) * CELL + CELL / 2];
}

/** The final path is drawn as a glowing polyline through cell centres. */
function drawPath(ctx, path, progress, cols) {
  const n = Math.min(path.length, Math.ceil(progress));
  ctx.save();
  ctx.fillStyle = 'rgba(245, 166, 35, 0.14)';
  for (let k = 0; k < n; k++) {
    const i = path[k];
    ctx.fillRect((i % cols) * CELL + 1, Math.floor(i / cols) * CELL + 1, CELL - 1, CELL - 1);
  }
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = CELL * 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(245, 166, 35, 0.75)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const [cx, cy] = center(path[k], cols);
    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawWeight(ctx, x, y, cost) {
  ctx.fillStyle = 'rgba(192, 132, 252, 0.12)';
  ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);
  ctx.fillStyle = COLORS.weight;
  ctx.font = `500 ${Math.round(CELL * 0.46)}px "Geist Mono Variable", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cost), x + CELL / 2 + 0.5, y + CELL / 2 + 1);
}

function drawStart(ctx, i, cols) {
  const x = (i % cols) * CELL;
  const y = Math.floor(i / cols) * CELL;
  ctx.save();
  ctx.shadowColor = 'rgba(80, 227, 194, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.start;
  roundRect(ctx, x + 3, y + 3, CELL - 5, CELL - 5, 4);
  ctx.fill();
  ctx.restore();
  const [cx, cy] = center(i, cols);
  const s = CELL * 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx - s * 0.7, cy + s);
  ctx.closePath();
  ctx.fill();
}

function drawEnd(ctx, i, cols) {
  const [cx, cy] = center(i, cols);
  ctx.save();
  ctx.shadowColor = 'rgba(255, 77, 79, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = COLORS.end;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.empty;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.end;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildRamp(fromHex, toHex, steps) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  // Ease-out so cells cool quickly at first, then settle.
  return Array.from({ length: steps }, (_, k) => {
    const t = 1 - Math.pow(1 - k / (steps - 1), 2);
    const c = a.map((v, j) => Math.round(v + (b[j] - v) * t));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  });
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
