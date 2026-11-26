# Pathfinding Visualizer

An interactive, grid-based visualizer for four graph-search algorithms — **Dijkstra's**, **A\***, **Breadth-First Search** and **Depth-First Search** — with weighted cells, step-by-step animation and maze generation using **recursive backtracking**.

![stack](https://img.shields.io/badge/React-19-61dafb) ![canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26) ![tests](https://img.shields.io/badge/tests-vitest-6e9f18)

## Features

- **Four algorithms** on the same weighted grid graph: Dijkstra, A\* (Manhattan heuristic), BFS, DFS.
- **Real-time step-by-step animation** that separates
  - **frontier** nodes (discovered, waiting in the queue / heap / stack) — hollow blue rings,
  - **visited** nodes (removed and expanded) — blue, cooling from light to deep blue,
  - the **final path** — a glowing amber line.
- **Draw tools:** walls, weighted cells (cost 5) and eraser. Click-and-drag, with line interpolation so fast drags never skip cells.
- **Drag the start and target**. After a run, every edit re-routes instantly.
- **Maze generation** with recursive backtracking (randomised DFS), animated as it carves.
- **Live stats:** nodes visited, open-set size, path length, path cost, compute time.
- **Compare (Run all four):** runs all four algorithms on the current board and charts nodes visited and path cost.
- **Keyboard shortcuts:** `Space` run · `1`–`4` pick algorithm · `M` maze · `C` clear path · `R` reset.
- Monochrome developer-tool UI (Geist type, hairline borders, status bar), responsive, keyboard accessible, `prefers-reduced-motion` respected.

## Tech stack

| Area | Used for |
| --- | --- |
| React.js (Vite) | UI, controls, stats panels |
| HTML5 Canvas | Drawing the 51 × 25 grid every animation frame |
| CSS Grid | Page layout (top bar, sidebar, stage, inspector, status bar) |
| Min-heap priority queue | Dijkstra and A\* (written from scratch, `src/lib/MinHeap.js`) |
| Graph traversal | BFS (queue), DFS (stack), Dijkstra / A\* (heap) |
| Vitest | Unit and randomized cross-check tests |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 23 tests: heap, algorithms, exploration order, maze
npm run build      # production build in dist/
```

## Project layout

```
src/
  algorithms/        dijkstra.js  astar.js  bfs.js  dfs.js  result.js  index.js
  lib/               MinHeap.js   grid.js   renderer.js
  maze/              recursiveBacktracker.js
  components/        Sidebar  GridCanvas  InfoPanel  StatsPanel  ComparePanel  Legend
  App.jsx            state, animation loop, editing, shortcuts
  constants.js       grid size, colours, speeds
tests/               minHeap.test.js  algorithms.test.js  order.test.js  maze.test.js
docs/INTERVIEW_GUIDE.md   full explanation + likely interview questions
```

## How it works (short version)

1. The grid is a graph: each cell is a node with edges to its 4 neighbours. Walls are removed nodes; a weighted cell costs 5 to enter instead of 1.
2. Each algorithm is a **pure function** `(grid, start, end) → { steps, path, … }`. It runs to completion in a few milliseconds and records every `frontier` and `visit` event.
3. The UI **replays** the recorded steps with `requestAnimationFrame`, a few steps per frame depending on the speed slider, and paints the board on a `<canvas>`.

See [`docs/INTERVIEW_GUIDE.md`](docs/INTERVIEW_GUIDE.md) for the full walkthrough.
