const _ = require('lodash');
const TronWeb = require('tronweb');
const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');
const codec = require('ripple-binary-codec');

const utils = TronWeb.utils;
const hexStr2byteArray = utils.code.hexStr2byteArray;

const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider('https://api.shasta.trongrid.io');
const solidityNode = new HttpProvider('https://api.shasta.trongrid.io');
const eventServer = new HttpProvider('https://api.shasta.trongrid.io');
const privateKey = '';
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);

const ACCOUNT = 'TVi1ChXUW5MN6KCsurBdzkWjqPYjy7q1DT';
const memo = 'phcc';

async function main() {
  console.log(tronWeb.defaultAddress.base58, '=>', ACCOUNT);

  const unSignedTxn = await tronWeb.transactionBuilder.sendTrx(ACCOUNT, 10);
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

function sign() {
  const txId = '44c62fa28f73d383d0c730255d79914fecf5962f5512507d9099a36a5f42afe1';
  const expected = '193ecc5408b891722b4a5fd17d3b4b1defee8f053bb7550adfb91316a1be48d133319d23cb38f4ca4bf1bef40d307a8644de311ab3ed1fd36d391226fbd300ca01';
  const signature = utils.crypto.ECKeySign(hexStr2byteArray(txId), hexStr2byteArray(privateKey));
  console.log('signature', signature, signature === expected);
  console.log('equal  : ', signature === ECKeySign(txId, privateKey));
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

sign();
main().catch(console.error);
