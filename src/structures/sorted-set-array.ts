type ReduceFunc<R,T> = (aggregator: R, item: T) => R

interface List<T> {
  insert(at: number, item: T): List<T>
  get?(at: number): T
  size(): number
  reduce<R>(fn: ReduceFunc<R,T>, aggregator: R): R
  mempty(): List<T>
}

interface Item<T> {
  compare(b: Item<T>): number
}

function divide<T extends Item<T>, R>(
  lower: number,
  upper: number,
  elements: List<T>,
  item: T,
  onNew: (item: T, elements: List<T>, lower: number) => R,
  onExists: (item: T, elements: List<T>) => R,
): R {
  const step = (upper - lower);
  if (step < 1) {
    return onNew(item, elements, lower)
  }

  const half = step / 2 | 0;
  const idx = lower + half;
  const elm = elements.get(idx);
  const cmp = elm.compare(item);

  if (cmp < 0) {
    return divide(half ? (lower + half) : upper, upper, elements, item, onNew, onExists);
  }

  if (cmp > 0) {
    return divide(lower, half ? (upper - half) : lower, elements, item, onNew, onExists);
  }

  return onExists(elm, elements)
}

class Tuple<A,B> {
  constructor(public result: A, public value: B) {}
}

export class SortedSetArray<T extends Item<T>> {
  elements: List<T>

  constructor(elements: List<T>) {
    this.elements = elements;
  }

  mempty(): SortedSetArray<T> {
    return new SortedSetArray(this.elements.mempty());
  }

  size(): number {
    return this.elements.size();
  }

  add(value: T): Tuple<SortedSetArray<T>,T> {
    return divide(
      0, this.elements.size(), this.elements, value,
      (value, elements, lower) => new Tuple(new SortedSetArray(elements.insert(lower, value)), value),
      (value, elements) => new Tuple(this, value)
    );
  }

  has(value: T): boolean {
    return divide(
      0, this.elements.size(), this.elements, value,
      () => false,
      () => true
    );
  }

  union(b: SortedSetArray<T>): SortedSetArray<T> {
    return b.reduce((result: SortedSetArray<T>, item: T): SortedSetArray<T> => {
      return result.add(item).result;
    }, this);
  }

  intersect(b: SortedSetArray<T>): SortedSetArray<T> {
    return b.reduce((result: SortedSetArray<T>, item: T): SortedSetArray<T> => {
      return this.has(item) ? result.add(item).result : result;
    }, this.mempty());
  }

  difference(b: SortedSetArray<T>): SortedSetArray<T> {
    return this.reduce((result: SortedSetArray<T>, item: T): SortedSetArray<T> => {
      return b.has(item) ? result : result.add(item).result;
    }, this.mempty())
  }

  equal(b: SortedSetArray<T>): boolean {
    if (this.size() != b.size()) {
      return false;
    }

    // TODO reduce is not optimal, because it iterates till the end of set
    return b.reduce((equal: boolean, item: T): boolean => {
      return equal ? this.has(item) : equal;
    }, true);
  }

  reduce<R>(fn: ReduceFunc<R,T>, accumulator: R): R {
    return this.elements.reduce(fn, accumulator);
  }
}
