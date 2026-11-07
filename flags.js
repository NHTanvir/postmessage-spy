// Flag detectors shared by the worker and the panel. Pure functions so they
// can be unit-tested in Node.
const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/;
const TOKEN_KEY_RE = /\b(access_token|id_token|refresh_token|session|sessionid|auth|bearer|code)\b/i;
const CODE_PARAM_RE = /(?:^|[?&#])code=[A-Za-z0-9._-]{6,}/;
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
  if (TOKEN_KEY_RE.test(text) || CODE_PARAM_RE.test(text)) flags.push('token-like');
  if (EMAIL_RE.test(text)) flags.push('email');
  if (ID_KEY_RE.test(text)) flags.push('user-id');
  return flags;
}

export function flagListener(rec) {
  const flags = [];
  if (!rec.checksOrigin) flags.push('no-origin-check');
  return flags;
}
