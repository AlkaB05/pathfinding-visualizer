import { astar } from './astar.js';
import { bfs } from './bfs.js';
import { dfs } from './dfs.js';
import { dijkstra } from './dijkstra.js';

export const ALGORITHMS = {
  dijkstra: {
    name: "Dijkstra's Algorithm",
    short: 'Dijkstra',
    fn: dijkstra,
    weighted: true,
    shortest: true,
    structure: 'Min-heap on g(n)',
    time: 'O((V + E) log V)',
    blurb: 'Expands the closest unvisited node first. Handles weights and always returns the cheapest path.',
  },
  astar: {
    name: 'A* Search',
    short: 'A*',
    fn: astar,
    weighted: true,
    shortest: true,
    structure: 'Min-heap on g(n) + h(n)',
    time: 'O((V + E) log V)',
    blurb: 'Dijkstra plus a Manhattan-distance heuristic that pulls the search toward the target.',
  },
  bfs: {
    name: 'Breadth-First Search',
    short: 'BFS',
    fn: bfs,
    weighted: false,
    shortest: true,
    structure: 'FIFO queue',
    time: 'O(V + E)',
    blurb: 'Explores in rings of equal step count. Shortest in steps, but blind to weights.',
  },
  dfs: {
    name: 'Depth-First Search',
    short: 'DFS',
    fn: dfs,
    weighted: false,
    shortest: false,
    structure: 'LIFO stack',
    time: 'O(V + E)',
    blurb: 'Dives down one branch before backtracking. Finds a path, rarely the shortest one.',
  },
};

export { astar, bfs, dfs, dijkstra };
