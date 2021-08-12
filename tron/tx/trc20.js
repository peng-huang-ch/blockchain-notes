// https://andelf.gitbook.io/tron/tron-by-example/transfer-trc20
const _ = require('lodash');
const TronWeb = require('tronweb');
const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');

const utils = TronWeb.utils;
const hexStr2byteArray = utils.code.hexStr2byteArray;

const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.trongrid.io');
const solidityNode = new HttpProvider('https://api.trongrid.io');
const eventServer = new HttpProvider('https://api.trongrid.io');
const privateKey = '';
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);

const ACCOUNT = 'TMao9aQTrRcjH5tVSz1MzzngtY6DenaVM2';
const quantity = 100000000000000;
const memo = 'phcc';
const CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

async function main() {
  console.log(tronWeb.defaultAddress.base58, '=>', ACCOUNT);
  const parameter = [
    { type: 'address', value: ACCOUNT },
    { type: 'uint256', value: quantity },
  ];
  const options = {
    feeLimit: 100000000,
    callValue: 0,
  };
  let { transaction: unSignedTxn, result } = await tronWeb.transactionBuilder.triggerSmartContract(
    CONTRACT,
    'transfer(address,uint256)',
    options,
    parameter,
    tronWeb.defaultAddress.base58 //
  );
  console.log('result', result);
  console.log('unSignedTxn        : ', JSON.stringify(unSignedTxn, null, 2));
  const unSignedTxnWithNote = await tronWeb.transactionBuilder.addUpdateData(unSignedTxn, memo, 'utf8');
  console.log('unSignedTxnWithNote: ', JSON.stringify(unSignedTxnWithNote, null, 2));
  console.log('unSignedTxnWithNote serialized', Buffer.from(JSON.stringify(unSignedTxnWithNote)).toString('hex'));
  const signature = utils.crypto.ECKeySign(hexStr2byteArray(unSignedTxnWithNote.txID), hexStr2byteArray(privateKey));
  console.log('signature', signature);

  const signedTxn = await tronWeb.trx.sign(unSignedTxnWithNote);

  console.log('signed =>', signedTxn);
  console.log('unSignedTxnWithNote.txID : ', unSignedTxnWithNote.txID);
  console.log('equal', signature === signedTxn.signature[0]);
  const serialized = Buffer.from(JSON.stringify(signedTxn)).toString('hex');
  console.log('serialized', serialized);
  const recover = JSON.parse(Buffer.from(serialized, 'hex').toString());

  // const serialized = codec.encode(signedTxn);
  //codec.decode(serialized);
  console.log('recover =>', recover);
  console.log('equal', _.isEqual(recover, signedTxn));
  console.log('unSignedTxnWithNote txId: ', unSignedTxnWithNote.txID);
  console.log('signedTxn txId          : ', signedTxn.txID);
  console.log(unSignedTxnWithNote.txID === signedTxn.txID);
  // return;

  console.log('recover', JSON.stringify(recover, null, 4));
  return;
  const ret = await tronWeb.trx.sendRawTransaction(recover);
  console.log('broadcast =>', ret);
}

function ECKeySign(hash, priv) {
  const key = ec.keyFromPrivate(priv, 'hex');
  const hashBytes = Buffer.from(hash, 'hex');
  const signature = key.sign(hashBytes);

  const r = signature.r;
  const s = signature.s;
  const id = signature.recoveryParam;

  console.log('');
  let rHex = r.toString('hex');

  while (rHex.length < 64) {
    rHex = `0${rHex}`;
  }

  let sHex = s.toString('hex');

  while (sHex.length < 64) {
    sHex = `0${sHex}`;
  }

  const idHex = utils.bytes.byte2hexStr(id);
  const signHex = rHex + sHex + idHex;
  return signHex;
}

main().catch(console.error);
