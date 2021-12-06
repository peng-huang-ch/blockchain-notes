require('dotenv').config();
const umi = require('@umi-top/umi-core-js');
var mnemonic = process.env.UMI_MNEMONIC;

const bip39 = require('bip39');
// var mnemonic = bip39.generateMnemonic(256);

const seed = bip39.mnemonicToSeedSync(mnemonic);
const secKey = umi.SecretKey.fromSeed(seed);

const sender = umi.Address.fromKey(secKey).setPrefix('umi');
// const recipient = umi.Address.fromKey(secKey).setPrefix('aaa');
const recipient = umi.Address.fromBech32('umi1244pgspze5cvy2wv96fyr0v5z6js7cfkluwdsm624pcj5aps2fnsy60s7j');

console.log('sender 	: ', sender.getBech32());
console.log('recipient 	: ', recipient.getBech32());
var tx = new umi.Transaction().setVersion(8).setSender(sender).setRecipient(recipient).setValue(10);

// tx = tx.setNonce(1635841272027);
// var message = tx.getBytes().slice(0, 85);

// console.log('message    : ', umi.hexEncode(message));
// var signature = secKey.sign(message);
// console.log('signature  : ', umi.hexEncode(signature));

// var tx = umi.Transaction.fromBytes(umi.hexDecode('0155a92202fce93e6fd225e0e4e029de1a671d24e0d4b60445bd9e4f8c2da31cbc05e255a9556a144022cd30c229cc2e9241bd9416a50f6136ff1cd86f4aa8712a7430526700000000000000640000017ce028b9030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'));
// console.log('tx bytes 1.: ', umi.hexEncode(tx.getBytes()));
// var signature = secKey.sign(umi.hexDecode('0155a92202fce93e6fd225e0e4e029de1a671d24e0d4b60445bd9e4f8c2da31cbc05e255a9556a144022cd30c229cc2e9241bd9416a50f6136ff1cd86f4aa8712a7430526700000000000000640000017ce028b903'));
// console.log('signature  : ', umi.hexEncode(signature));
// tx = tx.setSignature(signature);

tx = tx.sign(secKey);

console.log('tx bytes 2.: ', umi.hexEncode(tx.getBytes()));
console.log('txid  		: ', umi.hexEncode(tx.getHash()));
console.log('base64		: ', umi.base64Encode(tx.getBytes()));
// console.log('expected	: ', expected === umi.base64Encode(tx.getBytes()));
