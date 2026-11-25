import { neighbors } from '../lib/grid.js';
import { buildResult } from './result.js';

/**
 * Breadth-First Search.
 * Explores the grid in "rings" of equal distance using a FIFO queue.
 * Guarantees the shortest path in number of steps, but IGNORES weights.
 *
 * Time O(V + E), Space O(V)
 */
export function bfs(grid, start, end) {
  const n = grid.rows * grid.cols;
  const seen = new Uint8Array(n);
  const prev = new Int32Array(n).fill(-1);
  const steps = [];

  // Array + head pointer = O(1) dequeue (Array.shift() would be O(n)).
  const queue = [start];
  let head = 0;
  seen[start] = 1;
  steps.push({ type: 'frontier', i: start });

  let found = false;
  let visitedCount = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    steps.push({ type: 'visit', i: cur });
    visitedCount++;
    if (cur === end) {
      found = true;
      break;
    }
    for (const nb of neighbors(grid, cur)) {
      if (seen[nb]) continue;
      seen[nb] = 1; // mark on enqueue so a node is never queued twice
      prev[nb] = cur;
      queue.push(nb);
      steps.push({ type: 'frontier', i: nb });
    }
  }

  return buildResult(grid, steps, prev, start, end, found, visitedCount);
}
