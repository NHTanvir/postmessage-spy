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
- `no-origin-check` — a message listener that never looks at `event.origin`.

## Panel
- Live per-tab list, newest first; filters (flagged only, by direction).
- Pretty-printed payload viewer; flag chips; clear button.
- **Copy MD** exports flagged messages, risky listeners and totals as Markdown.

## Safety
- Passive: wrappers call through unchanged; nothing is sent or modified.
- Scope-gated: content scripts register only for user-listed hosts.
- Logs live in `chrome.storage.session`, capped per tab, cleared on tab close.
