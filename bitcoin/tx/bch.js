const rp = require('request-promise');
const coinSelect = require('coinselect');
const { Transaction, TransactionBuilder, networks, ECPair, script } = require('@bitgo/utxo-lib');
const bitcore = require('bitcore-lib-cash');

async function getUTXOS(address, bitcoreURI = 'https://api.bitcore.io/api/BCH/testnet') {
  return rp({
    url: `${bitcoreURI}/address/${address}?unspent=true`,
    method: 'GET',
    json: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function buildTx(input) {
  const network = networks.bitcoincashTestnet;
  const keyPair = ECPair.fromPrivateKeyBuffer(Buffer.from('5b27614b1b752645219e44890ae2402c6608cf3c2afce30bd1e45914776e50f3', 'hex'), network);

  const amount = input.value - 1000;

  const pk = keyPair.getPublicKeyBuffer();
  const spk = script.pubKey.output.encode(pk);
  const txb = new TransactionBuilder(network);

  console.log('pk', pk.toString('hex'));
  console.log('address', keyPair.getAddress());

  txb.addInput(input.mintTxid, input.mintIndex, Transaction.DEFAULT_SEQUENCE);
  txb.addOutput('mjNTKjpkusZfjmA8fD6vrCy2irPmwcrGen', amount);
  txb.setVersion(2);

  const hashType = Transaction.SIGHASH_ALL | Transaction.SIGHASH_BITCOINCASHBIP143;
  txb.sign(0, keyPair, null, hashType, input.value);

  const serialized = txb.build().toHex();
  console.log(serialized);
}

async function utxo(address, feeRate) {
  const utxos = await getUTXOS(address);
  const receipts = [
    {
      address: 'mjNTKjpkusZfjmA8fD6vrCy2irPmwcrGen',
      value: 997000,
    },
  ];

  const { inputs, outputs } = coinSelect(utxos, receipts, feeRate);
  if (!inputs || !outputs) return;
  console.log('outputs', outputs);
  console.log('inputs', inputs);

  buildTx(inputs[0], outputs);
}

const address = 'qq4yfl0qucg68wh3a80kgz58ed5sz5kdfvj5muw894';
const feeRate = 1;
utxo(address, feeRate).then().catch(console.error);
