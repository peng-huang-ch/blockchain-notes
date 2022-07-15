const assert = require('assert')
const { splitSignature } = require('@ethersproject/bytes');
const { stripHexPrefix } = require('ethjs-util');

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

var message = "90524948f011bb658a71d7bafab4f2efecf58af0ec0c70dc9ad12e76dec72732"
var message = Buffer.from(message, 'hex');

var compressed = "02e43535123bcd042165a752065fd8e9afcbb9e88290ee065623ebc68003929405";
var pubKey = Buffer.from(compressed, 'hex');
var pk = ec.keyFromPublic(pubKey);

var signature = '42e5e32472e344f4591bd4cbd679e678a7dad600b2c6a718336c1bca4097709d0d5e4eb1a824e5cd42e7d203726ee667c4206189af44454a5084dea854ad0b1c00'
var signature = splitSignature(Buffer.from(signature, 'hex'));

var signature = {
  r: stripHexPrefix(signature.r),
  s: stripHexPrefix(signature.s),
  recoveryParam: signature.recoveryParam
}

// verify signature
const verify = pk.verify(message, signature);
assert.equal(verify, true, 'signature is not valid');

// recover pub key
var rkp = ec.recoverPubKey(message, signature, signature.recoveryParam);
var rkp = ec.keyFromPublic(rkp);
var rkpHex = rkp.getPublic(true, 'hex')

assert.equal(rkpHex, compressed, 'pub key is not valid');