import { MinHeap } from '../lib/MinHeap.js';
import { neighbors } from '../lib/grid.js';
import { buildResult } from './result.js';

/**
 * Dijkstra's algorithm.
 * Always expands the unvisited node with the smallest known distance from the
 * start, using a min-heap priority queue. Handles weighted cells and
 * guarantees the cheapest path (all weights are non-negative).
 *
 * Time O((V + E) log V), Space O(V)
 */
export function dijkstra(grid, start, end) {
  const n = grid.rows * grid.cols;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const steps = [];

  // seq = insertion counter, a stable tie-breaker for equal distances.
  let seq = 0;
  const heap = new MinHeap((a, b) => a.d - b.d || a.seq - b.seq);

  dist[start] = 0;
  heap.push({ i: start, d: 0, seq: seq++ });
  steps.push({ type: 'frontier', i: start });

  let found = false;
  let visitedCount = 0;

  while (!heap.isEmpty()) {
    const { i: cur, d } = heap.pop();
    // "Lazy deletion": JS has no decrease-key, so we may push the same node
    // several times. Any entry for an already-finalised node is stale.
    if (closed[cur]) continue;
    closed[cur] = 1;
    steps.push({ type: 'visit', i: cur });
    visitedCount++;
    if (cur === end) {
      found = true;
      break;
    }
    for (const nb of neighbors(grid, cur)) {
      if (closed[nb]) continue;
      const nd = d + grid.weights[nb]; // relaxation
      if (nd < dist[nb]) {
        dist[nb] = nd;
        prev[nb] = cur;
        heap.push({ i: nb, d: nd, seq: seq++ });
        steps.push({ type: 'frontier', i: nb });
      }
    }
  }

  return buildResult(grid, steps, prev, start, end, found, visitedCount);
}
