const argon2 = require('argon2');
const OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // KiB = 19 MiB
  timeCost: 2,
  parallelism: 1,
});
class PasswordHasher {
  hash(password) { return argon2.hash(password, OPTIONS); }
  verify(encodedHash, password) { return argon2.verify(encodedHash, password); }
}
module.exports = { PasswordHasher, OPTIONS };
