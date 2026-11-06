// MAIN world, document_start, all frames.
// Wraps postMessage + message listeners WITHOUT changing page behaviour:
// every wrapper calls through to the original with the same args/this.
// Records are handed to the isolated-world relay via a CustomEvent on a
// random per-page channel name (so pages cannot easily forge our channel).
(() => {
  const CHANNEL = '__pms_' + Math.random().toString(36).slice(2);
  // publish the channel name for relay.js (same page, isolated world reads DOM)
  const marker = document.documentElement.getAttribute('data-pms-ch');
  if (!marker) document.documentElement.setAttribute('data-pms-ch', CHANNEL);
  const ch = document.documentElement.getAttribute('data-pms-ch');

  function emit(record) {
    try {
      document.dispatchEvent(new CustomEvent(ch, { detail: record }));
    } catch {}
  }

  function frameUrl() {
    try { return location.href; } catch { return ''; }
  }

  function safeClone(data) {
    // Avoid holding references / huge structures; stringify with a cap.
    try {
      const s = JSON.stringify(data, replacer());
      if (s && s.length > 20000) return { __truncated: true, preview: s.slice(0, 20000) };
      return JSON.parse(s);
    } catch {
      try { return String(data).slice(0, 2000); } catch { return '[unserialisable]'; }
    }
  }
  function replacer() {
    const seen = new WeakSet();
    return (k, v) => {
      if (typeof v === 'function') return '[function]';
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[circular]';
        seen.add(v);
      }
      return v;
    };
  }

  // --- wrap outgoing postMessage ---
  const origPM = window.postMessage;
  try {
    window.postMessage = function (...args) {
      try {
        emit({ kind: 'event', direction: 'out', frameUrl: frameUrl(),
               targetOrigin: args[1] ?? null, data: safeClone(args[0]), time: Date.now() });
      } catch {}
      return origPM.apply(this, args);
    };
  } catch {}

  // --- wrap incoming listeners ---
  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, opts) {
    if (type === 'message' && typeof listener === 'function') {
      let excerpt = '';
      try { excerpt = Function.prototype.toString.call(listener).slice(0, 400); } catch {}
      const checksOrigin = /origin/i.test(excerpt);
      emit({ kind: 'listener', frameUrl: frameUrl(), excerpt, checksOrigin, time: Date.now() });
      const wrapped = function (ev) {
        try {
          emit({ kind: 'event', direction: 'in', frameUrl: frameUrl(),
                 origin: ev.origin, data: safeClone(ev.data), time: Date.now() });
        } catch {}
        return listener.apply(this, arguments);
      };
      return origAdd.call(this, type, wrapped, opts);
    }
    return origAdd.call(this, type, listener, opts);
  };

  // --- wrap window.onmessage setter ---
  try {
    const proto = Object.getPrototypeOf(window);
    const desc = Object.getOwnPropertyDescriptor(proto, 'onmessage') ||
                 Object.getOwnPropertyDescriptor(window, 'onmessage');
    if (desc && desc.set) {
      Object.defineProperty(window, 'onmessage', {
        configurable: true,
        get() { return desc.get ? desc.get.call(this) : undefined; },
        set(fn) {
          if (typeof fn === 'function') {
            let excerpt = '';
            try { excerpt = Function.prototype.toString.call(fn).slice(0, 400); } catch {}
            emit({ kind: 'listener', frameUrl: frameUrl(), excerpt,
                   checksOrigin: /origin/i.test(excerpt), time: Date.now() });
            const wrapped = function (ev) {
              try {
                emit({ kind: 'event', direction: 'in', frameUrl: frameUrl(),
                       origin: ev.origin, data: safeClone(ev.data), time: Date.now() });
              } catch {}
              return fn.apply(this, arguments);
            };
            return desc.set.call(this, wrapped);
          }
          return desc.set.call(this, fn);
        },
      });
    }
  } catch {}
})();
