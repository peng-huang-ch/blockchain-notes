const createHash = require('create-hash');
const { Avalanche, BinTools, Buffer, BN, utils, avm, common } = require('avalanche');
const { xorWith } = require('lodash');
const { StandardAmountOutput } = common;
const { UTXOSet, UTXO, SECPTransferOutput } = avm;
const { Defaults, PrivateKeyPrefix, Serialization } = utils;
const bintools = BinTools.getInstance();

const { SECRET_KEY_1 } = process.env;

const networkID = 5;
const avalanche = new Avalanche('api.avax-test.network', 443, 'https', networkID);
const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS

const xKeychain = xchain.keyChain();

const avaxAssetID = Defaults.network[networkID].X['avaxAssetID'];

async function main() {
  const keyPair = xKeychain.importKey(Buffer.from(SECRET_KEY_1, 'hex'));
  const address = keyPair.getAddressString();

  var balance = await xchain.getBalance(address, 'AVAX');
  // get the AVAX balance for the 1st address

  const utxos = new avm.UTXOSet();
  utxos.addArray(
    [
      '11GRBUV7SbtoFdQsBAWHVwdb7ssC8fu8ZKRTvC1ztwcspxQLoPrjAX2Dsy6HAjAzD45mjGTg1FSm7HvdXJFhFV5NbFLPJFZvBnYLkBqjhwYgXZpEAXBKV5tcNFPnPmRdDR9rQmfkbYZEvcbfACW3ed6NJjpmLa2cnSnuAr', //
    ],
    false
  );
  const toAddress = ['X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2'];
  const secpTransferOutput = new SECPTransferOutput(balance.sub(fee), xAddresses, locktime, threshold);

  const unsignedTx = await xchain.buildBaseTx(utxos, new BN('3988000000'), avaxAssetID, toAddress, [address], changeAddresses);

  unsignedTx.transaction.getIns().forEach((ins) => {
    console.log('---ins---');
    console.log('ins', JSON.stringify(ins.serialize('display'), null, 2));
  });

  unsignedTx.transaction.getOuts().forEach((out) => {
    console.log('---out---');
    console.log('out', JSON.stringify(out.serialize('display'), null, 2));
  });

  const totalOutPuts = unsignedTx.getTransaction().getTotalOuts();
  console.log('unsignedTx', totalOutPuts);
  console.log('unsignedTx hex: ', unsignedTx.toBuffer());
  const tx = unsignedTx.sign(xKeychain);
  const hex = tx.toBuffer().toString('hex');
  console.log('serialize hex     : ', hex);

  var display = tx.serialize('display');
  console.log('serialize display : ', JSON.stringify(display));
  const serialization = Serialization.getInstance();

  const buffer = Buffer.from(createHash('sha256').update(tx.toBuffer()).digest().buffer);
  var txid = serialization.bufferToType(buffer, 'cb58');
  console.log('TXID hex', buffer.toString('hex'));
  console.log(`Prepare TXID : ${txid}`);

  // var txid = await xchain.issueTx(tx);
  // console.log(`Success TXID : ${txid}`);
}

main().catch(console.error);

// 3d819360725cee7f8d72c8c7cd01f1c661e9f266daa1b8c6401a66405de8c67e
// X-fuji1wngxrrwn665t8xmq93z4dk0y8nne9u44adyhac

// beec729e21fbd32d2b47bb3b4eb7ce7f0c25b259fdbf8b6f5cbe76f46c7e1e96
// X-fuji1rz6uxnat4e9l6ygdu9enx3a79xnjzg2z4763w2
