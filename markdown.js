// Pure formatter: turns a captured log into Markdown for notes/reports.
function fence(d) {
  let s; try { s = JSON.stringify(d, null, 2); } catch { s = String(d); }
  return '```json\n' + s + '\n```';
}

export function toMarkdown(data, meta = {}) {
  const lines = [];
  lines.push(`# postMessage capture${meta.host ? ' — ' + meta.host : ''}`);
  if (meta.when) lines.push(`_${meta.when}_`);
  lines.push('');

  const flagged = data.events.filter((e) => e.flags && e.flags.length);
  if (flagged.length) {
    lines.push('## Flagged messages', '');
    for (const e of flagged) {
      const where = e.direction === 'out' ? `→ \`${e.targetOrigin}\`` : `from \`${e.origin}\``;
      lines.push(`- **${e.direction.toUpperCase()}** ${where} — flags: ${e.flags.map((f) => '`' + f + '`').join(', ')}`);
      lines.push('', fence(e.data), '');
    }
  }

  const risky = data.listeners.filter((l) => l.flags && l.flags.length);
  if (risky.length) {
    lines.push('## Listeners without an origin check', '');
    for (const l of risky) {
      lines.push(`- \`${l.frameUrl}\``, '', '```js\n' + (l.excerpt || '') + '\n```', '');
    }
  }

  lines.push('## All messages', '');
  lines.push(`Total events: ${data.events.length} · listeners: ${data.listeners.length}`);
  return lines.join('\n');
}
