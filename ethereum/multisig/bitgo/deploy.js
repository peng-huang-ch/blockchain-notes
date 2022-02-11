require('dotenv').config();
const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const { Transaction } = require('@ethereumjs/tx');
const { default: Common } = require('@ethereumjs/common');
const { bufferToHex, pubToAddress, toChecksumAddress, generateAddress, toBuffer } = require('ethereumjs-util');
const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');
const Contract = require('web3-eth-contract');
const abi = require('../abis/multisig');
const bytecode = require('../bytecodes/multisig');

const contract = new Contract(abi);
const { PRIVATE_KEY: privateKey } = process.env;

const pubToBIP55Address = (key) => {
  const pair = ec.keyFromPublic(key, 'hex');
  const decompose = pair.getPublic(false, 'hex');
  const address = bufferToHex(pubToAddress(Buffer.from(decompose, 'hex'), true));
  const bip55 = toChecksumAddress(address);
  return bip55;
};

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

async function main({ web3, sender, pubs, common }) {
  const addresses = pubs.map(pubToBIP55Address);
  const input = contract
    .deploy({
      data: bytecode,
      arguments: [addresses],
    })
    .encodeABI();
  const nonce = await web3.eth.getTransactionCount(sender);
  const gasPrice = await web3.eth.getGasPrice();
  const gasLimit = await web3.eth.estimateGas({
    from: sender,
    gasPrice,
    nonce,
    data: input,
    value: '0x00',
  });

  const opts = { common };
  const tx = Transaction.fromTxData(
    {
      data: input,
      value: '0x00',
      nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
      gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
      gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
    },
    opts
  );
  console.log('privateKey', privateKey);
  const signedTx = tx.sign(toBuffer('0x' + privateKey));
  const serializedTx = signedTx.serialize();
  console.log('account  : ', bufferToHex(generateAddress(sender, toBuffer(nonce))));
  console.log('bufferToHex(serializedTx) : ', bufferToHex(serializedTx));
  const address = toChecksumAddress(bufferToHex(generateAddress(from, new BN(txData.nonce!).toBuffer())));
  // const hash = await sendTx(web3, bufferToHex(serializedTx));
  // console.log('hash', hash);
}

const common = new Common({ chain: 'ropsten' });
const sender = '0xd73d9AA55ABBd6CFbeD3e9Ad7f8Be2f6D83C70dC';
const pubs = [
  '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', // 0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243
  '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd', //
  '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266',
];

const provider = 'https://ropsten.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);

main({
  sender,
  web3,
  pubs,
  common,
  privateKey: Buffer.from(privateKey, 'hex'),
})
  .then()
  .catch(console.error);
