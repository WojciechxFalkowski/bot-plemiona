/**
 * Runs async work over items with at most `limit` concurrent executions.
 * Used to avoid sequential latency without unbounded parallel DB-facing work.
 *
 * @param items Input collection
 * @limit Max concurrent `fn` invocations
 * @param fn Async mapper
 * @returns Results in the same order as `items`
 */
export async function runWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const runWorker = async (): Promise<void> => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) {
        return;
      }
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
