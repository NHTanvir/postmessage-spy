import { getScope, hostInScope } from './scope.js';
import { flagEvent, flagListener } from './flags.js';

const CAP = 500; // records kept per tab

async function syncRegistrations() {
  const hosts = await getScope();
  const existing = await chrome.scripting.getRegisteredContentScripts().catch(() => []);
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ ids: existing.map((s) => s.id) }).catch(() => {});
  }
  if (!hosts.length) return;
  const matches = hosts.map((h) => `*://${h}/*`).concat(hosts.map((h) => `*://*.${h}/*`));
  await chrome.scripting.registerContentScripts([
    { id: 'pms-hook', js: ['hook.js'], matches, runAt: 'document_start', allFrames: true, world: 'MAIN' },
    { id: 'pms-relay', js: ['relay.js'], matches, runAt: 'document_start', allFrames: true, world: 'ISOLATED' },
  ]).catch((e) => console.warn('[pms] register failed', e));
}

chrome.runtime.onInstalled.addListener(syncRegistrations);
chrome.runtime.onStartup.addListener(syncRegistrations);
chrome.storage.onChanged.addListener((c, area) => {
  if (area === 'local' && c.scopeHosts) syncRegistrations();
});
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId != null) chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});

function tabKey(tabId) { return `log_${tabId}`; }

async function append(tabId, record) {
  const key = tabKey(tabId);
  const { [key]: log = { events: [], listeners: [] } } = await chrome.storage.session.get(key);
  if (record.kind === 'listener') {
    record.flags = flagListener(record);
    log.listeners.push(record);
    if (log.listeners.length > CAP) log.listeners.shift();
  } else {
    record.flags = flagEvent(record);
    log.events.push(record);
    if (log.events.length > CAP) log.events.shift();
  }
  await chrome.storage.session.set({ [key]: log });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'pms-record' && sender.tab) {
    append(sender.tab.id, msg.record);
    return false;
  }
  if (msg && msg.type === 'pms-get') {
    const key = tabKey(msg.tabId);
    chrome.storage.session.get(key).then((o) => sendResponse(o[key] || { events: [], listeners: [] }));
    return true;
  }
  if (msg && msg.type === 'pms-clear') {
    chrome.storage.session.remove(tabKey(msg.tabId)).then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(tabKey(tabId)));
