import { describe, expect, it } from 'vitest';
import { bfs } from '../src/algorithms/index.js';
import { createGrid, neighbors } from '../src/lib/grid.js';
import { generateMaze, seededRandom, snapToRoom } from '../src/maze/recursiveBacktracker.js';

const ROWS = 25;
const COLS = 51;

function mazeGrid(seed) {
  const grid = createGrid(ROWS, COLS);
  grid.walls.set(generateMaze(ROWS, COLS, seededRandom(seed)).walls);
  return grid;
}

describe('recursive backtracking maze', () => {
  it('keeps a solid outer border', () => {
    const grid = mazeGrid(1);
    for (let c = 0; c < COLS; c++) {
      expect(grid.walls[c]).toBe(1);
      expect(grid.walls[(ROWS - 1) * COLS + c]).toBe(1);
    }
    for (let r = 0; r < ROWS; r++) {
      expect(grid.walls[r * COLS]).toBe(1);
      expect(grid.walls[r * COLS + COLS - 1]).toBe(1);
    }
  });

  it('opens every room and connects all of them', () => {
    for (const seed of [1, 2, 3, 99]) {
      const grid = mazeGrid(seed);
      const first = 1 * COLS + 1;
      const reach = bfs(grid, first, -1); // end = -1 -> explore everything
      const rooms = ((ROWS - 1) / 2) * ((COLS - 1) / 2);
      for (let r = 1; r < ROWS; r += 2) {
        for (let c = 1; c < COLS; c += 2) expect(grid.walls[r * COLS + c]).toBe(0);
      }
      const open = grid.walls.reduce((n, w) => n + (w ? 0 : 1), 0);
      expect(reach.visitedCount).toBe(open); // every open cell reachable
      // A perfect maze is a spanning tree over the rooms: rooms - 1 carved walls.
      expect(open).toBe(rooms + (rooms - 1));
    }
  });

  it('is a perfect maze (no loops): edges = nodes - 1', () => {
    const grid = mazeGrid(7);
    let nodes = 0;
    let degreeSum = 0;
    for (let i = 0; i < ROWS * COLS; i++) {
      if (grid.walls[i]) continue;
      nodes++;
      degreeSum += neighbors(grid, i).length;
    }
    expect(degreeSum / 2).toBe(nodes - 1);
  });

  it('carveOrder replays to the same walls', () => {
    const { walls, carveOrder } = generateMaze(ROWS, COLS, seededRandom(5));
    const replay = new Uint8Array(ROWS * COLS).fill(1);
    for (const i of carveOrder) replay[i] = 0;
    expect(replay).toEqual(walls);
  });

  it('snapToRoom returns odd coordinates inside the border', () => {
    for (const [r, c] of [[0, 0], [12, 10], [24, 50], [23, 49], [6, 7]]) {
      const [sr, sc] = snapToRoom(ROWS, COLS, r, c);
      expect(sr % 2).toBe(1);
      expect(sc % 2).toBe(1);
      expect(sr).toBeLessThanOrEqual(ROWS - 2);
      expect(sc).toBeLessThanOrEqual(COLS - 2);
    }
  });
});
