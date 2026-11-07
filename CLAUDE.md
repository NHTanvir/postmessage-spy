# CLAUDE.md — postMessage Spy

## What this is
MV3 Chrome extension that passively logs `postMessage` traffic on in-scope
hosts and flags ATO-relevant patterns. Authorized security testing only.

## Layout
- `manifest.json` — MV3; permissions storage/sidePanel/scripting/tabs.
- `scope.js` — scope list helpers (shared).
- `background.js` — registers content scripts for scope hosts only; stores
  per-tab logs in `chrome.storage.session`; applies flags.
- `hook.js` — MAIN world, document_start, all frames. Transparent wrappers
  around postMessage / addEventListener('message') / onmessage. Must never
  change page behaviour — always call through with the same args/this.
- `relay.js` — ISOLATED world; forwards hook records to the worker over a
  random per-page CustomEvent channel.
- `flags.js`, `markdown.js` — pure, Node-tested logic. Keep them pure.
- `panel.html` / `panel.js` — side panel (ES module).
- `options.html` / `options.js` — scope editor.
- `testpages/` — local parent+iframe+popup exercising every flag.

## Rules
- Keep `hook.js` side-effect-free for the page (observation only).
- Never capture off-scope; the worker gates registration on the scope list.
- Pure logic stays in `flags.js` / `markdown.js` with tests in `test/`.

## Test
`npm test` runs the Node unit tests. For manual checks, serve `testpages/`
and add `localhost` to scope.
