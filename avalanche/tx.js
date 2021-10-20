const createHash = require('create-hash');
const { Avalanche, BinTools, Buffer, BN, utils, avm, common } = require('avalanche');
const { UTXOSet, UTXO, SECPTransferInput, TransferableInput, BaseTx, UnsignedTx, SECPTransferOutput, TransferableOutput } = avm;
const { Defaults, PrivateKeyPrefix, Serialization } = utils;
const bintools = BinTools.getInstance();
const serialization = Serialization.getInstance();
const { SECRET_KEY_1 } = process.env;

const networkID = 5;
const avalanche = new Avalanche('api.avax-test.network', 443, 'https', networkID);
const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS

const xKeychain = xchain.keyChain();

const blockchainID = Defaults.network[networkID].X.blockchainID;
const avaxAssetID = Defaults.network[networkID].X.avaxAssetID;
const avaxAssetIDBuf = bintools.cb58Decode(avaxAssetID);

const memo = Buffer.from('AVM BaseTx to send AVAX');

async function main() {
  const outputs = [];
  const inputs = [];
  const fee = xchain.getDefaultTxFee();
  const threshold = 1;
  const locktime = new BN(0);

  const keyPair = xKeychain.importKey(Buffer.from(SECRET_KEY_1, 'hex'));
  const addressBuf = keyPair.getAddress();
  const pub = keyPair.getPublicKey();
  const address = keyPair.getAddressString();
  const toAddress = ['X-fuji1wngxrrwn665t8xmq93z4dk0y8nne9u44adyhac', 'X-fuji1cgr6lauw3m6v79vxtu8de4ku0mnvxpedrz5wjw'];
  const changeAddresses = ['X-fuji1cgr6lauw3m6v79vxtu8de4ku0mnvxpedrz5wjw'];

  var xAddresses = toAddress.map((addr) => xchain.parseAddress(addr));

  console.log('xAddresses', xAddresses);
  console.log('xAddresses', xAddresses[0]);

  var secpTransferOutput = new SECPTransferOutput(new BN(1190000000), [xAddresses[0]], locktime, threshold);
  // secpTransferOutput.setCodecID(codecID)
  var transferableOutput = new TransferableOutput(avaxAssetIDBuf, secpTransferOutput);
  outputs.push(transferableOutput);

  // var secpTransferOutput = new SECPTransferOutput(new BN(1000000000), [xAddresses[1]], locktime, threshold);
  // // secpTransferOutput.setCodecID(codecID)
  // var transferableOutput = new TransferableOutput(avaxAssetIDBuf, secpTransferOutput);
  // outputs.push(transferableOutput);

  // var secpTransferOutput = new SECPTransferOutput(new BN(1000000000), [xAddresses[0]], locktime, threshold);
  // // secpTransferOutput.setCodecID(codecID)
  // var transferableOutput = new TransferableOutput(avaxAssetIDBuf, secpTransferOutput);
  // outputs.push(transferableOutput);

  // const utxoSet = new avm.UTXOSet();
  // utxoSet.addArray(
  //   [
  //     '11Z94F7frFgfnXnUkMth9skJCHss1Szxqz1pBdRm56c6DeG7qDFTqiLLZ6p6JdW7y4Bmvj5rorfyesvPBi8RpRBJomgy9Fu1bdKfSUxi3bNkCdUb7ToSEtqpHnFtdhpBU6aJVK6wujiWxQHpkDF52XHpPzLDhgWxshaqzM',
  //     '11GRBUV7SbtoFdQsBAWHVwdb7ssC8fu8ZKRTvC1ztwcspxQLoPrjAX2Dsy6HAjAzD45mjGTg1FSm7HvdXJFhFV5NbFLPJFZvBnYLkBqjhwYgXZpEAXBKV5tcNFPnPmRdDR9rQmfkbYZEvcbfACW3ed6NJjpmLa2cnSnuAr', //
  //   ],
  //   false
  // );

  const avmUTXOResponse = await xchain.getUTXOs(address);
  const utxoSet = avmUTXOResponse.utxos;

  const utxos = utxoSet.getAllUTXOs();
  utxos.forEach((utxo) => {
    const amountOutput = utxo.getOutput();
    const amt = amountOutput.getAmount().clone();
    const txid = utxo.getTxID();
    const outputidx = utxo.getOutputIdx();

    const secpTransferInput = new SECPTransferInput(amt);
    // Uncomment for codecID 00 01
    // secpTransferInput.setCodecID(codecID)
    secpTransferInput.addSignatureIdx(0, xAddresses[0]);

    const input = new TransferableInput(txid, outputidx, avaxAssetIDBuf, secpTransferInput);
    inputs.push(input);
  });

  const baseTx = new BaseTx(networkID, bintools.cb58Decode(blockchainID), outputs, inputs, memo);

  const unsignedTx = new UnsignedTx(baseTx);
  const tx = unsignedTx.sign(xKeychain);
  console.log('serialized: ', tx.toBuffer().toString('hex'));

  const buffer = Buffer.from(createHash('sha256').update(tx.toBuffer()).digest().buffer);
  var txid = serialization.bufferToType(buffer, 'cb58');
  console.log('TXID hex', buffer.toString('hex'));
  console.log(`Prepare TXID : ${txid}`);

  var txid = await xchain.issueTx(tx);
  console.log(`Success TXID : ${txid}`);
}

main().catch(console.error);
