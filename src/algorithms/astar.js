import { MinHeap } from '../lib/MinHeap.js';
import { manhattan, neighbors } from '../lib/grid.js';
import { buildResult } from './result.js';

/**
 * A* search.
 * Like Dijkstra, but orders the heap by f(n) = g(n) + h(n):
 *   g(n) = exact cost from start to n
 *   h(n) = Manhattan distance from n to end (never overestimates, because
 *          every move costs at least 1) -> A* stays optimal.
 * The heuristic pulls the search toward the goal, so far fewer nodes are
 * expanded than with Dijkstra.
 *
 * Time O((V + E) log V) worst case, usually much less. Space O(V)
 */
export function astar(grid, start, end) {
  const n = grid.rows * grid.cols;
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const steps = [];

  let seq = 0;
  // Tie-break equal f on smaller h (prefer nodes closer to the goal), then FIFO.
  const heap = new MinHeap((a, b) => a.f - b.f || a.h - b.h || a.seq - b.seq);

  g[start] = 0;
  const h0 = manhattan(grid, start, end);
  heap.push({ i: start, f: h0, h: h0, seq: seq++ });
  steps.push({ type: 'frontier', i: start });

  let found = false;
  let visitedCount = 0;

  while (!heap.isEmpty()) {
    const { i: cur } = heap.pop();
    if (closed[cur]) continue; // stale entry (lazy deletion)
    closed[cur] = 1;
    steps.push({ type: 'visit', i: cur });
    visitedCount++;
    if (cur === end) {
      found = true;
      break;
    }
    for (const nb of neighbors(grid, cur)) {
      if (closed[nb]) continue;
      const tentative = g[cur] + grid.weights[nb];
      if (tentative < g[nb]) {
        g[nb] = tentative;
        prev[nb] = cur;
        const h = manhattan(grid, nb, end);
        heap.push({ i: nb, f: tentative + h, h, seq: seq++ });
        steps.push({ type: 'frontier', i: nb });
      }
    }
  }

  return buildResult(grid, steps, prev, start, end, found, visitedCount);
}
