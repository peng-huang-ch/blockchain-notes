const bech32 = require('bech32');
const base58 = require('bs58');
const { sha256x2, sha256, ripemd160 } = require('./crypto');

exports.toBase32Address = function toBase32Address(pubkey, pubKeyHash = 0x00) {
  const hash256 = sha256(pubkey);
  const hash160 = ripemd160(hash256);

  const words = bech32.toWords(hash160);
  words.unshift(pubKeyHash);
  return bech32.encode('bc', words);
};

// https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch04.asciidoc
exports.toBase58Address = function toBase58Address(pubkey, pubKeyHash = 0x00) {
  const hash256 = sha256(pubkey);
  const hash160 = ripemd160(hash256);

  // version + payload
  const payload = Buffer.allocUnsafe(21);
  payload.writeUInt8(pubKeyHash, 0);
  hash160.copy(payload, 1);

  // checksum, first 4 buffer
  const checksum = sha256x2(payload).slice(0, 4);

  // Buffer.concat([payload, checksum], payload.length + 4);
  const buffer = Buffer.allocUnsafe(25);
  payload.copy(buffer);
  checksum.copy(buffer, 21);

  // version + payload + checksum(first 4 bytes)
  return base58.encode(buffer);
};
