// Flag detectors shared by the worker and the panel. Pure functions so they
// can be unit-tested in Node. Signatures and scoring follow the research notes
// (postMessage ATO: triple-positive = weak/no origin check x token/code/email
// payload x wildcard send).
const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{5,}\b/;
const TOKEN_KEY_RE = /\b(access_token|id_token|refresh_token|authorization|bearer|session|sessionid|auth)\b/i;
const OAUTH_PARAM_RE = /[?&#](code|state|session_state|nonce|id_token|access_token)=[A-Za-z0-9._~-]{6,}/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const ID_KEY_RE = /\b(user_?id|uid|tenant_?id|org_?id|account_?id)\b/i;

function asText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  try { return JSON.stringify(data); } catch { return String(data); }
}

export function flagEvent(rec) {
  const flags = [];
  const text = asText(rec.data);
  if (rec.direction === 'out' && (rec.targetOrigin === '*' || rec.targetOrigin === null)) {
    flags.push('wildcard-target');
  }
  if (JWT_RE.test(text)) flags.push('jwt');
  if (TOKEN_KEY_RE.test(text)) flags.push('token-like');
  if (OAUTH_PARAM_RE.test(text)) flags.push('oauth-code');
  if (EMAIL_RE.test(text)) flags.push('email');
  if (ID_KEY_RE.test(text)) flags.push('user-id');
  return flags;
}

// Classify a listener's origin check from its stringified source.
// none -> no origin reference; weak-method -> substring/looseness
// (indexOf/startsWith/endsWith/includes/search/match); weak-regex -> RegExp
// use (bypassable unless exact); exact -> strict === comparison.
export function classifyOriginCheck(excerpt) {
  const s = excerpt || '';
  if (!/origin/i.test(s)) return 'none';
  if (/\.(indexOf|startsWith|endsWith|includes|search|match)\s*\(/.test(s)) return 'weak-method';
  if (/new\s+RegExp|\.test\s*\(|\/\^?[^/\n]*\$?\/[a-z]*\.test/.test(s)) return 'weak-regex';
  if (/origin\s*===|===\s*[A-Za-z0-9_.$]*origin|origin\s*==(?!=)/.test(s)) return 'exact';
  return 'weak-method';
}

export function flagListener(rec) {
  const cls = classifyOriginCheck(rec.excerpt);
  const flags = [];
  if (cls === 'none') flags.push('no-origin-check');
  else if (cls === 'weak-method' || cls === 'weak-regex') flags.push('weak-origin-check');
  rec.originCheck = cls;
  return flags;
}

// Triple-positive risk: combine this event's own flags with whether ANY
// listener on the page has a weak/absent origin check.
export function riskLevel(eventFlags, anyWeakListener) {
  const hasSecret = eventFlags.some((f) => ['jwt', 'token-like', 'oauth-code'].includes(f));
  const hasPII = eventFlags.includes('email') || eventFlags.includes('user-id');
  const wildcard = eventFlags.includes('wildcard-target');
  if (hasSecret && (wildcard || anyWeakListener)) return 'high';
  if (hasSecret || (wildcard && anyWeakListener)) return 'medium';
  if (wildcard || hasPII) return 'low';
  return 'none';
}
