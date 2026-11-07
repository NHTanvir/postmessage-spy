# postMessage Spy

A Chrome (MV3) extension that logs `window.postMessage` traffic on **in-scope**
targets and flags the patterns that matter for account-takeover review:
tokens/codes/emails in payloads, messages sent to `'*'`, and receivers that
never check `event.origin`.

> **Authorized testing only.** Add a host to the scope list and the extension
> observes it; with an empty scope it does nothing anywhere. Use it only on
> targets you are permitted to test (e.g. a bug-bounty program in scope).

## Why not Burp
`postMessage` never touches the network, so a proxy sees no trace of it. This
runs in the page and records the calls directly.

## Install (unpacked)
1. `chrome://extensions` → enable Developer mode → **Load unpacked** → this folder.
2. Open the extension **Options**, add the host(s) you are authorized to test.
3. Reload the target tab, click the toolbar icon to open the side panel.

## Try it
Serve the test pages and add their host to scope:
```
cd testpages && python3 -m http.server 8000
```
Open `http://localhost:8000/parent.html` (scope: `localhost`), click the
buttons, and watch the panel flag the fake JWT, the `code=` param, the email,
the wildcard target and the unchecked listener.

## Tests
```
npm test        # pure detector + markdown formatter unit tests
```

See [FEATURES.md](FEATURES.md) for the full behaviour list and [PLAN.md](PLAN.md)
for the design.
