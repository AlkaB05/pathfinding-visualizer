import { neighbors } from '../lib/grid.js';
import { buildResult } from './result.js';

/**
 * Depth-First Search (iterative, explicit stack).
 * Dives as deep as possible before backtracking.
 * Finds A path if one exists, but it is NOT guaranteed to be the shortest.
 *
 * Time O(V + E), Space O(V)
 */
export function dfs(grid, start, end) {
  const n = grid.rows * grid.cols;
  const visited = new Uint8Array(n);
  const prev = new Int32Array(n).fill(-1);
  const steps = [];

  // Each stack entry remembers which node pushed it, so the parent is fixed
  // only when the node is actually visited (same tree as recursive DFS).
  const stack = [[start, -1]];
  steps.push({ type: 'frontier', i: start });

  let found = false;
  let visitedCount = 0;

  while (stack.length > 0) {
    const [cur, parent] = stack.pop();
    if (visited[cur]) continue;
    visited[cur] = 1;
    prev[cur] = parent;
    steps.push({ type: 'visit', i: cur });
    visitedCount++;
    if (cur === end) {
      found = true;
      break;
    }
    // Push in reverse so the first direction (up) is popped first.
    const nbs = neighbors(grid, cur);
    for (let k = nbs.length - 1; k >= 0; k--) {
      const nb = nbs[k];
      if (visited[nb]) continue;
      stack.push([nb, cur]);
      steps.push({ type: 'frontier', i: nb });
    }
  }

  return buildResult(grid, steps, prev, start, end, found, visitedCount);
}
