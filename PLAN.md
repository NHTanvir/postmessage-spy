# postMessage Spy — Plan

## Goal
Log every `window.postMessage` between windows, popups and iframes on in-scope targets, and flag the ones that matter for account takeover: messages carrying tokens / codes / emails, messages sent to any origin (`'*'`), and receivers that don't check `event.origin`.

**Roadmap fit:** Phase 4 auth chains — spine #9 (OAuth / SAML / SSO) and #14 (account-takeover chains). OAuth popup logins and embedded widgets that leak tokens over postMessage are a classic ATO pattern.

**Why Burp can't:** postMessage never touches the network. Burp sees no trace of it.

## Features
### v1 (MVP)
- Capture **outgoing** messages (`postMessage` calls): source frame URL, target origin argument, payload.
- Capture **incoming** messages: receiving frame URL, `event.origin`, payload.
- Find **listeners**: every `addEventListener('message', …)` / `onmessage` with a short excerpt of the handler source, and whether it mentions `origin` at all.
- **Flags:** target origin `'*'` · payload looks like a token (JWT, `access_token`, `code=`, `id_token`, session-like strings) · email / user id in payload · listener without an origin check.
- **Panel** (Chrome side panel): live list per tab, filters (flagged only, by origin), payload viewer (JSON pretty-print), copy as Markdown for notes/reports.
- **Scope:** only runs on hosts in the scope list (empty = off everywhere).

### Later
- Replay: send a captured message to the frame from the panel (in-scope only, explicit click).
- Per-target history saved across sessions, export JSON.
- Highlight the iframe/popup a message came from on the page.

## Design
| File | Role |
|---|---|
| `manifest.json` | MV3. Permissions: `storage`, `sidePanel`, `scripting`, `tabs`; host permissions added per scope host (optional host permissions). |
| `hook.js` | Content script in the **MAIN** world at `document_start`, `all_frames: true`: wraps `window.postMessage` and `EventTarget.prototype.addEventListener` (only for `'message'`) and the `onmessage` setter. Records events and listener excerpts. |
| `relay.js` | Content script in the **isolated** world: receives records from `hook.js` through a `CustomEvent` on `document` (with a random per-page channel name) and forwards them to the worker. |
| `background.js` | Service worker: keeps per-tab logs in `chrome.storage.session`, applies flags, registers the content scripts only for scope hosts (`chrome.scripting.registerContentScripts`). |
| `panel.html/.js` | Side panel UI. |
| `flags.js` | Token/email/id detectors shared by worker and panel. |

**Data:** `{ tabId, frameUrl, direction: 'out'|'in', origin, targetOrigin, data, time, flags[] }`, listeners `{ frameUrl, excerpt, checksOrigin }`. Logs capped per tab (e.g. 500), cleared on tab close.

## Safety and scope
- Passive by default: it only observes. Nothing is sent or modified unless you click Replay (later version) on an in-scope tab.
- Scope list required; no capture on any site outside it.
- Hooks must not change page behaviour: wrappers call through with the original arguments and `this`.

## Testing
- Local test pages (served from a scratch folder): a parent + iframe + popup exchanging messages, one listener with and one without an origin check, one message with a fake JWT.
- Headless Chrome over CDP with the **error watcher** on the worker and pages; expect 0 errors.
- Check: all messages captured in both directions, flags correct, nothing captured off-scope, page behaviour unchanged.

## Issues → commits
1. Scaffold: manifest, worker, scope setting
2. MAIN-world hook for postMessage and message listeners
3. Relay to the worker and per-tab storage
4. Flag detection (tokens, '*', emails/ids, missing origin check)
5. Side panel: live list, filters, payload viewer
6. Copy as Markdown for notes
7. Test pages + README/FEATURES/CLAUDE.md
