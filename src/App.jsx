import { Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALGORITHMS } from './algorithms/index.js';
import ComparePanel from './components/ComparePanel.jsx';
import GridCanvas from './components/GridCanvas.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import Legend from './components/Legend.jsx';
import StatsPanel from './components/StatsPanel.jsx';
import Sidebar from './components/Sidebar.jsx';
import { CELL, COLS, DEFAULT_END, DEFAULT_START, FADE_MS, ROWS, SPEED_LEVELS, VIS, WEIGHT_COST } from './constants.js';
import { createGrid, toIndex, toRowCol } from './lib/grid.js';
import { drawGrid } from './lib/renderer.js';
import { generateMaze, snapToRoom } from './maze/recursiveBacktracker.js';

const ALGO_KEYS = Object.keys(ALGORITHMS);

/**
 * State split:
 *  - Refs hold the large, fast-changing data (grid arrays, per-cell visual
 *    state, start/end, path). Mutating a ref never re-renders React; the
 *    canvas is repainted directly instead.
 *  - React state holds only what the panels display.
 */
export default function App() {
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  if (gridRef.current === null) gridRef.current = createGrid(ROWS, COLS);
  const visualRef = useRef(new Uint8Array(ROWS * COLS));
  const visitTimeRef = useRef(new Float64Array(ROWS * COLS));
  const startRef = useRef(DEFAULT_START[0] * COLS + DEFAULT_START[1]);
  const endRef = useRef(DEFAULT_END[0] * COLS + DEFAULT_END[1]);
  const pathRef = useRef([]);
  const pathProgressRef = useRef(0);
  const rafRef = useRef(0);
  const fadeRafRef = useRef(0);
  const dragRef = useRef(null); // { kind: 'start' | 'end' | 'paint', mode }
  const liveRef = useRef(false); // a finished run is on screen -> recompute on edits

  const [algorithm, setAlgorithm] = useState('astar');
  const [speed, setSpeed] = useState(2);
  const [tool, setTool] = useState('wall');
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState(null);
  const [comparison, setComparison] = useState(null);

  // Mirrors so animation callbacks always read the latest choice.
  const algorithmRef = useRef(algorithm);
  const speedRef = useRef(speed);
  const runningRef = useRef(running);
  algorithmRef.current = algorithm;
  speedRef.current = speed;
  runningRef.current = running;

  /** Paint one frame. Keeps a lightweight loop alive while cells are still fading. */
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const scene = {
      grid: gridRef.current,
      visual: visualRef.current,
      visitTime: visitTimeRef.current,
      start: startRef.current,
      end: endRef.current,
      path: pathRef.current,
      pathProgress: pathProgressRef.current,
    };
    const fading = drawGrid(ctx, scene, performance.now());
    cancelAnimationFrame(fadeRafRef.current);
    if (fading && !runningRef.current) fadeRafRef.current = requestAnimationFrame(draw);
  }, []);

  // Size the canvas for the device pixel ratio so it stays sharp on HiDPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = COLS * CELL * dpr;
    canvas.height = ROWS * CELL * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    document.fonts?.ready.then(draw); // redraw once the mono font for weights loads
    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(fadeRafRef.current);
    };
  }, [draw]);

  const runAlgorithm = (key) => {
    const t0 = performance.now();
    const result = ALGORITHMS[key].fn(gridRef.current, startRef.current, endRef.current);
    return { result, ms: performance.now() - t0 };
  };

  const toStats = (key, result, ms) => ({
    key,
    short: ALGORITHMS[key].short,
    visitedCount: result.visitedCount,
    frontier: countFrontier(result),
    pathLength: result.pathLength,
    cost: result.cost,
    found: result.found,
    ms,
  });

  const resetVisual = () => {
    visualRef.current.fill(VIS.NONE);
    pathRef.current = [];
    pathProgressRef.current = 0;
  };

  /** Paint a finished result immediately (no animation, no fade). */
  const showInstant = useCallback(() => {
    const key = algorithmRef.current;
    const { result, ms } = runAlgorithm(key);
    resetVisual();
    const visual = visualRef.current;
    visitTimeRef.current.fill(-1e9); // "long ago" -> fully settled colour
    for (const s of result.steps) applyStep(visual, visitTimeRef.current, s, 0);
    pathRef.current = result.path;
    pathProgressRef.current = result.path.length;
    setLive(null);
    setStats(toStats(key, result, ms));
    liveRef.current = true;
    draw();
  }, [draw]);

  const visualize = () => {
    cancelAnimationFrame(rafRef.current);
    if (SPEED_LEVELS[speedRef.current].steps === Infinity) {
      showInstant();
      return;
    }
    const key = algorithmRef.current;
    const { result, ms } = runAlgorithm(key);
    resetVisual();
    liveRef.current = false;
    setStats(null);
    setRunning(true);
    runningRef.current = true;

    // The algorithm already ran to completion and recorded every step. The
    // animation just replays those steps, so the algorithms stay pure and
    // testable and the speed can change mid-run.
    const visual = visualRef.current;
    const visitTime = visitTimeRef.current;
    const steps = result.steps;
    let k = 0;
    let budget = 0;
    let visited = 0;
    let open = 0;
    let frame = 0;

    const tick = (now) => {
      const rate = SPEED_LEVELS[speedRef.current].steps;
      budget += rate === Infinity ? steps.length : rate;
      while (budget >= 1 && k < steps.length) {
        const delta = applyStep(visual, visitTime, steps[k++], now);
        visited += delta.visited;
        open += delta.open;
        budget--;
      }
      if (k >= steps.length) {
        // Path phase: trace the final path at a steady pace.
        pathRef.current = result.path;
        pathProgressRef.current += Math.max(0.6, Math.min(rate, 4));
      }
      draw();
      if (frame++ % 3 === 0 || k >= steps.length) {
        setLive({ visitedCount: visited, frontier: open, progress: k / Math.max(1, steps.length) });
      }
      if (k >= steps.length && pathProgressRef.current >= result.path.length) {
        pathProgressRef.current = result.path.length;
        runningRef.current = false;
        setRunning(false);
        setLive(null);
        setStats(toStats(key, result, ms));
        liveRef.current = true;
        draw(); // starts the fade loop for the last few cells
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const compareAll = () => {
    const rows = ALGO_KEYS.map((key) => {
      let last;
      const times = [];
      for (let n = 0; n < 5; n++) {
        last = runAlgorithm(key);
        times.push(last.ms);
      }
      times.sort((a, b) => a - b);
      return toStats(key, last.result, times[2]); // median of 5
    });
    const found = rows.filter((r) => r.found);
    const best = found.length ? Math.min(...found.map((r) => r.cost)) : null;
    setComparison(rows.map((r) => ({ ...r, best: r.found && r.cost === best })));
  };

  const clearPath = () => {
    cancelAnimationFrame(rafRef.current);
    resetVisual();
    liveRef.current = false;
    setStats(null);
    setLive(null);
    draw();
  };

  const resetBoard = () => {
    const grid = gridRef.current;
    grid.walls.fill(0);
    grid.weights.fill(1);
    setComparison(null);
    clearPath();
  };

  const generateMazeAnimated = () => {
    cancelAnimationFrame(rafRef.current);
    const grid = gridRef.current;
    const { carveOrder } = generateMaze(ROWS, COLS);

    // Start / end must sit on "room" cells (odd row & col) to be inside the maze.
    const [sr, sc] = snapToRoom(ROWS, COLS, ...toRowCol(grid, startRef.current));
    let [er, ec] = snapToRoom(ROWS, COLS, ...toRowCol(grid, endRef.current));
    if (sr === er && sc === ec) [er, ec] = [ROWS - 2, COLS - 2 === sc ? 1 : COLS - 2];
    startRef.current = toIndex(grid, sr, sc);
    endRef.current = toIndex(grid, er, ec);

    grid.walls.fill(1);
    grid.weights.fill(1);
    resetVisual();
    liveRef.current = false;
    setStats(null);
    setLive(null);
    setComparison(null);
    setRunning(true);
    runningRef.current = true;

    let k = 0;
    const rate = SPEED_LEVELS[speedRef.current].steps;
    const perFrame = rate === Infinity ? carveOrder.length : Math.max(4, Math.round(rate * 3));
    const tick = () => {
      for (let n = 0; n < perFrame && k < carveOrder.length; n++) grid.walls[carveOrder[k++]] = 0;
      draw();
      if (k >= carveOrder.length) {
        runningRef.current = false;
        setRunning(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // ---- Keyboard shortcuts -------------------------------------------------
  const actionsRef = useRef({});
  actionsRef.current = { visualize, generateMazeAnimated, clearPath, resetBoard };
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || runningRef.current) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const a = actionsRef.current;
      if (e.key === ' ') {
        e.preventDefault();
        a.visualize();
      } else if (e.key === 'm' || e.key === 'M') a.generateMazeAnimated();
      else if (e.key === 'c' || e.key === 'C') a.clearPath();
      else if (e.key === 'r' || e.key === 'R') a.resetBoard();
      else if (e.key >= '1' && e.key <= '4') setAlgorithm(ALGO_KEYS[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Re-run instantly when the algorithm changes while a result is on screen.
  useEffect(() => {
    if (liveRef.current) showInstant();
  }, [algorithm, showInstant]);

  // ---- Editing the board -------------------------------------------------

  const afterEdit = () => {
    setComparison(null);
    if (liveRef.current) showInstant(); // keep the shown result in sync
    else draw();
  };

  const paintCell = (i, mode) => {
    if (i === startRef.current || i === endRef.current) return;
    const grid = gridRef.current;
    grid.walls[i] = mode === 'wall' ? 1 : 0;
    grid.weights[i] = mode === 'weight' ? WEIGHT_COST : 1;
  };

  const onCellDown = (i) => {
    if (runningRef.current) return;
    if (i === startRef.current || i === endRef.current) {
      dragRef.current = { kind: i === startRef.current ? 'start' : 'end' };
      return;
    }
    const grid = gridRef.current;
    // Clicking an existing wall/weight with its own tool erases it (toggle).
    let mode = tool;
    if (tool === 'wall' && grid.walls[i]) mode = 'erase';
    if (tool === 'weight' && grid.weights[i] > 1) mode = 'erase';
    dragRef.current = { kind: 'paint', mode };
    paintCell(i, mode);
    afterEdit();
  };

  const onCellEnter = (i) => {
    const drag = dragRef.current;
    if (!drag || runningRef.current) return;
    const grid = gridRef.current;
    if (drag.kind === 'paint') {
      paintCell(i, drag.mode);
    } else {
      const other = drag.kind === 'start' ? endRef.current : startRef.current;
      if (i === other || grid.walls[i]) return; // markers can't sit on walls / each other
      if (drag.kind === 'start') startRef.current = i;
      else endRef.current = i;
    }
    afterEdit();
  };

  const algo = ALGORITHMS[algorithm];
  const status = running ? 'Running' : stats ? (stats.found ? 'Path found' : 'No path') : 'Ready';

  return (
    <div className="app">
      <header className="topbar">
        <div className="crumbs">
          <svg className="mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2 22 20H2Z" fill="currentColor" />
          </svg>
          <span className="crumb-sep" aria-hidden="true">/</span>
          <span className="crumb">algorithms</span>
          <span className="crumb-sep" aria-hidden="true">/</span>
          <h1 className="crumb current">pathfinding-visualizer</h1>
        </div>
        <div className="top-meta">
          <span className="mono muted">
            {ROWS}×{COLS} grid · {ROWS * COLS} nodes
          </span>
        </div>
      </header>

      <Sidebar
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        speed={speed}
        setSpeed={setSpeed}
        tool={tool}
        setTool={setTool}
        running={running}
        onMaze={generateMazeAnimated}
        onClearPath={clearPath}
        onReset={resetBoard}
      />

      <main className="stage">
        <div className="stage-head">
          <div>
            <h2 className="stage-title">{algo.name}</h2>
            <p className="stage-sub">{algo.structure}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={visualize} disabled={running}>
            <Play size={14} fill="currentColor" aria-hidden="true" />
            {running ? 'Running' : 'Run'}
            <kbd className="kbd-inverse">Space</kbd>
          </button>
        </div>
        <div className="canvas-frame">
          <GridCanvas
            canvasRef={canvasRef}
            rows={ROWS}
            cols={COLS}
            onCellDown={onCellDown}
            onCellEnter={onCellEnter}
            onRelease={() => (dragRef.current = null)}
          />
        </div>
        <Legend />
      </main>

      <aside className="inspector" aria-label="Details">
        <InfoPanel algorithm={algorithm} />
        <StatsPanel live={live} stats={stats} />
        <ComparePanel rows={comparison} onCompare={compareAll} disabled={running} />
      </aside>

      <footer className="statusbar">
        <span className={`status-dot ${running ? 'busy' : stats && !stats.found ? 'err' : 'ok'}`} aria-hidden="true" />
        <span>{status}</span>
        <span className="sep" aria-hidden="true" />
        <span className="mono">{algo.short}</span>
        <span className="sep" aria-hidden="true" />
        <span>Drag to draw · drag markers to move · edits re-route live after a run</span>
      </footer>
    </div>
  );
}

/** Apply one recorded step to the visual state. Returns the change in counters. */
function applyStep(visual, visitTime, step, now) {
  const prev = visual[step.i];
  if (step.type === 'visit') {
    if (prev === VIS.VISITED) return { visited: 0, open: 0 };
    visual[step.i] = VIS.VISITED;
    visitTime[step.i] = now;
    return { visited: 1, open: prev === VIS.FRONTIER ? -1 : 0 };
  }
  if (prev === VIS.NONE) {
    visual[step.i] = VIS.FRONTIER;
    return { visited: 0, open: 1 };
  }
  return { visited: 0, open: 0 };
}

/** Size of the open set (discovered but never expanded) when the search stopped. */
function countFrontier(result) {
  const state = new Map();
  for (const s of result.steps) {
    if (s.type === 'visit') state.set(s.i, VIS.VISITED);
    else if (!state.has(s.i)) state.set(s.i, VIS.FRONTIER);
  }
  let n = 0;
  for (const v of state.values()) if (v === VIS.FRONTIER) n++;
  return n;
}
