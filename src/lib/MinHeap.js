/**
 * Binary min-heap used as a priority queue.
 *
 * Stored as a flat array where for index i:
 *   parent = (i - 1) >> 1,  left = 2i + 1,  right = 2i + 2
 *
 * push / pop  -> O(log n)
 * peek / size -> O(1)
 *
 * `compare(a, b)` returns a negative number when `a` should come out first.
 */
export class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.data = [];
    this.compare = compare;
  }

  get size() {
    return this.data.length;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  peek() {
    return this.data[0];
  }

  push(item) {
    this.data.push(item);
    this.#siftUp(this.data.length - 1);
  }

  pop() {
    const data = this.data;
    if (data.length === 0) return undefined;
    const top = data[0];
    const last = data.pop();
    if (data.length > 0) {
      data[0] = last; // move last leaf to root, then push it down
      this.#siftDown(0);
    }
    return top;
  }

  #siftUp(i) {
    const data = this.data;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(data[i], data[parent]) >= 0) break;
      [data[i], data[parent]] = [data[parent], data[i]];
      i = parent;
    }
  }

  #siftDown(i) {
    const data = this.data;
    const n = data.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && this.compare(data[left], data[smallest]) < 0) smallest = left;
      if (right < n && this.compare(data[right], data[smallest]) < 0) smallest = right;
      if (smallest === i) break;
      [data[i], data[smallest]] = [data[smallest], data[i]];
      i = smallest;
    }
  }
}
