import { describe, expect, it } from 'vitest';
import { MinHeap } from '../src/lib/MinHeap.js';

describe('MinHeap', () => {
  it('pops numbers in ascending order (heap sort)', () => {
    const values = Array.from({ length: 500 }, (_, k) => (k * 7919) % 1009);
    const heap = new MinHeap();
    values.forEach((v) => heap.push(v));
    const out = [];
    while (!heap.isEmpty()) out.push(heap.pop());
    expect(out).toEqual([...values].sort((a, b) => a - b));
  });

  it('supports a custom comparator and peek/size', () => {
    const heap = new MinHeap((a, b) => a.d - b.d);
    heap.push({ id: 'a', d: 5 });
    heap.push({ id: 'b', d: 1 });
    heap.push({ id: 'c', d: 3 });
    expect(heap.size).toBe(3);
    expect(heap.peek().id).toBe('b');
    expect(heap.pop().id).toBe('b');
    expect(heap.pop().id).toBe('c');
    expect(heap.size).toBe(1);
  });

  it('returns undefined when empty', () => {
    expect(new MinHeap().pop()).toBeUndefined();
  });
});
