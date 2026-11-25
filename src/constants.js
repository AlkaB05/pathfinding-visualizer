// Odd dimensions so recursive-backtracking mazes have a solid outer border.
export const ROWS = 25;
export const COLS = 51;
export const CELL = 24; // logical pixel size of one cell on the canvas

export const WEIGHT_COST = 5;

export const DEFAULT_START = [12, 10];
export const DEFAULT_END = [12, 40];

/** Visual state of a cell (separate from the graph model). */
export const VIS = {
  NONE: 0,
  FRONTIER: 1, // discovered, waiting in queue / heap / stack
  VISITED: 2, // popped and expanded
};

/** Speed slider positions -> algorithm steps applied per frame (~60 fps). */
export const SPEED_LEVELS = [
  { label: 'Crawl', steps: 0.25 },
  { label: 'Slow', steps: 1 },
  { label: 'Normal', steps: 3 },
  { label: 'Fast', steps: 10 },
  { label: 'Instant', steps: Infinity },
];

/** How long a freshly visited cell takes to cool from bright to settled. */
export const FADE_MS = 650;

export const COLORS = {
  empty: '#000000',
  line: '#151515',
  wall: '#3b3b3b',
  frontier: '#52a8ff',
  visitedHot: '#a6d4ff',
  visitedCool: '#0b2d5c',
  path: '#f5a623',
  weight: '#c084fc',
  start: '#50e3c2',
  end: '#ff4d4f',
};
