import { pathCost, reconstructPath } from '../lib/grid.js';

/**
 * Every algorithm returns the same shape so the UI can animate any of them:
 *
 *   steps: ordered list of { type: 'frontier' | 'visit', i }
 *          'frontier' = node discovered and added to the open set (queue/heap/stack)
 *          'visit'    = node removed from the open set and expanded
 *   path:  cell indices from start to end ([] if unreachable)
 */
export function buildResult(grid, steps, prev, start, end, found, visitedCount) {
  const path = found ? reconstructPath(prev, start, end) : [];
  return {
    steps,
    path,
    found: path.length > 0,
    visitedCount,
    pathLength: path.length > 0 ? path.length - 1 : 0,
    cost: path.length > 0 ? pathCost(grid, path) : 0,
  };
}
