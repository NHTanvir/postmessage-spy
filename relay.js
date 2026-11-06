// ISOLATED world, document_start. Reads the channel name the MAIN-world hook
// published on <html data-pms-ch>, listens for its CustomEvents and forwards
// each record to the service worker. Isolated from page script globals.
(() => {
  function channel() {
    return document.documentElement.getAttribute('data-pms-ch');
  }
  function attach() {
    const ch = channel();
    if (!ch) { requestAnimationFrame(attach); return; }
    document.addEventListener(ch, (e) => {
      const rec = e.detail;
      if (!rec) return;
      try { chrome.runtime.sendMessage({ type: 'pms-record', record: rec }); } catch {}
    });
  }
  attach();
})();
