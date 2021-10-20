require('dotenv').config();
const { eddsa: EdDSA } = require('elliptic');
const { u8aToHex, hexToU8a } = require('@polkadot/util');
const { addHexPrefix } = require('ethereumjs-util');
const ec = new EdDSA('ed25519');

var secret = addHexPrefix(process.env.CARDANO_PRIVATE_KEY);
var key = ec.keyFromSecret(secret);

var pubKey = key.getPublic();
console.log('pubKey : ', pubKey);

// Sign the message's hash (input must be an array, or a hex-string)
var message = addHexPrefix('43753242f0fb12a614a9bc34b2112b399749bef5c53a3b34ebb598004d8e2436');
var signature = key.sign(message).toHex();

const isValid = key.verify(message, signature);
console.log(isValid);
