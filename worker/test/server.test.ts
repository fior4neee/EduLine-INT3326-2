import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { createWorkerServer, WorkerDependencies } from '../src/server';

const eventId = 'ac64beb1-011f-4b7b-9f20-7a268c6b4a11';
const envelope = {
  eventId, type: 'USER_REGISTERED', occurredAt: '2026-11-12T01:00:00.000Z',
  data: { userId: 'd2c3dcfe-a917-4e47-8f49-dcdd9df516b1', requestedInstructor: false },
};
const wrapped = (event: unknown = envelope) => ({
  message: { messageId: 'message-1', data: Buffer.from(JSON.stringify(event)).toString('base64') },
  subscription: 'projects/local/subscriptions/notifications-worker',
});

async function withServer(deps: Partial<WorkerDependencies>, run: (url: string) => Promise<void>) {
  const server = createWorkerServer({ handle: async () => 1, health: async () => {}, logger: () => {}, ...deps });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

const post = (url: string, body: unknown = wrapped()) => fetch(`${url}/pubsub/notifications`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('ACK is sent only after handle resolves; decoded Date reaches handler', async () => {
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const commit = new Promise<void>((resolve) => { release = resolve; });
  await withServer({ handle: async (event) => {
    assert.equal(event.eventId, eventId);
    assert.ok(event.occurredAt instanceof Date);
    entered();
    await commit;
    return 1;
  } }, async (url) => {
    let acknowledged = false;
    const request = post(url).then((res) => { acknowledged = true; return res; });
    await started;
    // A turn of the event loop must not produce a response while DB work is pending.
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(acknowledged, false);
    release();
    assert.equal((await request).status, 204);
  });
});

test('duplicate/no-op is acknowledged with 204', async () => {
  await withServer({ handle: async () => 0 }, async (url) => {
    assert.equal((await post(url)).status, 204);
  });
});

test('DB failure is not acknowledged, can be retried, and is not exposed in logs', async () => {
  let attempts = 0;
  const logs: unknown[] = [];
  await withServer({
    handle: async () => { if (++attempts === 1) throw new Error('postgres://secret resetUrl'); return 1; },
    logger: (entry) => logs.push(entry),
  }, async (url) => {
    const first = await post(url);
    assert.equal(first.status, 503);
    assert.deepEqual(await first.json(), { error: 'PROCESSING_FAILED' });
    assert.equal((await post(url)).status, 204);
    assert.equal(attempts, 2);
    assert.ok(!JSON.stringify(logs).includes('secret'));
    assert.ok(JSON.stringify(logs).includes(eventId));
  });
});

test('EMAIL_REQUESTED, unknown and malformed messages never reach fanout or return 2xx', async () => {
  const logs: unknown[] = [];
  await withServer({ handle: async () => { assert.fail('must not call fanout'); }, logger: (e) => logs.push(e) }, async (url) => {
    for (const type of ['EMAIL_REQUESTED', 'UNKNOWN']) {
      const res = await post(url, wrapped({ ...envelope, type, data: { resetUrl: 'sensitive-link' } }));
      assert.equal(res.status, 422);
    }
    assert.equal((await post(url, { message: { data: 'bad' } })).status, 400);
    const invalid = await fetch(`${url}/pubsub/notifications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(invalid.status, 400);
    assert.ok(!JSON.stringify(logs).includes('sensitive-link'));
  });
});

test('oversized body returns 413 without invoking handler', async () => {
  await withServer({ handle: async () => { assert.fail('must not call fanout'); } }, async (url) => {
    assert.equal((await post(url, { padding: 'x'.repeat(1024 * 1024) })).status, 413);
  });
});

test('health reports database availability and recovers', async () => {
  let available = false;
  await withServer({ health: async () => { if (!available) throw new Error('DB down'); } }, async (url) => {
    assert.equal((await fetch(`${url}/health`)).status, 503);
    available = true;
    const response = await fetch(`${url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', database: 'up' });
  });
});

test('only the push route accepts messages and requires JSON', async () => {
  await withServer({}, async (url) => {
    assert.equal((await fetch(`${url}/pubsub/notifications`)).status, 404);
    assert.equal((await fetch(`${url}/notifications`)).status, 404);
    assert.equal((await fetch(`${url}/pubsub/notifications`, { method: 'POST', body: '{}' })).status, 415);
  });
});
