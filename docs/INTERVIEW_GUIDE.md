# Pathfinding Visualizer — Interview Guide

Everything you need to explain and defend this project. Read it top to bottom once, then use §11 (questions) and §12 (numbers) as a cheat sheet.

---

## 1. The 30-second pitch

> "It's an interactive React app where you draw walls and weighted cells on a grid, pick a start and target, and watch Dijkstra, A\*, BFS or DFS search step by step. Every algorithm is a pure function that returns the full list of steps it took, and the UI replays those steps on an HTML5 canvas, so you can see the frontier, the visited nodes and the final path. I wrote the min-heap priority queue myself for Dijkstra and A\*, and I added maze generation with recursive backtracking. There's also a compare mode that runs all four on the same board, which shows clearly that A\* explores far fewer nodes than Dijkstra while finding the same cost."

---

## 2. Resume bullets → where they live in the code

| Resume claim | What to point at |
| --- | --- |
| Grid-based visualizer implementing Dijkstra's, A\*, BFS, DFS | `src/algorithms/dijkstra.js`, `astar.js`, `bfs.js`, `dfs.js` |
| Compute shortest paths between user-defined start and end | Drag the green start / red target; `src/App.jsx` → `onCellDown`, `onCellEnter` |
| Animated node traversal step-by-step in real time | `visualize()` in `src/App.jsx` replays `result.steps` with `requestAnimationFrame` |
| Distinguishing visited, frontier and final path | `VIS.FRONTIER` / `VIS.VISITED` in `src/constants.js`, colours in `src/lib/renderer.js` |
| Clear algorithm comparison | "Compare → Run all four" panel → `compareAll()` in `App.jsx` |
| Maze generation using recursive backtracking | `src/maze/recursiveBacktracker.js` |
| Priority Queue (Min-Heap) | `src/lib/MinHeap.js` |
| HTML5 Canvas | `src/lib/renderer.js`, `src/components/GridCanvas.jsx` |
| CSS Grid | Page layout in `src/App.css` (`.app`: top bar, sidebar, stage, inspector, status bar) |

**One honest nuance:** the resume says the algorithms "compute shortest paths". Dijkstra, A\* and BFS do. **DFS does not guarantee a shortest path** — it finds *a* path. The app says this in the UI ("no shortest guarantee") and it's a great thing to bring up yourself; it shows you understand the algorithms rather than just listing them.

---

## 3. Architecture

```
 user input (mouse / keyboard)
        │
        ▼
   App.jsx  ── mutates ──►  grid model (refs: walls[], weights[], start, end)
        │
        │  Run
        ▼
 algorithm(grid, start, end)   ← pure function, runs fully in ~1 ms
        │ returns { steps[], path[], visitedCount, pathLength, cost }
        ▼
 animation loop (requestAnimationFrame)
   applies N steps per frame to visual[] state
        │
        ▼
 renderer.drawGrid(ctx, scene)  → <canvas>
```

### 3.1 The grid is a graph

- 25 rows × 51 columns = **1,275 nodes**.
- Each node connects to up to 4 neighbours (up, right, down, left) → at most ~2,500 undirected edges. That's a **sparse** graph, which is why an adjacency-by-coordinates approach (compute neighbours on the fly) is better than storing an adjacency matrix (1,275² cells, mostly zeros).
- Cells are addressed by a single integer `i = row * cols + col` and stored in flat typed arrays (`Uint8Array` for walls and weights). Typed arrays are compact and fast, and a single integer index is easy to use as a key in `prev[]`, `dist[]`, etc.
- **Weights are node costs:** entering a normal cell costs 1, entering a weighted cell costs 5. Walls are simply nodes you can't enter.

Code: `src/lib/grid.js` (`createGrid`, `neighbors`, `manhattan`, `reconstructPath`, `pathCost`).

### 3.2 Algorithms are pure functions that record steps

Every algorithm returns the same shape (`src/algorithms/result.js`):

```js
{
  steps: [{ type: 'frontier' | 'visit', i }],  // in the exact order they happened
  path: [start, ..., end],                       // [] if unreachable
  found, visitedCount, pathLength, cost
}
```

**Why record steps instead of animating inside the algorithm?**
- The algorithms stay **pure and testable** — no React, no timers, no `await sleep()`.
- The speed can change **mid-animation** (the loop just reads the current speed each frame).
- "Instant" mode and "Compare all" reuse the exact same functions.
- On a 1,275-node grid even the full step list is tiny (a few thousand objects).

