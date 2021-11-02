require('dotenv').config();

const { TransactionBuilder, networks, ECPair } = require('@bitgo/utxo-lib');
const { payments } = require('@bitgo/utxo-lib-v2');
const network = networks.testnet;

var secret = process.env.ECDSA_SECRET;

const signer = ECPair.fromPrivateKeyBuffer(Buffer.from(secret, 'hex'), network);
const pubkey = signer.getPublicKeyBuffer();

console.log('pubkey  : ', pubkey.toString('hex'));
const { address } = payments.p2pkh({ pubkey, network });
console.log('address : ', address);

const txb = new TransactionBuilder(network);

txb.addInput('fb3e300435a7fa7713a6e46b497342ac1c127d208d348cbf9813dc62e4fee435', 0);

txb.addOutput('n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN', 9800);

txb.sign(0, signer);

const serialized = txb.build().toHex();
console.log('serialized : ', serialized);
