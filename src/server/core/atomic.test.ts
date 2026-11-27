import test from 'node:test';
import assert from 'node:assert/strict';
import {
  atomicUpdateHash,
  type WatchStore,
  type WatchTx,
} from '../../shared/atomic.ts';

const createMockStore = (
  initial: Record<string, string>,
  onReadDelayMs = 5
): { store: WatchStore; data: Record<string, string>; conflicts: number } => {
  const data: Record<string, string> = { ...initial };
  let version = 1;
  let conflicts = 0;

  const store: WatchStore = {
    watch: async () => {
      const watchedVersion = version;
      const queued: Array<() => void> = [];
      let multiActive = false;

      const tx: WatchTx = {
        multi: async () => {
          multiActive = true;
        },
        hSet: async (_key, fields) => {
          const run = () => {
            for (const [k, v] of Object.entries(fields)) {
              data[k] = v;
            }
          };
          if (multiActive) queued.push(run);
          else run();
          return tx;
        },
        exec: async () => {
          if (version !== watchedVersion) {
            conflicts += 1;
            return [];
          }
          for (const op of queued) op();
          version += 1;
          return [1];
        },
        unwatch: async () => tx,
      };
      return tx;
    },
    hGetAll: async () => {
      const snapshot = { ...data };
      await new Promise((resolve) => setTimeout(resolve, onReadDelayMs));
      return snapshot;
    },
  };

  return {
    store,
    data,
    get conflicts() {
      return conflicts;
    },
  };
};

void test('atomicUpdateHash retries WATCH conflicts so concurrent stat updates never lose data', async () => {
  const mock = createMockStore({
    food: '6',
    power: '6',
    health: '10',
    scrap: '2',
  });

  const num = (v: string | undefined) => (v ? parseInt(v, 10) : 0);

  const [resA, resB] = await Promise.all([
    atomicUpdateHash(mock.store, 'cp:player:u1', (h) => {
      const nextFood = Math.min(10, num(h['food']) + 3);
      return {
        commit: true,
        fields: { food: String(nextFood) },
        result: nextFood,
      };
    }),
    atomicUpdateHash(mock.store, 'cp:player:u1', (h) => {
      const nextPower = Math.max(0, num(h['power']) - 2);
      const nextScrap = num(h['scrap']) + 1;
      return {
        commit: true,
        fields: { power: String(nextPower), scrap: String(nextScrap) },
        result: { nextPower, nextScrap },
      };
    }),
  ]);

  assert.equal(mock.conflicts >= 1, true);
  assert.equal(resA, 9);
  assert.deepEqual(resB, { nextPower: 4, nextScrap: 3 });
  assert.equal(mock.data['food'], '9');
  assert.equal(mock.data['power'], '4');
  assert.equal(mock.data['scrap'], '3');
});

void test('concurrent same-stat increments both apply under WATCH retry', async () => {
  const mock = createMockStore({ trustGood: '0', trustTotal: '0' });
  const num = (v: string | undefined) => (v ? parseInt(v, 10) : 0);

  await Promise.all([
    atomicUpdateHash(mock.store, 'cp:player:u1', (h) => ({
      commit: true,
      fields: {
        trustGood: String(num(h['trustGood']) + 1),
        trustTotal: String(num(h['trustTotal']) + 1),
      },
      result: true,
    })),
    atomicUpdateHash(mock.store, 'cp:player:u1', (h) => ({
      commit: true,
      fields: {
        trustGood: String(num(h['trustGood']) + 3),
        trustTotal: String(num(h['trustTotal']) + 3),
      },
      result: true,
    })),
  ]);

  assert.equal(mock.conflicts >= 1, true);
  assert.equal(mock.data['trustGood'], '4');
  assert.equal(mock.data['trustTotal'], '4');
});
