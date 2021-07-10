const typeforce = require('typeforce');
const { compile, decompile, isCanonicalPubKey } = require('./script');
const OPS = require('bitcoin-ops');
const OP_INT_BASE = OPS.OP_RESERVED; // OP_1 - 1

const types = {
  P2MS: 'multisig',
  NONSTANDARD: 'nonstandard',
  NULLDATA: 'nulldata',
  P2PK: 'pubkey',
  P2PKH: 'pubkeyhash',
  P2SH: 'scripthash',
  P2WPKH: 'witnesspubkeyhash',
  P2WSH: 'witnessscripthash',
  WITNESS_COMMITMENT: 'witnesscommitment',
};
exports.types = types;

// https://wiki.bitcoinsv.io/index.php/P2SH
// https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki
function p2sh(script) {
  typeforce(typeforce.Buffer, script);
  const buffer = compile(script);
  return (
    buffer.length === 23 && //
    buffer[0] === OPS.OP_HASH160 && // hash160
    buffer[1] === 0x14 && // length is 22
    buffer[22] === OPS.OP_EQUAL // equal
  );
}
exports.p2sh = p2sh;

// https://en.bitcoinwiki.org/wiki/Pay-to-Pubkey
function p2pk(script) {
  // typeforce(typeforce.Buffer, script);
  const chunks = decompile(script);
  return (
    chunks.length === 2 && //
    isCanonicalPubKey(chunks[0]) && //
    chunks[1] === OPS.OP_CHECKSIG
  );
}
exports.p2pk = p2pk;

// https://en.bitcoinwiki.org/wiki/Pay-to-Pubkey_Hash
function p2pkh(script) {
  typeforce(typeforce.Buffer, script);
  const buffer = compile(script);
  return (
    buffer.length === 25 && //
    buffer[0] === OPS.OP_DUP && // hash160
    buffer[1] === OPS.OP_HASH160 &&
    buffer[2] === 0x14 && // <Public KeyHash>
    buffer[23] === OPS.OP_EQUALVERIFY &&
    buffer[24] === OPS.OP_CHECKSIG // equal
  );
}
exports.p2pkh = p2pkh;

// https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#P2WSH
function p2wsh(script) {
  typeforce(typeforce.Buffer, script);
  const buffer = compile(script);

  return (
    buffer.length === 34 && //
    buffer[0] === OPS.OP_0 && // OP_0
    buffer[1] === 0x20
  );
}
exports.p2wsh = p2wsh;

// https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#P2WPKH
function p2wpkh(script) {
  typeforce(typeforce.Buffer, script);
  const buffer = compile(script);

  return (
    buffer.length === 22 && //
    buffer[0] === OPS.OP_0 && // OP_0
    buffer[1] === 0x14
  );
}
exports.p2wpkh = p2wpkh;

// https://en.bitcoin.it/wiki/BIP_0011
// m {pubkey}...{pubkey} n OP_CHECKMULTISIG
function multisig(script) {
  const chunks = decompile(script);
  const length = chunks.length;
  if (length < 4) return false;
  if (chunks[length - 1] !== OPS.OP_CHECKMULTISIG) return false;
  if (!typeforce.Number(chunks[0])) return false;
  if (!typeforce.Number(chunks[length - 2])) return false;

  const m = chunks[0] - OP_INT_BASE;
  const n = chunks[length - 2] - OP_INT_BASE;

  if (m <= 0) return false;
  if (n > 16) return false;
  if (m > n) return false;
  // m {pubkey}...{pubkey} n OP_CHECKMULTISIG - (m + n + OP_CHECKMULTISIG)
  if (n !== length - 3) return false;

  // pub keys
  const keys = chunks.slice(1, -2);
  return keys.every(isCanonicalPubKey);
}
exports.multisig = multisig;

// https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki#Commitment_structure
function witness_commitment(script) {
  typeforce(typeforce.Buffer, script);
  const buffer = compile(script);
  return (
    buffer.length === 25 && //
    buffer[0] === OPS.OP_RETURN &&
    buffer[1] === 0x24 && //  Push the following 36 bytes (0x24)
    buffer.slice(2, 6).equals(Buffer.from('0x6a24aa21a9ed', 'hex'))
  );
}
exports.witness_commitment = witness_commitment;
