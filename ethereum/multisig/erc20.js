require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const Contract = require('web3-eth-contract');
const { default: Common } = require('@ethereumjs/common');
const { bufferToHex } = require('ethereumjs-util');

const ABI = require('ethereumjs-abi');
const util = require('ethereumjs-util');
const { Transaction } = require('@ethereumjs/tx');

const abi = require('../abis/multisig');
const contract = new Contract(abi);
const BN = util.BN;

function sendTx(web3, data) {
  return new Promise((resolve, reject) => {
    web3.eth
      .sendSignedTransaction(data)
      .once('transactionHash', (hash) => {
        resolve(hash);
      })
      .on('error', function (error) {
        reject(error);
      });
  });
}

function getSha3ForConfirmationTokenTx(prefix, toAddress, value, tokenContractAddress, expireTime, sequenceId) {
  console.log(arguments);
  return ABI.soliditySHA3(
    ['string', 'address', 'uint', 'address', 'uint', 'uint'], //
    [prefix, new BN(toAddress.replace('0x', ''), 16), value, new BN(tokenContractAddress.replace('0x', ''), 16), expireTime, sequenceId]
  );
}

const serializeSignature = ({ r, s, v }) => '0x' + Buffer.concat([r, s, Buffer.from([v])]).toString('hex');

// https://github.com/BitGo/eth-multisig-v2/blob/8544002d078d6bebcff4017fda7b40a534087bbe/test/walletsimple.js#L285
async function main({ web3, from, to, quantity, tokenAddress, common, proposerPrivateKey, sender, senderPrivateKey }) {
  var sequenceId = await web3.eth.call({
    to: from,
    data: '0xa0b7967b',
  });
  console.log('sequenceId : ', sequenceId);

  // const expireTime = Math.ceil(new Date().getTime() / 1000) + 600; // 600 seconds

  var sequenceId = 7;
  const expireTime = 1625569571;
  const operationHash = getSha3ForConfirmationTokenTx(
    'ERC20', //
    to,
    quantity,
    tokenAddress,
    expireTime, //
    sequenceId
  );

  console.log('operationHash', operationHash.toString('hex'));
  const sig = util.ecsign(operationHash, proposerPrivateKey);

  console.log('serializeSignature(sig)', serializeSignature(sig));

  const input = contract.methods.sendMultiSigToken(to, quantity, tokenAddress, expireTime, sequenceId, '0x').encodeABI();

  console.log('');
  console.log('input', input);
  const nonce = await web3.eth.getTransactionCount(sender);
  const gasPrice = '0x147d35700';
  const gasLimit = '0x18ab9';
  // const gasPrice = await web3.eth.getGasPrice();

  // const gasLimit = await web3.eth.estimateGas({
  //   from: sender,
  //   to: from,
  //   data: input,
  //   nonce,
  //   gasPrice,
  // });

  const txData = {
    data: input,
    value: '0x00',
    to: from,
    nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
    gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
    gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
  };
  console.log('txData', txData);
  const opts = { common };
  const tx = Transaction.fromTxData(txData, opts);

  // const signedTx = tx.sign(senderPrivateKey);
  // const serializedTx = signedTx.serialize();

  // console.log('bufferToHex(serializedTx)', bufferToHex(serializedTx));
  return;
  const hash = await sendTx(web3, bufferToHex(serializedTx));
  console.log('hash', hash);
}

const provider = 'https://ropsten.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);
const common = new Common({ chain: 'ropsten' });

const from = '0x2ab5d8164cac7f006ed79817753eb9c9cfeaa093';
const to = '0x8b67944F06DA3f68e0C97ff54d3b27D960134C63';
const tokenAddress = '0x141f63c4ec6ee0c329cb476c88afe2a058fed642';
const { PROPOSER_PRIVATE_KEY, SENDER_PRIVATE_KEY } = process.env;
const quantity = new BigNumber(1).shiftedBy(16).toFixed();

console.log('quantity', quantity);
const sender = '0x2ab5d8164cac7f006ed79817753eb9c9cfeaa093';
const senderPrivateKey = Buffer.from(
  SENDER_PRIVATE_KEY, // sender private key
  'hex'
);

const proposerPrivateKey = Buffer.from(
  'e112748fdb8f743fbbb6412f6067966f9bef0fc315309715034a864fc8b67c62', // proposer private key
  'hex'
);

main({
  from,
  to,
  quantity,
  tokenAddress,

  web3,
  common,
  chainId: 3,
  proposerPrivateKey,
  sender,
  senderPrivateKey,
})
  .then()
  .catch(console.error);
