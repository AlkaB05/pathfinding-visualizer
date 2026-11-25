/**
 * Grid model.
 *
 * The grid is a graph: every cell is a node, and each node has an edge to its
 * 4 neighbours (up, right, down, left). We store it as flat typed arrays and
 * address cells by a single integer index:  i = row * cols + col.
 *
 *   walls[i]   = 1 if the cell is blocked
 *   weights[i] = cost to ENTER the cell (1 = normal, >1 = "weighted" cell)
 */
export function createGrid(rows, cols) {
  return {
    rows,
    cols,
    walls: new Uint8Array(rows * cols),
    weights: new Uint8Array(rows * cols).fill(1),
  };
}

export const toIndex = (grid, row, col) => row * grid.cols + col;
export const toRowCol = (grid, i) => [Math.floor(i / grid.cols), i % grid.cols];

// Order matters for DFS / BFS tie-breaking: up, right, down, left.
const DIRS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** Walkable 4-directional neighbours of cell i. */
export function neighbors(grid, i) {
  const { rows, cols, walls } = grid;
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const j = nr * cols + nc;
    if (!walls[j]) out.push(j);
  }
  return out;
}

/** Manhattan distance: admissible heuristic for 4-directional movement. */
export function manhattan(grid, a, b) {
  const ar = Math.floor(a / grid.cols);
  const ac = a % grid.cols;
  const br = Math.floor(b / grid.cols);
  const bc = b % grid.cols;
  return Math.abs(ar - br) + Math.abs(ac - bc);
}

/** Walk the `prev` (parent) array backwards from end to start. */
export function reconstructPath(prev, start, end) {
  const path = [];
  for (let at = end; at !== -1; at = prev[at]) {
    path.push(at);
    if (at === start) break;
  }
  path.reverse();
  return path[0] === start ? path : [];
}

/** Total cost of a path = sum of weights of every cell entered after start. */
export function pathCost(grid, path) {
  let cost = 0;
  for (let k = 1; k < path.length; k++) cost += grid.weights[path[k]];
  return cost;
}
