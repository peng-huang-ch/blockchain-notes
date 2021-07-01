const createHash = require('create-hash');

exports.ripemd160 = function ripemd160(buffer) {
  try {
    return createHash('ripemd160').update(buffer).digest();
  } catch (err) {
    return createHash('rmd160').update(buffer).digest();
  }
};

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest();
}
exports.sha256 = sha256;

exports.sha256x2 = function sha256x2(buffer) {
  return sha256(sha256(buffer));
};
