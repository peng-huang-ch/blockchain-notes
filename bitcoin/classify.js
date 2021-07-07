const typeforce = require('typeforce');
const { compile } = require('./script');
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
