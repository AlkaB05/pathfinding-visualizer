/**
 * Maze generation with recursive backtracking (randomised DFS).
 *
 * Think of the grid as "rooms" at odd (row, col) coordinates separated by
 * wall cells. Start with every cell blocked, then:
 *   1. Open a starting room and push it on a stack.
 *   2. Look at the top room. Pick a random unvisited room 2 cells away.
 *      - Found one: knock down the wall between them, open it, push it.
 *      - None left: pop (backtrack).
 *   3. Repeat until the stack is empty.
 *
 * The result is a "perfect" maze: every room is reachable and there is exactly
 * one path between any two rooms (it is a spanning tree).
 *
 * An explicit stack is used instead of real recursion so large grids cannot
 * overflow the JS call stack. The logic is identical.
 *
 * Returns the final walls array and `carveOrder`, the cells in the order they
 * were opened, so the UI can animate the carving.
 */
export function generateMaze(rows, cols, rng = Math.random) {
  const walls = new Uint8Array(rows * cols).fill(1);
  const carveOrder = [];
  const idx = (r, c) => r * cols + c;
  const open = (r, c) => {
    walls[idx(r, c)] = 0;
    carveOrder.push(idx(r, c));
  };

  const visited = new Uint8Array(rows * cols);
  const stack = [[1, 1]];
  visited[idx(1, 1)] = 1;
  open(1, 1);

  const DIRS = [
    [-2, 0],
    [0, 2],
    [2, 0],
    [0, -2],
  ];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const options = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !visited[idx(nr, nc)]) {
        options.push([nr, nc, dr, dc]);
      }
    }
    if (options.length === 0) {
      stack.pop(); // dead end -> backtrack
      continue;
    }
    const [nr, nc, dr, dc] = options[Math.floor(rng() * options.length)];
    open(r + dr / 2, c + dc / 2); // the wall between the two rooms
    open(nr, nc);
    visited[idx(nr, nc)] = 1;
    stack.push([nr, nc]);
  }

  return { walls, carveOrder };
}

/** Snap a cell to the nearest room (odd row & odd col) inside the grid. */
export function snapToRoom(rows, cols, row, col) {
  const fix = (v, max) => {
    let x = v % 2 === 1 ? v : v + 1;
    if (x > max - 2) x -= 2;
    return Math.max(1, x);
  };
  return [fix(row, rows), fix(col, cols)];
}

/** Small seeded PRNG (mulberry32) so mazes are reproducible in tests. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
