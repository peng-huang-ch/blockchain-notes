const typeforce = require('typeforce');
const { compile, decompile, isCanonicalPubKey } = require('./script');
const OPS = require('bitcoin-ops');

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
