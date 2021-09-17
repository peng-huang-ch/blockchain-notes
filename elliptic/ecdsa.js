require('dotenv').config();
const { ecsign, toBuffer, bufferToHex, stripHexPrefix } = require('ethereumjs-util');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

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
var msg = '0d8ceb29a3a6e540ca91af5db2f033831d9c5564dabe43ac41eb2574c65cdb40';
var privKey = Buffer.from(secret, 'hex');
var signature = ec.sign(msg, privKey);

display(signature);

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
