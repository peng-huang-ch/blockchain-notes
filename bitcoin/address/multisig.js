const bitgoV1 = require('@bitgo/utxo-lib');
const { payments } = require('bitcoinjs-lib');
const pubKeys = [
  '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', // 2 -3
  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd',
  '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
].map(function (hex) {
  return Buffer.from(hex, 'hex');
});

const threshold = 2;
const network = bitgoV1.networks.testnet

var redeemScript = bitgoV1.script.multisig.output.encode(threshold, pubKeys); // 2 of 3
var scriptPubKey = bitgoV1.script.scriptHash.output.encode(bitgoV1.crypto.hash160(redeemScript));
var address = bitgoV1.address.fromOutputScript(scriptPubKey, network);
console.log('bitgo address  : ', address);

var { address } = payments.p2sh({
  redeem: payments.p2ms({ m: threshold, pubkeys: pubKeys, network }),
  network,
});
console.log('bitcoin address: ', address);