### 3.3 Why Canvas instead of 1,275 `<div>`s?

During an animation the board changes every frame (60 fps). With divs, every frame would mean React reconciling up to 1,275 components and the browser recalculating styles/layout for them. With a canvas, one `drawGrid` call does ~1,300 `fillRect`s — a few hundred microseconds — and React only renders **one** `<canvas>` element. The canvas is also scaled by `devicePixelRatio` so it stays sharp on HiDPI/Retina screens.

### 3.4 Refs vs state (React)

- **Refs** (`useRef`) hold the big, fast-changing data: walls, weights, per-cell visual state, start/end, current path. Mutating a ref does **not** re-render React — we repaint the canvas directly.
- **State** (`useState`) holds only what the side panels display: selected algorithm, speed, tool, stats, comparison rows.
- This avoids re-rendering the whole app 60 times a second.

### 3.5 Mouse handling

`GridCanvas.jsx` converts a pointer position to a cell: `col = floor((x / rect.width) * cols)`. Pointer events (not mouse events) are used so it also works on touch screens, and `setPointerCapture` keeps the drag going even if the pointer leaves the canvas. A fast drag can jump several cells between two events, so `cellsBetween()` walks the straight line between the last cell and the new one and paints every cell on it.

---

## 4. The algorithms

All four share the same skeleton: an **open set** (things discovered but not yet expanded) and a **closed / visited set**. What changes is the data structure used as the open set — and that single choice determines the order nodes are explored in.

| | Open set | Order explored | Weights? | Shortest? | Time |
| --- | --- | --- | --- | --- | --- |
| BFS | FIFO queue | by number of steps | ignores | yes (in steps) | O(V + E) |
| DFS | LIFO stack | deepest first | ignores | **no** | O(V + E) |
| Dijkstra | min-heap on g | by cost from start | yes | yes (in cost) | O((V + E) log V) |
| A\* | min-heap on g + h | by estimated total cost | yes | yes (heuristic admissible) | O((V + E) log V) worst case |

`V` = cells, `E` = edges. On this grid `E ≤ 4V`, so all of them are effectively O(V) or O(V log V).

### 4.1 Breadth-First Search — `src/algorithms/bfs.js`

```
queue = [start]; seen[start] = true
while queue not empty:
    cur = dequeue()
    if cur == end: done
    for each neighbour nb of cur:
        if not seen[nb]: seen[nb] = true; prev[nb] = cur; enqueue(nb)
```

- Explores in "rings": everything 1 step away, then 2 steps, etc. So the first time it reaches the target, that's the **fewest steps**.
- **Ignores weights**: with weighted cells on the board, BFS can return a path that's short in steps but expensive in cost. The compare panel shows this.
- **Mark seen when enqueuing, not when dequeuing** — otherwise the same cell can be added to the queue many times.
- **O(1) dequeue:** I use an array plus a `head` index instead of `Array.shift()`, which is O(n) because it re-indexes the whole array.

### 4.2 Depth-First Search — `src/algorithms/dfs.js`

- Uses an explicit **stack** instead of recursion, so a big grid can't overflow the JavaScript call stack. The logic is the same as recursive DFS.
- Each stack entry stores `[node, parent]`, and the parent is fixed only when the node is actually popped and visited. That produces the same DFS tree as the recursive version.
- Neighbours are pushed in reverse so the first direction (up) is explored first.
- **Not shortest.** DFS commits to one direction and goes as deep as it can. On an open grid it snakes around and returns a very long path. In a *perfect* maze (exactly one path between any two cells) every algorithm returns the same path, so DFS looks fine there — a nice point to mention.

### 4.3 Dijkstra's algorithm — `src/algorithms/dijkstra.js`

```
dist[all] = ∞; dist[start] = 0
heap.push(start, 0)
while heap not empty:
    (cur, d) = heap.pop()              // smallest distance
    if closed[cur]: continue           // stale entry (lazy deletion)
    closed[cur] = true
    if cur == end: done
    for each neighbour nb:
        nd = d + weight[nb]            // relaxation
        if nd < dist[nb]:
            dist[nb] = nd; prev[nb] = cur; heap.push(nb, nd)
```

