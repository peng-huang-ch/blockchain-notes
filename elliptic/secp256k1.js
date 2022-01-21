require('dotenv').config();
var { u8aToHex, hexToU8a, u8aConcat } = require('@polkadot/util');
const { ecsign, toBuffer, bufferToHex, stripHexPrefix } = require('ethereumjs-util');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const ecc = require('tiny-secp256k1');

function canonical({ r, s, recoveryParam }) {
  if (s.cmp(ec.nh) > 0) {
    s = ec.n.sub(s);
    recoveryParam ^= 1;
  }
  return { r, s, recoveryParam };
}

function display(signature) {
  const r = toBuffer(signature.r);
  const s = toBuffer(signature.s);
  const v = toBuffer(signature.recoveryParam);
  console.log('r        : ', stripHexPrefix(bufferToHex(r))); //
  console.log('s        : ', stripHexPrefix(bufferToHex(s)));
  console.log('v        : ', v.toString());
  console.log('r + s    : ', Buffer.concat([r, s]).toString('hex'));
  console.log('r + s + v: ', Buffer.concat([r, s, v]).toString('hex'));
}

var secret = process.env.ECDSA_SECRET;
var msg = '0f555ff76600d72613417599a74db3a6e159000f96c770ed37d99e9deb429ae1';
var privKey = Buffer.from(secret, 'hex');
var signature = ec.sign(msg, privKey);

const pair = ec.keyFromPrivate(privKey);
console.log('pub hex : ', pair.getPublic(true, 'hex'));
display(signature);

var expected = ecc.sign(Buffer.from(msg, 'hex'), privKey);
console.log('ecc : ', u8aToHex(expected));
return;
var canonicalSignature = canonical(signature);
console.log('---------------');
console.log('-- canonical --');
console.log('---------------');
display(canonicalSignature);
console.log('---------------');
console.log('------end------');
console.log('---------------');

const msgHash = Buffer.from(msg, 'hex');
var signature = ecsign(msgHash, privKey);
display(signature);
