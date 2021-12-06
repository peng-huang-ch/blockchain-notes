require('dotenv').config();
const { privateToAddress, privateToPublic, isValidPrivate, publicToAddress, toChecksumAddress } = require('ethereumjs-util');
const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');
const { PRIVATE_KEY } = process.env;
const privateKey = Buffer.from(PRIVATE_KEY, 'hex');

const publicKey = privateToPublic(privateKey);
const address = privateToAddress(privateKey);

console.log('isValidPrivate      : ', isValidPrivate(privateKey));
console.log('public key          : ', publicKey.toString('hex'));
console.log('private to address  : ', address.toString('hex'));
console.log('public to address   : ', publicToAddress(publicKey).toString('hex'));
console.log('BIP55 address       : ', toChecksumAddress(publicToAddress(publicKey, true).toString('hex')));

const pair = ec.keyFromPrivate(privateKey);
const compact = pair.getPublic(true, 'hex');
const decompose = pair.getPublic(false, 'hex');
const decomposeBuf = Buffer.from(decompose, 'hex');
const addr = publicToAddress(decomposeBuf, true).toString('hex');
console.log('compact             : ', compact);
console.log('decompose           : ', decompose);
console.log('address             : ', addr);
console.log('bip55 address       : ', toChecksumAddress(addr));
