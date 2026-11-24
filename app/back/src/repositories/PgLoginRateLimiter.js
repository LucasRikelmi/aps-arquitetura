const crypto = require('node:crypto');
class PgLoginRateLimiter {
  constructor(pool, {secret, maxAttempts=10, windowSeconds=60}={}) {
    if (!secret || Buffer.byteLength(secret)<32) throw Error('LOGIN_RATE_SECRET deve ter ao menos 32 bytes');
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) throw Error('Rate limit invalido');
    this.pool=pool;this.secret=secret;this.maxAttempts=maxAttempts;this.windowSeconds=windowSeconds;
  }
  key(source) {
    return crypto.createHmac('sha256',this.secret).update(String(source || 'unknown')).digest('hex');
  }
  async check(source) {
    const {rows}=await this.pool.query(`
      INSERT INTO login_rate_window(login_key,window_start,attempts)
      VALUES ($1,clock_timestamp(),1)
      ON CONFLICT(login_key) DO UPDATE SET
        attempts=CASE WHEN login_rate_window.window_start <= clock_timestamp()-($2::int*interval '1 second')
          THEN 1 ELSE login_rate_window.attempts+1 END,
        window_start=CASE WHEN login_rate_window.window_start <= clock_timestamp()-($2::int*interval '1 second')
          THEN clock_timestamp() ELSE login_rate_window.window_start END
      RETURNING attempts <= $3::int AS allowed
    `,[this.key(source),this.windowSeconds,this.maxAttempts]);
    return rows[0].allowed;
  }
  async retryAfter(source) {
    const {rows}=await this.pool.query(`
      SELECT GREATEST(1,CEIL(EXTRACT(EPOCH FROM (window_start + ($2::int*interval '1 second') - clock_timestamp()))))::int AS seconds
      FROM login_rate_window WHERE login_key=$1
    `,[this.key(source),this.windowSeconds]);
    return rows[0]?.seconds || this.windowSeconds;
  }
  async reset(source) { await this.pool.query('DELETE FROM login_rate_window WHERE login_key=$1',[this.key(source)]); }
}
module.exports={PgLoginRateLimiter};
