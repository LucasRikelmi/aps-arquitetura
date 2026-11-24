const crypto = require('node:crypto');
const COOKIE_NAME = '__Host-benigno_session';
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function parseCookie(header, key) {
  if (typeof header !== 'string') return null;
  for (const entry of header.split(';')) {
    const index = entry.indexOf('=');
    if (index < 0) continue;
    if (entry.slice(0,index).trim() === key) return entry.slice(index+1).trim();
  }
  return null;
}
class SessionService {
  constructor(repo, { inactivityMs = 30 * 60_000, absoluteMs = 8 * 60 * 60_000 } = {}) {
    this.repo = repo; this.inactivityMs = inactivityMs; this.absoluteMs = absoluteMs;
  }
  async create(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const created = await this.repo.create(userId, hashToken(token), this.absoluteMs);
    if (!created) return null;
    return token;
  }
  async validate(token) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return this.repo.findAndTouch(hashToken(token), this.inactivityMs);
  }
  async revoke(token) {
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await this.repo.revoke(hashToken(token));
  }
}
function cookieOptions(secure=true) { return { httpOnly: true, secure, sameSite: 'lax', path: '/' }; }
module.exports = { SessionService, COOKIE_NAME, parseCookie, cookieOptions, hashToken };
