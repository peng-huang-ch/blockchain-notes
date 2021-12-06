require('dotenv').config();
const umi = require('@umi-top/umi-core-js');
var mnemonic = process.env.UMI_MNEMONIC;

const bip39 = require('bip39');

// var mnemonic = bip39.generateMnemonic(256);

const seed = bip39.mnemonicToSeedSync(mnemonic);

const secretKey = umi.SecretKey.fromSeed(seed);
const publicKey = secretKey.getPublicKey();
const address1 = umi.Address.fromKey(secretKey);
const address2 = umi.Address.fromKey(publicKey);

console.log('mnemonic	: ', mnemonic);
console.log('private	: ', umi.hexEncode(secretKey.getBytes()));
console.log('public		: ', umi.hexEncode(publicKey.getBytes()));
console.log('address1   : ', address1.getBech32());
console.log('address2   : ', address2.getBech32());
