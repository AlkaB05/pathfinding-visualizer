import { describe, expect, it } from 'vitest';
import { astar, bfs, dfs, dijkstra } from '../src/algorithms/index.js';
import { createGrid, neighbors, pathCost, toIndex } from '../src/lib/grid.js';
import { seededRandom } from '../src/maze/recursiveBacktracker.js';

const ALL = { dijkstra, astar, bfs, dfs };

function isValidPath(grid, path, start, end) {
  if (path[0] !== start || path[path.length - 1] !== end) return false;
  for (let k = 1; k < path.length; k++) {
    if (!neighbors(grid, path[k - 1]).includes(path[k])) return false;
  }
  return true;
}

function randomGrid(rows, cols, rng, wallP = 0.28, weightP = 0.15) {
  const grid = createGrid(rows, cols);
  for (let i = 0; i < rows * cols; i++) {
    const r = rng();
    if (r < wallP) grid.walls[i] = 1;
    else if (r < wallP + weightP) grid.weights[i] = 5;
  }
  return grid;
}

describe('on an open grid', () => {
  const grid = createGrid(15, 20);
  const start = toIndex(grid, 2, 3);
  const end = toIndex(grid, 11, 17);
  const manhattan = 9 + 14;

  for (const [name, fn] of Object.entries(ALL)) {
    it(`${name} returns a valid path`, () => {
      const res = fn(grid, start, end);
      expect(res.found).toBe(true);
      expect(isValidPath(grid, res.path, start, end)).toBe(true);
    });
  }

  it('BFS, Dijkstra and A* find the Manhattan-length shortest path', () => {
    for (const fn of [bfs, dijkstra, astar]) {
      expect(fn(grid, start, end).pathLength).toBe(manhattan);
    }
  });

  it('A* expands fewer nodes than Dijkstra', () => {
    expect(astar(grid, start, end).visitedCount).toBeLessThan(dijkstra(grid, start, end).visitedCount);
  });
});

describe('weights', () => {
  // A wall with two gaps: a short route through weighted cells (cost 5 each)
  // and a longer route with no weights.
  //   S . W W W . E   <- row 0: direct but weighted
  //   . # # # # # .
  //   . . . . . . .   <- row 2: detour, all cost 1
  const grid = createGrid(3, 7);
  for (let c = 1; c <= 5; c++) grid.walls[toIndex(grid, 1, c)] = 1;
  for (let c = 2; c <= 4; c++) grid.weights[toIndex(grid, 0, c)] = 5;
  const start = toIndex(grid, 0, 0);
  const end = toIndex(grid, 0, 6);

  it('Dijkstra and A* take the cheaper detour', () => {
    for (const fn of [dijkstra, astar]) {
      const res = fn(grid, start, end);
      expect(res.cost).toBe(10); // 1 + 1 + 6 + 1 + 1 down/across/up
      expect(res.pathLength).toBe(10);
    }
  });

  it('BFS ignores weights and takes the fewest steps', () => {
    const res = bfs(grid, start, end);
    expect(res.pathLength).toBe(6);
    expect(res.cost).toBe(1 + 5 + 5 + 5 + 1 + 1);
  });
});

describe('unreachable target', () => {
  it('all algorithms report no path', () => {
    const grid = createGrid(5, 5);
    for (let r = 0; r < 5; r++) grid.walls[toIndex(grid, r, 2)] = 1;
    for (const fn of Object.values(ALL)) {
      const res = fn(grid, toIndex(grid, 0, 0), toIndex(grid, 4, 4));
      expect(res.found).toBe(false);
      expect(res.path).toEqual([]);
    }
  });
});

describe('randomised cross-check (200 boards)', () => {
  it('A* always matches Dijkstra cost; BFS matches on step count; DFS path is valid', () => {
    const rng = seededRandom(42);
    for (let t = 0; t < 200; t++) {
      const grid = randomGrid(18, 26, rng);
      const start = Math.floor(rng() * 18 * 26);
      let end = Math.floor(rng() * 18 * 26);
      if (end === start) end = (end + 1) % (18 * 26);
      grid.walls[start] = 0;
      grid.walls[end] = 0;

      const d = dijkstra(grid, start, end);
      const a = astar(grid, start, end);
      const b = bfs(grid, start, end);
      const f = dfs(grid, start, end);

      expect(a.found).toBe(d.found);
      expect(b.found).toBe(d.found);
      expect(f.found).toBe(d.found);
      if (!d.found) continue;

      expect(a.cost).toBe(d.cost);
      expect(pathCost(grid, d.path)).toBe(d.cost);
      // Dijkstra/A* are optimal on cost, so BFS can never be cheaper.
      expect(b.cost).toBeGreaterThanOrEqual(d.cost);
      // BFS is optimal on number of steps.
      expect(b.pathLength).toBeLessThanOrEqual(d.pathLength);
      expect(f.pathLength).toBeGreaterThanOrEqual(b.pathLength);
      for (const res of [d, a, b, f]) expect(isValidPath(grid, res.path, start, end)).toBe(true);
    }
  });
});
