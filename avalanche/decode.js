const { URL } = require('url');
const createHash = require('create-hash');
const { Avalanche, BinTools, Buffer, BN, utils, avm, common } = require('avalanche');
const { Defaults, Serialization } = utils;
const bintools = BinTools.getInstance();
const { SECRET_KEY_2 } = process.env;

const networkID = 5;
const avalanche = new Avalanche('api.avax-test.network', 443, 'https', networkID);
const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS

const xKeychain = xchain.keyChain();

const avaxAssetID = Defaults.network[networkID].X['avaxAssetID'];
const serialization = Serialization.getInstance();

async function main() {
  const keyPair = xKeychain.importKey(Buffer.from(SECRET_KEY_2, 'hex'));
  var pub_hex = keyPair.getPublicKey().toString('hex');
  var kp = new avm.KeyPair(xKeychain.hrp, xKeychain.chainid);
  var msg = Buffer.from('bcb6939718ab7a46f389c36262194ce34111ea88810a6ead8b00379a36215c26', 'hex');
  var kpPub = kp.recover(msg, Buffer.from('09aadf7d86b8c61b2473c940d43731f2155d5670acd08559720ff0dc720c6a5e6410cb68bd683d4a7cc31099439122695b265b9879726b66bf78178689bbe55101', 'hex'));
  console.log('kpPub    : ', kpPub.toString('hex'));
  console.log('pub  hex : ', pub_hex);

  const rawCb58 = '111111111AvZUPL21jGdPvACdqwf4vSzVVEJvwwGpp7KFqw5H7C53LJLGYZxkLFFXDVykZMnUuM7kHMHr1L8QkPTTcojbc8FKQouSkFFhbh8hWye6kq415u4gJ2kq3h1W3BHSFiNzmnRWG7ZaUQadPNJpcYAehY3GHzJcGeFaBuBznSvopnLfr2kdbWf8aaJoDZVcvTGXJZz6GEjY5UzmfdgfcVZwExV4EyEEmg5Ma5MB2pQ73p8VyfZEVVMrxNyCJHEa7JYg8koTLKFqDMFCDX1cskvs8hMoy78osj2P3i9frsvkxwmMGEpCP1cp2uEpz5Uwse8vWhTLvYQ5ekYD9cG5MitUbEh2hi7LfZgEsttBhAYQT3zcyGwzpBk8Cyf5TxbPW6vJwMNtDekdrmve9Leae';
  const rawHex =
    '00000000000000000005ab68eb1ee142a05cfe768c36e11f0b596db5a3c6c77aabe665dad9e638ca94f7000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000070000000076e948c00000000000000000000000010000000174d0618dd3d6a8b39b602c4556d9e43ce792f2b500000001c74f28c8abbe0a4f656eab6a70980d7bd8849ed53972cfb75dd461b7e8d15f18000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000050000000076f88b0000000001000000000000000000000001000000090000000109aadf7d86b8c61b2473c940d43731f2155d5670acd08559720ff0dc720c6a5e6410cb68bd683d4a7cc31099439122695b265b9879726b66bf78178689bbe55101';
  console.log('tx cb58: ', serialization.bufferToType(Buffer.from(rawHex, 'hex'), 'cb58'));
  console.log('tx hex : ', serialization.typeToBuffer(rawCb58, 'cb58').toString('hex'));
  const newTx = new avm.Tx();
  const txBuf = serialization.typeToBuffer(rawCb58, 'cb58');
  newTx.fromBuffer(txBuf);

  var unsignedTx = newTx.getUnsignedTx();
  var unsignedTxDisplay = unsignedTx.serialize('display');
  var unsignedTxDisplay = JSON.parse(JSON.stringify(unsignedTxDisplay));

  console.log('display  : ', unsignedTxDisplay);
  console.log('ins      : ', unsignedTxDisplay.transaction.ins);
  console.log('outs     : ', unsignedTxDisplay.transaction.outs);
  console.log('--------------------------------------------------------------------');

  const transaction = unsignedTx.getTransaction();

  const ins = transaction.getIns();
  const outs = transaction.getOuts();

  const to = outs[0].getOutput().getAddress(0);
  console.log('to', serialization.bufferToType(to, 'bech32', xKeychain.hrp, xKeychain.chainid));
  console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++');

  var msg_hex = Buffer.from(createHash('sha256').update(unsignedTx.toBuffer()).digest().buffer).toString('hex');
  console.log('message hex: ', msg_hex);

  const display = newTx.serialize('display');
  console.log(JSON.stringify(display, null, 2));

  const credentials = newTx.getCredentials();

  // credentials.serialize();
  var credential = credentials[0];
  credential.serialize('hex');
  console.log(credential.sigArray[0].bytes.toString('hex'));
  console.log(credential.serialize('hex'));
  // console.log(JSON.stringify(credential.serialize('display')), null, 2);
  // credential.serialize('display');

  // var unsignedTx = newTx.getUnsignedTx();

  var message = createHash('sha256').update(unsignedTx.toBuffer()).digest().buffer;
  console.log('message : ', message);

  // const serialized = serialization.serialize(tx, vm, hex);
  // const cb58 = 'cb58';
  // const buffer = Buffer.from(createHash('sha256').update(tx.toBuffer()).digest().buffer);
  // var txid = serialization.bufferToType(buffer, cb58);
  // console.log('TXID hex', buffer.toString('hex'));
  // console.log(`Prepare TXID : ${txid}`);
  // var txid = await xchain.issueTx(tx);
  // console.log(`Success TXID : ${txid}`);
}

main().catch(console.error);
