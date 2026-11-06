import { getScope, hostInScope } from './scope.js';

// Content scripts are registered ONLY for hosts the user put in scope.
// hook.js runs in the MAIN world at document_start in all frames;
// relay.js runs in the ISOLATED world and forwards records to this worker.
async function syncRegistrations() {
  const hosts = await getScope();
  const existing = await chrome.scripting.getRegisteredContentScripts().catch(() => []);
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: existing.map((s) => s.id) }).catch(() => {});
  }
  if (!hosts.length) return;
  const matches = hosts.map((h) => `*://${h}/*`).concat(hosts.map((h) => `*://*.${h}/*`));
  await chrome.scripting.registerContentScripts([
    {
      id: 'pms-hook',
      js: ['hook.js'],
      matches,
      runAt: 'document_start',
      allFrames: true,
      world: 'MAIN',
    },
    {
      id: 'pms-relay',
      js: ['relay.js'],
      matches,
      runAt: 'document_start',
      allFrames: true,
      world: 'ISOLATED',
    },
  ]).catch((e) => console.warn('[pms] register failed', e));
}

chrome.runtime.onInstalled.addListener(syncRegistrations);
chrome.runtime.onStartup.addListener(syncRegistrations);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.scopeHosts) syncRegistrations();
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId != null) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});

// Records arrive in step 3; scaffold just acknowledges.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'pms-ping') {
    getScope().then((hosts) => {
      let host = '';
      try { host = new URL(sender.tab?.url || sender.url || '').hostname; } catch {}
      sendResponse({ ok: true, inScope: hostInScope(host, hosts) });
    });
    return true;
  }
});