- **Greedy idea:** the unvisited node with the smallest known distance can't be improved later, because all weights are non-negative — any other route to it would go through a node that's already at least as far.
- **Lazy deletion:** a textbook Dijkstra uses a "decrease-key" operation. A binary heap in JS doesn't support that cheaply, so when a node's distance improves I **push it again**. The old entry is still in the heap; when it's popped later, `closed[cur]` is already true, so it's skipped. Heap size can grow up to O(E) instead of O(V), but log E ≈ log V on this grid, so complexity is unchanged. This is how most production implementations do it.
- **Tie-breaking:** each heap entry has an insertion counter `seq`, so equal distances come out in FIFO order. That makes runs deterministic (same board → same animation).
- **Negative weights:** Dijkstra breaks with negative edges (use Bellman-Ford). Not an issue here since costs are 1 or 5.

### 4.4 A\* search — `src/algorithms/astar.js`

- Same as Dijkstra, but the heap is ordered by `f(n) = g(n) + h(n)`:
  - `g(n)` = exact cost from start to `n` (same as Dijkstra's `dist`),
  - `h(n)` = **Manhattan distance** `|r1 − r2| + |c1 − c2|` from `n` to the target.
- **Why Manhattan?** Movement is 4-directional, so you need at least `|dr| + |dc|` moves, and every move costs at least 1. So `h` **never overestimates** (it's *admissible*) → A\* still returns the optimal cost. It's also *consistent* (`h(a) ≤ cost(a→b) + h(b)`), so a node never needs to be reopened once closed.
- **Effect:** the heuristic pulls the search toward the target. On the empty board A\* expands **31** nodes versus Dijkstra's **857**, with the same path cost. With walls in the way the gap shrinks, but A\* still expands fewer nodes in practice (the compare panel shows it).
- **Tie-breaking:** equal `f` → prefer smaller `h` (the node closer to the goal). Without this, A\* on an open grid explores a wide band of equal-f cells; with it, it heads almost straight for the target.
- **If h = 0**, A\* becomes Dijkstra. **If h overestimates**, A\* gets faster but can return a non-optimal path (that's "weighted A\*").
- Euclidean distance would also be admissible but weaker (smaller) than Manhattan for 4-directional movement, so it would explore more. Diagonal moves would call for Chebyshev/octile distance instead.

### 4.5 Rebuilding the path

Every algorithm fills `prev[node] = parent` when it discovers a better route. After reaching the target, `reconstructPath` walks `end → prev[end] → … → start` and reverses the list. O(path length).

---

## 5. The min-heap priority queue — `src/lib/MinHeap.js`

- A **complete binary tree stored in a flat array**:
  - parent of `i` = `(i − 1) >> 1`, left child = `2i + 1`, right child = `2i + 2`.
  - Invariant: every parent ≤ its children, so the minimum is always at index 0.
- **push:** append at the end, then **sift up** (swap with parent while smaller). O(log n).
- **pop:** take the root, move the last element to the root, then **sift down** (swap with the smaller child while larger). O(log n).
- **peek / size:** O(1).
- It takes a comparator, so Dijkstra compares `(d, seq)` and A\* compares `(f, h, seq)`.

**Why not a sorted array?** Insert would be O(n). **Why not scan an unsorted array for the minimum?** Pop would be O(n), making Dijkstra O(V²). The heap gives O(log n) for both. (A Fibonacci heap gives O(1) amortised decrease-key and O(E + V log V) Dijkstra in theory, but its constant factors make it slower in practice.)

---

## 6. Animation — `visualize()` in `src/App.jsx`

1. Run the chosen algorithm once and time it with `performance.now()`.
2. Start a `requestAnimationFrame` loop. Each frame:
   - add the current speed (steps per frame) to a `budget`, and apply `floor(budget)` steps. A fractional speed like 0.25 means "one step every 4 frames" — that's how "Crawl" works.
   - `applyStep`: a `frontier` event draws a hollow blue ring on the cell (if it wasn't already visited); a `visit` event fills it blue and records the timestamp.
   - once all steps are applied, trace the path a little more each frame.
   - redraw the canvas.
3. Visited cells **fade** from light blue to deep blue over ~650 ms (precomputed colour ramp in `renderer.js`), so the "wave" of the search is visible. With `prefers-reduced-motion`, the fade is skipped.
4. The live stats panel shows **visited** count and **open-set size** (cells currently showing a ring) while it runs.

`requestAnimationFrame` is used instead of `setInterval` because it syncs with the display refresh, pauses in background tabs, and never queues up frames.

---

## 7. Maze generation — `src/maze/recursiveBacktracker.js`

**Recursive backtracking = randomised DFS that knocks down walls.**

1. Treat cells at **odd (row, col)** as "rooms" and everything else as walls. Start with the whole grid blocked. (That's why the grid is 25 × 51 — odd sizes give a solid border.)
2. Open room (1, 1) and push it on a stack.
3. Look at the room on top of the stack. Pick a **random unvisited room two cells away**.
   - If there is one: open the wall cell between them, open the new room, push it.
   - If none: **pop** — this is the "backtracking".
4. Repeat until the stack is empty.

Properties:
- It produces a **perfect maze**: every room is reachable and there's **exactly one path** between any two rooms (the carved passages form a spanning tree). Tests check this: open cells form a connected graph with `edges = nodes − 1`.
- Long, winding corridors with few branches — characteristic of DFS-based mazes. (Prim's or Kruskal's give shorter, bushier dead ends.)
- Time and space O(rows × cols).
- An explicit stack instead of real recursion → no call-stack overflow on large grids.
- It records `carveOrder` so the UI can animate the carving. Start and end are snapped to the nearest room cell (`snapToRoom`) so they're always inside the maze.

---

## 8. Compare mode

`compareAll()` runs all four algorithms on the current board **5 times each**, takes the **median** time (a single run is noisy at sub-millisecond scale), and shows nodes visited, path length and path cost. The cheapest path is highlighted. Things it demonstrates:

- **Open board:** BFS, Dijkstra and A\* find the same length; A\* visits far fewer nodes; DFS returns a very long path.
- **With weights:** Dijkstra and A\* go around the weighted cells; BFS goes straight through and has a higher **cost** even though its **length** is shortest.
- **In a perfect maze:** all four return the same path, because there's only one.

---

## 9. Testing — `npm test`

23 Vitest tests in `tests/`:

- **MinHeap:** pops 500 values in sorted order (heap sort), custom comparator, empty heap.
- **Open grid:** every algorithm returns a valid path; BFS/Dijkstra/A\* length = Manhattan distance; A\* visits fewer nodes than Dijkstra.
- **Weights:** a hand-built board where the short route is weighted — Dijkstra and A\* take the cheaper detour (cost 10), BFS takes the 6-step route (cost 18).
- **Unreachable:** all four report no path.
- **Randomised cross-check on 200 boards** (seeded RNG, 28% walls, 15% weights): A\* cost always equals Dijkstra's; BFS is never cheaper than Dijkstra and never longer in steps; every returned path is valid and connected.
- **Exploration order** (`order.test.js`, 150 random weighted boards per algorithm), checked against distances computed independently:
  - BFS visits cells in non-decreasing step distance;
  - Dijkstra visits in non-decreasing weighted distance, each cell once, and expands everything closer than the target first;
  - A\* visits in non-decreasing `f = g + h` and never expands a cell with `f` above the optimal cost (this is what "A\* is optimally efficient" means);
  - DFS follows true recursive depth-first order: every visit is the first unvisited neighbour (up, right, down, left) of the deepest cell on the current path.
- **Maze:** solid border, every room open, everything connected, `edges = nodes − 1` (no loops), `carveOrder` replays to the same maze.

---

## 10. Trade-offs and what I'd do next

- **Diagonal movement** (8 neighbours, √2 cost, octile heuristic).
- **Bidirectional search** (BFS / A\* from both ends, roughly halves explored nodes).
- **Greedy best-first search** (only `h`) to show fast-but-not-optimal behaviour.
- **Other mazes:** Prim's, Kruskal's, recursive division.
- **Decrease-key heap** (indexed heap) to keep the heap at O(V) entries.
- **Web Worker** for the algorithms on very large grids so the UI thread never blocks (unnecessary at 1,275 cells — each run takes about a millisecond).
- **Resizable grid** and saving/loading boards via the URL.

---

## 11. Likely interview questions (with answers)

**Q: Why does BFS give the shortest path but DFS doesn't?**
BFS explores in order of distance from the start, so the first time it reaches the target it has used the fewest edges. DFS explores in order of depth along one branch — it can reach the target through a long detour before ever trying the short route.

**Q: When would you use BFS instead of Dijkstra?**
When all edges cost the same. BFS is O(V + E) with a plain queue; Dijkstra adds a log factor for the heap. With uniform weights they return the same path length.

**Q: Why does Dijkstra fail with negative weights?**
It assumes that once a node is popped its distance is final. A negative edge found later could make an already-finalised node cheaper. Use Bellman-Ford (O(VE)) instead.

**Q: What makes A\* better than Dijkstra, and when is it still optimal?**
The heuristic focuses the search toward the goal, so it expands fewer nodes. It stays optimal as long as `h` is **admissible** (never overestimates the true remaining cost). Manhattan distance is admissible here because each move costs at least 1 and you can't move diagonally.

**Q: What's the difference between admissible and consistent?**
Admissible: `h(n) ≤ true cost to goal`. Consistent: `h(n) ≤ cost(n, n') + h(n')` for every edge. Consistent implies admissible, and with a consistent heuristic a closed node never needs to be reopened. Manhattan is consistent on this grid.

**Q: What if the heuristic overestimates?**
A\* may return a non-optimal path but usually runs faster. Multiplying `h` by a factor > 1 is called weighted A\* and is used in games where speed matters more than perfection.

**Q: How do you handle a node's distance improving after it's already in the heap?**
Lazy deletion: push it again with the new distance and skip stale entries when popped (`if (closed[cur]) continue`). Alternative: an indexed heap with decrease-key.

**Q: Time complexity of Dijkstra with a binary heap?**
O((V + E) log V). Each edge relaxation can push once (O(log V)), each node is popped once. With lazy deletion the heap can hold O(E) entries, and log E = O(log V).

**Q: How is the heap stored? How do you find a node's children?**
In an array. Children of index `i` are `2i + 1` and `2i + 2`, parent is `(i − 1) / 2` rounded down.

**Q: Why canvas and not a DOM grid?**
Performance during animation. One canvas repaint per frame is ~1,300 `fillRect` calls; a DOM grid would mean diffing and re-styling 1,275 elements 60 times a second.

**Q: How does the animation work if the algorithm finishes instantly?**
The algorithm records every step into an array. The animation loop replays that array a few steps per frame with `requestAnimationFrame`. Speed is steps-per-frame, and it can be fractional.

**Q: Frontier vs visited — what's the difference?**
Frontier = discovered and sitting in the queue / heap / stack but not processed yet (the open set). Visited = removed from the open set and its neighbours have been examined (the closed set).

**Q: How does recursive backtracking generate a maze? Is every cell reachable?**
It's a randomised DFS over "room" cells that removes the wall between the current room and a random unvisited neighbour, backtracking at dead ends. It visits every room, and the removed walls form a spanning tree, so everything is reachable and there's exactly one path between any two points.

**Q: Why is it implemented with a stack if it's called "recursive"?**
Same algorithm, explicit stack instead of the call stack. Avoids stack-overflow on large grids, and the order of operations is identical.

**Q: Why are the grid dimensions odd?**
Rooms sit on odd coordinates with walls between them; odd dimensions leave a solid one-cell border on all four sides.

**Q: How do you make the comparison fair?**
Same board, same start/end, run each algorithm 5 times and take the median time; also compare nodes visited and path cost, which don't depend on machine speed.

**Q: What would change for diagonal moves?**
8 neighbours, diagonal cost √2 (or 1.4), and the heuristic becomes octile distance; Manhattan would then overestimate and break optimality.

**Q: How would you scale this to a huge map (e.g. a game world)?**
Bidirectional A\*, hierarchical pathfinding (HPA\*), jump point search on uniform grids, precomputed landmarks (ALT), and run search off the main thread in a Web Worker.

**Q: How did you test that the algorithms are correct?**
Unit tests on known boards, plus a randomised cross-check on 200 seeded boards: A\* cost must equal Dijkstra's (both optimal), BFS can't beat Dijkstra on cost or lose to it on step count, and every path must be connected and avoid walls.

---

## 12. Numbers worth remembering

- Grid: **25 × 51 = 1,275** cells; weighted cell cost **5**.
- Empty board, start (row 12, col 10) → target (row 12, col 40): BFS / Dijkstra / A\* path length **30**. Dijkstra and BFS visit **857** nodes, A\* visits **31** (almost a straight line, thanks to tie-breaking on h), DFS visits 305 and returns a **304-step** path.
- Each algorithm run: about **1 ms** (a few ms the first time, before the JS engine warms up).
- Tests: **23** passing.
- Visited-cell fade: **650 ms**. Animation: ~60 fps via `requestAnimationFrame`.

## 13. A 2-minute demo script

1. Press **Space** on the empty board with **A\*** → it heads straight for the target.
2. Press **1** (Dijkstra) → result updates instantly; show the diamond-shaped search area.
3. Draw a wall between start and target, add a column of weights → **Run all four** in the Compare panel: BFS cost is higher; A\* visits the fewest nodes; DFS path is long.
4. Press **M** → watch the maze carve itself; run **DFS** and **BFS** — same path (perfect maze).
5. Drag the target around → the path re-routes live.
