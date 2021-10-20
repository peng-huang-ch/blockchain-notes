require('dotenv').config();
const { Transaction } = require('@ethereumjs/tx');
const { default: Common } = require('@ethereumjs/common');
const { bufferToHex, stripHexPrefix } = require('ethereumjs-util');
const { default: BigNumber } = require('bignumber.js');

const { PRIVATE_KEY } = process.env;

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

const Web3 = require('web3');

const provider = 'https://kovan.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);

async function main() {
  const from = '0xd73d9AA55ABBd6CFbeD3e9Ad7f8Be2f6D83C70dC';
  const to = '0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243';
  const tokenAddress = '0x5abe286f5ea6132b157cfd728834d493cbd43314';
  const quantity = new BigNumber(1000).shiftedBy(18).toFixed();
  const common = new Common({ chain: 'kovan' });
  const txOptions = { common };

  const raw = '0000000000000000000000000000000000000000000000000000000000000000';
  const amount = new BigNumber(quantity).toString(16);
  const input =
    '0xa9059cbb000000000000000000000000' + // token transfer method
    stripHexPrefix(to) + // to address
    raw.substring(0, raw.length - amount.length) + // placeholder
    amount; // amount

  const nonce = await web3.eth.getTransactionCount(from);
  const gasPrice = await web3.eth.getGasPrice();
  console.log('gasPrice', gasPrice);
  const estimateGas = await web3.eth.estimateGas({
    from,
    to: tokenAddress,
    data: input,
    gasPrice,
    nonce,
    value: '0x00',
  });
  console.log('estimateGas', estimateGas);
  const gasLimit = new BigNumber(estimateGas).toString();

  const txData = {
    from,
    to: tokenAddress,
    data: input,
    value: '0x00',
    nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
    gasPrice: '0x' + new BigNumber(gasPrice).toString(16),
    gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
  };
  const tx = Transaction.fromTxData(txData, txOptions);
  const privatekey = Buffer.from(PRIVATE_KEY, 'hex');

  const signedTx = tx.sign(privatekey);
  const serializedTx = signedTx.serialize();

  console.log('bufferToHex(serializedTx)', bufferToHex(serializedTx));
  const hash = await sendTx(web3, bufferToHex(serializedTx));
  console.log('hash', hash);
}

main().then().catch(console.error);
