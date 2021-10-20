const { eddsa: EdDSA } = require('elliptic');
const { hexToU8a } = require('@polkadot/util');
const { stripHexPrefix } = require('ethjs-util');
const ec = new EdDSA('curve25519');

var secret = process.env.EDDSA_SECRET;
var priKey = ec.keyFromSecret(hexToU8a(secret));
var pubKey = priKey.getPublic('hex');
console.log('pubKey: ', pubKey);

var key = ec.keyFromSecret(hexToU8a(secret)); // hex string, array or Buffer
// Sign the message's hash (input must be an array, or a hex-string)

var message = '0x43753242f0fb12a614a9bc34b2112b399749bef5c53a3b34ebb598004d8e2436';
var signature = '0x7e1613e142442c0cacbfc93c4163d7d9b15fa050fcd84b72b4440b2bf127a7f050573f73a6efa0dd682a8d9bd3993899e006b6f1e6a4cd241e7e2bc748269303';
const isValid = key.verify(hexToU8a(message), stripHexPrefix(signature));

console.log('isValid : ', isValid);
const recover = ec.recoverPubKey(message, signature);
console.log(recover);
