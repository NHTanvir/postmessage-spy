let tabId = null;
let data = { events: [], listeners: [] };

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const flaggedOnly = document.getElementById('flaggedOnly');
const dirSel = document.getElementById('dir');

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? tab.id : null;
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function pretty(d) { try { return JSON.stringify(d, null, 2); } catch { return String(d); } }

function render() {
  const onlyFlagged = flaggedOnly.checked;
  const dir = dirSel.value;
  const rows = [];
  for (const ev of data.events) {
    if (dir && ev.direction !== dir) continue;
    if (onlyFlagged && !(ev.flags && ev.flags.length)) continue;
    rows.push({ t: ev.time, html: eventRow(ev) });
  }
  for (const ln of data.listeners) {
    if (dir) continue;
    if (onlyFlagged && !(ln.flags && ln.flags.length)) continue;
    rows.push({ t: ln.time, html: listenerRow(ln) });
  }
  rows.sort((a, b) => b.t - a.t);
  listEl.innerHTML = rows.map((r) => r.html).join('');
  emptyEl.style.display = rows.length ? 'none' : 'block';
}

function flagsHtml(flags) {
  return `<span class="flags">${(flags || []).map((f) => `<span class="flag">${esc(f)}</span>`).join('')}</span>`;
}

function eventRow(ev) {
  const origin = ev.direction === 'out' ? `→ ${esc(ev.targetOrigin)}` : `from ${esc(ev.origin)}`;
  return `<div class="row">
    <div class="meta"><span class="dir ${ev.direction}">${ev.direction.toUpperCase()}</span>
    <span>${origin}</span><span>${esc(new URL(ev.frameUrl || 'about:blank').host || ev.frameUrl)}</span>
    ${flagsHtml(ev.flags)}</div>
    <pre>${esc(pretty(ev.data))}</pre></div>`;
}

function listenerRow(ln) {
  return `<div class="row listener">
    <div class="meta"><span class="dir">LISTENER</span>
    <span>${esc(new URL(ln.frameUrl || 'about:blank').host || ln.frameUrl)}</span>${flagsHtml(ln.flags)}</div>
    <pre>${esc(ln.excerpt || '')}</pre></div>`;
}

async function refresh() {
  if (tabId == null) return;
  data = await chrome.runtime.sendMessage({ type: 'pms-get', tabId });
  render();
}

flaggedOnly.addEventListener('change', render);
dirSel.addEventListener('change', render);
document.getElementById('clear').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'pms-clear', tabId });
  refresh();
});
document.getElementById('copy').addEventListener('click', () => {
  // real Markdown export lands in step 6
  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).catch(() => {});
});

chrome.tabs.onActivated.addListener(async () => { tabId = await currentTab(); refresh(); });

(async () => { tabId = await currentTab(); refresh(); setInterval(refresh, 1500); })();
