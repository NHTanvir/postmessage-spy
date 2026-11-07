# Features

## Capture
- Outgoing `postMessage` calls: source frame URL, target origin argument, payload.
- Incoming messages: receiving frame URL, `event.origin`, payload.
- Listeners: `addEventListener('message', …)` and `onmessage`, with a source
  excerpt and whether the handler references `origin`.

## Flags
- `wildcard-target` — outgoing message sent to `'*'` (or no target origin).
- `jwt` / `token-like` — JWT, `access_token`/`id_token`/`code=`/session-like strings.
- `email`, `user-id` — email address or user/tenant/org id in the payload.
- `no-origin-check` / `weak-origin-check` — a listener that never checks
  `event.origin`, or checks it with a bypassable method (indexOf/startsWith/
  includes/search/match) or a loose regex (classified by `classifyOriginCheck`).
- `oauth-code` — an OAuth `code`/`state`/`id_token`/`access_token` param in the payload.

## Risk level
Each message is scored `high` / `medium` / `low` via the triple-positive rule
(secret payload × wildcard send × any weak/absent origin-check listener on the
page). The panel shows a risk chip and a risk-threshold filter.

## Panel
- Live per-tab list, newest first; filters (flagged only, by direction).
- Pretty-printed payload viewer; flag chips; clear button.
- **Copy MD** exports flagged messages, risky listeners and totals as Markdown.

## Safety
- Passive: wrappers call through unchanged; nothing is sent or modified.
- Scope-gated: content scripts register only for user-listed hosts.
- Logs live in `chrome.storage.session`, capped per tab, cleared on tab close.
