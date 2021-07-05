require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const Contract = require('web3-eth-contract');
const { default: Common } = require('@ethereumjs/common');
const { bufferToHex, pubToAddress, toChecksumAddress } = require('ethereumjs-util');

const ABI = require('ethereumjs-abi');
const util = require('ethereumjs-util');
const { Transaction } = require('@ethereumjs/tx');

const abi = require('../abis/multisig');
const contract = new Contract(abi);
const BN = util.BN;
const EMPTY_SIGNATURE = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
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

function getSha3ForConfirmationTx(prefix, toAddress, quantity, data, expireTime, sequenceId) {
  return ABI.soliditySHA3(
    ['string', 'address', 'uint', 'string', 'uint', 'uint'], // argTypes
    [prefix, new BN(toAddress.replace('0x', ''), 16), quantity, data, expireTime, sequenceId]
  );
}

const serializeSignature = ({ r, s, v }) => '0x' + Buffer.concat([r, s, Buffer.from([v])]).toString('hex');

// https://github.com/BitGo/eth-multisig-v2/blob/8544002d078d6bebcff4017fda7b40a534087bbe/test/walletsimple.js#L285
async function main({ web3, from, to, quantity, chainId, common, proposerPrivateKey, sender, senderPrivateKey }) {
  const sequenceId = await web3.eth.call({
    to: from,
    data: '0xa0b7967b',
  });

  const expireTime = Math.ceil(new Date().getTime() / 1000) + 600; // 600 seconds
  const operationHash = getSha3ForConfirmationTx(
    'ETHER', //
    to,
    quantity,
    '',
    expireTime, //
    sequenceId
  );

  const sig = util.ecsign(operationHash, proposerPrivateKey);

  const input = contract.methods.sendMultiSig(to, quantity, '0x', expireTime, sequenceId, serializeSignature(sig)).encodeABI();
  const nonce = await web3.eth.getTransactionCount(sender);
  const gasPrice = await web3.eth.getGasPrice();

  const gasLimit = await web3.eth.estimateGas({
    from: sender,
    to: from,
    data: input,
    nonce,
    gasPrice,
  });

  const txData = {
    data: input,
    value: '0x00',
    to: from,
    nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
    gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
    gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
  };

  const opts = { common };
  const tx = Transaction.fromTxData(txData, opts);
  const signedTx = tx.sign(senderPrivateKey);
  const serializedTx = signedTx.serialize();

  console.log('bufferToHex(serializedTx)', bufferToHex(serializedTx));
  const hash = await sendTx(web3, bufferToHex(serializedTx));
  console.log('hash', hash);
}

const provider = 'https://kovan.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);
const common = new Common({ chain: 'kovan' });
const from = '0x317028fb803594ebcc310481303965f984fb3e19';
const to = '0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243';

const { PROPOSER_PRIVATE_KEY, SENDER_PRIVATE_KEY } = process.env;
const quantity = new BigNumber(0.0001).shiftedBy(18).toFixed();

const sender = '0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243';
const senderPrivateKey = Buffer.from(
  SENDER_PRIVATE_KEY, // sender private key
  'hex'
);

const proposerPrivateKey = Buffer.from(
  PROPOSER_PRIVATE_KEY, // proposer private key
  'hex'
);

main({
  from,
  to,
  quantity,

  web3,
  common,
  chainId: 42,
  proposerPrivateKey,
  sender,
  senderPrivateKey,
})
  .then()
  .catch(console.error);
