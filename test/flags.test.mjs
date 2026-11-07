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
  assert.ok(flagEvent({ direction: 'in', data: 'redirect?code=abc12345' }).includes('oauth-code'));
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
  assert.deepEqual(flagListener({ excerpt: 'e => handle(e.data)' }), ['no-origin-check']);
  assert.deepEqual(flagListener({ excerpt: "if(e.origin === 'https://x'){}" }), []);
});

import { toMarkdown } from '../markdown.js';
import { test as t2 } from 'node:test';
import assert2 from 'node:assert/strict';

t2('markdown highlights flagged messages and risky listeners', () => {
  const md = toMarkdown({
    events: [{ direction: 'out', targetOrigin: '*', data: { access_token: 'x' }, flags: ['wildcard-target', 'token-like'] }],
    listeners: [{ frameUrl: 'https://x/', excerpt: 'e=>e.data', flags: ['no-origin-check'] }],
  }, { host: 'x.com' });
  assert2.ok(md.includes('Flagged messages'));
  assert2.ok(md.includes('wildcard-target'));
  assert2.ok(md.includes('without an origin check'));
});

import { classifyOriginCheck, riskLevel } from '../flags.js';
import { test as t3 } from 'node:test';
import assert3 from 'node:assert/strict';

t3('classifyOriginCheck distinguishes none/weak/exact', () => {
  assert3.equal(classifyOriginCheck('e => handle(e.data)'), 'none');
  assert3.equal(classifyOriginCheck("if(e.origin.indexOf('x')>-1){}"), 'weak-method');
  assert3.equal(classifyOriginCheck('if(/^https:\\/\\/x$/.test(e.origin)){}'), 'weak-regex');
  assert3.equal(classifyOriginCheck("if(e.origin === 'https://x'){}"), 'exact');
});

t3('oauth code param is flagged', () => {
  assert3.ok(flagEvent({ direction: 'in', data: 'cb?code=abcdef123&state=x' }).includes('oauth-code'));
});

t3('riskLevel is high for secret + wildcard or weak listener', () => {
  assert3.equal(riskLevel(['wildcard-target', 'jwt'], false), 'high');
  assert3.equal(riskLevel(['token-like'], true), 'high');
  assert3.equal(riskLevel(['wildcard-target', 'email'], false), 'low');
  assert3.equal(riskLevel([], false), 'none');
});
