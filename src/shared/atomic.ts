export type WatchTx = {
  multi: () => Promise<void>;
  hSet: (key: string, fields: Record<string, string>) => Promise<unknown>;
  exec: () => Promise<unknown[]>;
  unwatch: () => Promise<unknown>;
};

export type WatchStore = {
  watch: (key: string) => Promise<WatchTx>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
};

export type HashUpdateDecision<T> =
  | { commit: true; fields: Record<string, string>; result: T }
  | { commit: false; result: T };

/**
 * Optimistically updates a Redis hash using WATCH / MULTI / EXEC with retries.
 */
export const atomicUpdateHash = async <T>(
  store: WatchStore,
  key: string,
  updater: (current: Record<string, string>) => HashUpdateDecision<T>,
  maxAttempts = 8
): Promise<T> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tx = await store.watch(key);
    const current = await store.hGetAll(key);
    const decision = updater(current);
    if (!decision.commit) {
      await tx.unwatch();
      return decision.result;
    }
    try {
      await tx.multi();
      await tx.hSet(key, decision.fields);
      const execResult = await tx.exec();
      if (Array.isArray(execResult) && execResult.length > 0) {
        return decision.result;
      }
    } catch {
      // WATCH conflict or aborted transaction; retry from a fresh read.
    }
  }
  throw new Error(`Atomic hash update failed after ${maxAttempts} attempts`);
};
