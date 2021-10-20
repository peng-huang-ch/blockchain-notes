const createHash = require('create-hash');
const { Avalanche, BinTools, Buffer, BN, utils, avm, common } = require('avalanche');
const { StandardAmountOutput } = common;
const { UTXOSet, UTXO } = require('avalanche/dist/apis/avm');
const { Defaults, Serialization } = utils;
const { SECRET_KEY_1 } = process.env;

const networkID = 5;
const avalanche = new Avalanche('api.avax-test.network', 443, 'https', networkID);
const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS

const xKeychain = xchain.keyChain();

const avaxAssetID = Defaults.network[networkID].X['avaxAssetID'];

async function main() {
  const keyPair = xKeychain.importKey(Buffer.from(SECRET_KEY_1, 'hex'));
  const addressBuf = keyPair.getAddress();
  const pub = keyPair.getPublicKey();
  const address = keyPair.getAddressString();
  console.log('address', address);
  console.log('pub     hex : ', pub.toString('hex'));
  console.log('address     : ', address);
  console.log('address buf : ', addressBuf.toString('hex'));

  // get the AVAX balance for the 1st address
  // const getBalanceResponse = await xchain.getBalance(address, avaxAssetID);
  // var balance = new BN(getBalanceResponse.balance);

  var balance = new BN('1989000000');

  // subtract the fee
  const fee = xchain.getDefaultTxFee();

  const amount = balance.sub(fee);
  console.log('amount', amount.toString());

  // get the UTXOs for the 1st address
  // const avmUTXOResponse = await xchain.getUTXOs(address);
  // var utxos = avmUTXOResponse.utxos;
  const utxos = new UTXOSet();

  utxos.addArray(['119ddmfJNCFrXuKmjs6teNgMeoFuNkzN2ZGBfYWhHUHnmbat8ZxzehjPjNV4P931cxj3iXtNhU4ka4CbmMECBaVT32waJVMVCkBMQbkyBuDBQaQZyceXNwWdovNfVTznZJWGQeDXqSuVhHnwxU6cxBn4mXLi4ST1Jvb5bn'], false);

  const toAddress = ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'];
  const changeAddresses = ['X-fuji1wngxrrwn665t8xmq93z4dk0y8nne9u44adyhac'];

  // build an UnsignedTx sending AVAX from the first external BIP44 address to the second external BIP44 address
  const unsignedTx = await xchain.buildBaseTx(utxos, amount, avaxAssetID, toAddress, [address], changeAddresses);

  // unsignedTx
  var display = unsignedTx.serialize('display');
  console.log('display', JSON.stringify(display, null, 2));

  const tx = unsignedTx.sign(xKeychain);
  const hex = tx.toBuffer().toString('hex');
  console.log('serialize hex     : ', hex);

  var display = tx.serialize('display');
  console.log('serialize display : ', JSON.stringify(display));

  const buffer = Buffer.from(createHash('sha256').update(tx.toBuffer()).digest().buffer);

  const serialization = Serialization.getInstance();
  var txid = serialization.bufferToType(buffer, 'cb58');

  console.log('TXID hex', buffer.toString('hex'));
  console.log(`Prepare TXID : ${txid}`);

  var txid = await xchain.issueTx(tx);
  console.log(`Success TXID : ${txid}`);
}

main().catch(console.error);
