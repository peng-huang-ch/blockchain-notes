require('dotenv').config();
const { bitgo, networks, ECPair } = require('@bitgo/utxo-lib-v2');

const network = networks.testnet;

var secret = process.env.ECDSA_SECRET;
const signer = ECPair.fromPrivateKey(Buffer.from(secret, 'hex'), { network });

var txb = bitgo.createTransactionBuilderForNetwork(network);
txb.addInput('fb3e300435a7fa7713a6e46b497342ac1c127d208d348cbf9813dc62e4fee435', 0);
txb.addOutput('n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN', 9800);

txb.sign(0, signer);

var tx = txb.build();
var txId = tx.getId();
var txHex = tx.toHex();

console.log('bitgo txId   : ', txId);
console.log('bitgo hex    : ', txHex);
