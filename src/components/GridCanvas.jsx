import { useRef } from 'react';

/**
 * The board itself. React only renders one <canvas>; all cell drawing is done
 * imperatively by lib/renderer.js. This component just turns pointer events
 * into cell indices.
 */
export default function GridCanvas({ canvasRef, rows, cols, onCellDown, onCellEnter, onRelease }) {
  const isDown = useRef(false);
  const lastCell = useRef(-1);

  const cellAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * rows);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return -1;
    return row * cols + col;
  };

  const handleDown = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    const i = cellAt(e);
    if (i < 0) return;
    isDown.current = true;
    lastCell.current = i;
    onCellDown(i);
  };

  const handleMove = (e) => {
    if (!isDown.current) return;
    const i = cellAt(e);
    if (i < 0 || i === lastCell.current) return;
    // A fast drag can skip cells between two pointer events, so walk the
    // straight line between the previous and current cell.
    for (const cell of cellsBetween(lastCell.current, i, cols)) onCellEnter(cell);
    lastCell.current = i;
  };

  const handleUp = () => {
    isDown.current = false;
    lastCell.current = -1;
    onRelease();
  };

  return (
    <canvas
      ref={canvasRef}
      className="board-canvas"
      style={{ aspectRatio: `${cols} / ${rows}` }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      aria-label="Pathfinding grid. Click or drag to draw walls; drag the start and end markers to move them."
    />
  );
}

function cellsBetween(from, to, cols) {
  const r0 = Math.floor(from / cols);
  const c0 = from % cols;
  const r1 = Math.floor(to / cols);
  const c1 = to % cols;
  const n = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const out = [];
  for (let k = 1; k <= n; k++) {
    const r = Math.round(r0 + ((r1 - r0) * k) / n);
    const c = Math.round(c0 + ((c1 - c0) * k) / n);
    out.push(r * cols + c);
  }
  return out;
}
