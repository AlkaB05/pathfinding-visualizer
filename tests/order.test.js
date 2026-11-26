/**
 * Checks that each algorithm explores nodes in the order its definition
 * requires, not just that it finds a valid path:
 *
 *   BFS      visit order is non-decreasing in step distance from start
 *   Dijkstra visit order is non-decreasing in true (weighted) distance
 *   A*       visit order is non-decreasing in f = trueDist + manhattan
 *            (holds because Manhattan is a consistent heuristic here)
 *   DFS      every visit is the first unvisited neighbour (up, right, down,
 *            left) of the deepest node on the current path: recursive DFS
 */
import { describe, expect, it } from 'vitest';
import { astar, bfs, dfs, dijkstra } from '../src/algorithms/index.js';
import { createGrid, manhattan, neighbors } from '../src/lib/grid.js';
import { seededRandom } from '../src/maze/recursiveBacktracker.js';

const ROWS = 18;
const COLS = 26;

function randomBoard(rng) {
  const grid = createGrid(ROWS, COLS);
  for (let i = 0; i < ROWS * COLS; i++) {
    const r = rng();
    if (r < 0.25) grid.walls[i] = 1;
    else if (r < 0.4) grid.weights[i] = 5;
  }
  const start = Math.floor(rng() * ROWS * COLS);
  let end = Math.floor(rng() * ROWS * COLS);
  if (end === start) end = (end + 1) % (ROWS * COLS);
  grid.walls[start] = 0;
  grid.walls[end] = 0;
  return { grid, start, end };
}

/** Exact shortest distances by repeated relaxation (independent of the code under test). */
function trueDistances(grid, start, weighted) {
  const n = grid.rows * grid.cols;
  const dist = new Array(n).fill(Infinity);
  dist[start] = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (let u = 0; u < n; u++) {
      if (dist[u] === Infinity) continue;
      for (const v of neighbors(grid, u)) {
        const nd = dist[u] + (weighted ? grid.weights[v] : 1);
        if (nd < dist[v]) {
          dist[v] = nd;
          changed = true;
        }
      }
    }
  }
  return dist;
}

const visits = (res) => res.steps.filter((s) => s.type === 'visit').map((s) => s.i);

const BOARDS = 150;

describe('exploration order matches each algorithm definition', () => {
  it('BFS visits nodes in non-decreasing step distance', () => {
    const rng = seededRandom(101);
    for (let t = 0; t < BOARDS; t++) {
      const { grid, start, end } = randomBoard(rng);
      const d = trueDistances(grid, start, false);
      const order = visits(bfs(grid, start, end));
      for (let k = 1; k < order.length; k++) expect(d[order[k]]).toBeGreaterThanOrEqual(d[order[k - 1]]);
    }
  });

  it('Dijkstra visits nodes in non-decreasing weighted distance, each exactly once', () => {
    const rng = seededRandom(202);
    for (let t = 0; t < BOARDS; t++) {
      const { grid, start, end } = randomBoard(rng);
      const d = trueDistances(grid, start, true);
      const order = visits(dijkstra(grid, start, end));
      expect(new Set(order).size).toBe(order.length);
      for (let k = 1; k < order.length; k++) expect(d[order[k]]).toBeGreaterThanOrEqual(d[order[k - 1]]);
      // Everything strictly closer than the target is expanded before it.
      if (d[end] !== Infinity) {
        const seen = new Set(order);
        for (let i = 0; i < d.length; i++) if (d[i] < d[end]) expect(seen.has(i)).toBe(true);
      }
    }
  });

  it('A* visits nodes in non-decreasing f = g + h, and never more nodes than Dijkstra explores at cost < target', () => {
    const rng = seededRandom(303);
    for (let t = 0; t < BOARDS; t++) {
      const { grid, start, end } = randomBoard(rng);
      const d = trueDistances(grid, start, true);
      const order = visits(astar(grid, start, end));
      expect(new Set(order).size).toBe(order.length);
      const f = (i) => d[i] + manhattan(grid, i, end);
      for (let k = 1; k < order.length; k++) expect(f(order[k])).toBeGreaterThanOrEqual(f(order[k - 1]));
      // Optimal efficiency: A* only expands nodes with f <= optimal cost.
      if (d[end] !== Infinity) for (const i of order) expect(f(i)).toBeLessThanOrEqual(d[end]);
    }
  });

  it('DFS follows recursive depth-first order (up, right, down, left)', () => {
    const rng = seededRandom(404);
    for (let t = 0; t < BOARDS; t++) {
      const { grid, start, end } = randomBoard(rng);
      const order = visits(dfs(grid, start, end));
      expect(order[0]).toBe(start);
      const visited = new Set([start]);
      const path = [start];
      const firstUnvisited = (u) => neighbors(grid, u).find((v) => !visited.has(v));
      for (let k = 1; k < order.length; k++) {
        // Backtrack past fully explored nodes, exactly like returning from recursion.
        while (firstUnvisited(path[path.length - 1]) === undefined) path.pop();
        expect(order[k]).toBe(firstUnvisited(path[path.length - 1]));
        visited.add(order[k]);
        path.push(order[k]);
      }
    }
  });

  it('every algorithm only reports a frontier node before visiting it', () => {
    const rng = seededRandom(505);
    for (let t = 0; t < 60; t++) {
      const { grid, start, end } = randomBoard(rng);
      for (const fn of [bfs, dfs, dijkstra, astar]) {
        const discovered = new Set();
        for (const s of fn(grid, start, end).steps) {
          if (s.type === 'frontier') discovered.add(s.i);
          else expect(discovered.has(s.i)).toBe(true);
        }
      }
    }
  });
});
