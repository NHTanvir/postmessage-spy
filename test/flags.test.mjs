import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagEvent, flagListener } from '../flags.js';

test('wildcard target origin flagged on outgoing', () => {
  assert.deepEqual(flagEvent({ direction: 'out', targetOrigin: '*', data: {} }), ['wildcard-target']);
});

test('jwt in payload flagged', () => {
  const jwt = 'eyJhbGciOi.eyJzdWIiOi.sigPART123';
  const f = flagEvent({ direction: 'in', data: { token: jwt } });
  assert.ok(f.includes('jwt'));
});

test('token-like key and code param flagged', () => {
  assert.ok(flagEvent({ direction: 'in', data: { access_token: 'x' } }).includes('token-like'));
  assert.ok(flagEvent({ direction: 'in', data: 'redirect?code=abc12345' }).includes('token-like'));
});

test('email and id flagged', () => {
  const f = flagEvent({ direction: 'in', data: { email: 'a@b.com', userId: 7 } });
  assert.ok(f.includes('email'));
  assert.ok(f.includes('user-id'));
});

test('clean message gets no flags', () => {
  assert.deepEqual(flagEvent({ direction: 'in', data: { ping: 1 } }), []);
});

test('listener without origin check flagged', () => {
  assert.deepEqual(flagListener({ checksOrigin: false }), ['no-origin-check']);
  assert.deepEqual(flagListener({ checksOrigin: true }), []);
});
