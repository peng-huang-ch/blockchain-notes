require('dotenv').config();
const { eddsa: EdDSA } = require('elliptic');
const ec = new EdDSA('ed25519');

var secret = process.env.ED25519_SECRET;

// Import public key
var msgHash = '68656c6c6f20776f726c64';
var pub = '08c9b5046e20d065825b0f284b659e7ea611cee97986bc740fbea0cf905316e3';
var key = ec.keyFromSecret(pub, 'hex');

// Verify signature
var signature = '4426f382b26a81fe43ebc1ab843e0d98d734e77f8342944876b2e701a80ef891671a3b1fec4fa1090b904a29299f2a2f8dc0e2d5af3ee9ae448908820af25105';
console.log(key.verify(msgHash, signature));

var buf = Buffer.from(secret, 'hex');
var key = ec.keyFromSecret(buf);
var pub = key.getPublic('hex');
console.log('pub key : ', pub);

const sig = key.sign(Buffer.from(msgHash, 'hex'));
console.log('sigHex', sig.toHex().toLowerCase());
