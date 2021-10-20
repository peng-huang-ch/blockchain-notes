require('dotenv').config();
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Hardfork, Chain } = require('@ethereumjs/common');
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
const { toHex, toBN } = require('web3-utils');
const Method = require('web3-core-method');

const provider = 'https://ropsten.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);

web3.eth.customRPC = function (opts) {
  const _this = this;
  const newMethod = new Method({
    name: opts.name,
    call: opts.call,
    params: opts.params || 0,
    inputFormatter: opts.inputFormatter || null,
    outputFormatter: opts.outputFormatter || null,
  });
  newMethod.attachToObject(_this);
  newMethod.setRequestManager(_this._requestManager, _this.accounts);
};

async function main() {
  const from = '0xd73d9AA55ABBd6CFbeD3e9Ad7f8Be2f6D83C70dC';
  const to = '0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243';
  const tokenAddress = '0x5abe286f5ea6132b157cfd728834d493cbd43314';
  const quantity = new BigNumber(1).shiftedBy(18).toFixed();
  console.log('quantity', quantity);

  const common = new Common({ chain: 'ropsten', hardfork: Hardfork.London });
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
    // from,
    to: tokenAddress,
    data: input,
    gasPrice,
    nonce,
    common,
  });
  console.log('estimateGas', estimateGas);
  web3.eth.customRPC({ name: 'maxPriorityFeePerGas', call: 'eth_maxPriorityFeePerGas' });
  // const maxPriorityFeePerGas = await web3.eth.maxPriorityFeePerGas();
  const gasLimit = new BigNumber(estimateGas).toString();
  console.log('gasLimit', gasLimit);

  const block = await web3.eth.getBlock('pending');
  const baseFeePerGas = block['baseFeePerGas'];
  const maxPriorityFeePerGas = '0x9502F900'; // 2.5 Gwei
  const maxFeePerGas = toHex(toBN(baseFeePerGas).mul(toBN(2)).add(toBN(maxPriorityFeePerGas)));
  const txData = {
    from,
    to: tokenAddress,
    data: input,
    value: '0x00',
    nonce: nonce ? '0x' + new BigNumber(nonce).toString(16) : '0x',
    // gasLimit: '0x' + new BigNumber(gasLimit).toString(16),

    // maxFeePerGas: '0x' + new BigNumber(gasLimit).toString(16),
    // maxPriorityFeePerGas: '0x' + new BigNumber(gasLimit).toString(16),
    // maxPriorityFeePerGas: '0x' + new BigNumber(maxPriorityFeePerGas).toString(16),
    // maxFeePerGas: '0x' + new BigNumber(maxFeePerGas).toString(16),
    maxPriorityFeePerGas: '0x9502f900',
    maxFeePerGas: '0x9507e4d8',
    gasLimit: '0x89d0',
  };
  console.log('txData', txData);
  const tx = Transaction.fromTxData(txData, txOptions);
  const serialized = tx.serialize().toString('hex');
  const tx_hash = tx.getMessageToSign(true).toString('hex');
  console.log('toJSON    : ', tx.toJSON());
  console.log('hash      : ', tx_hash);
  console.log('serialized: ', serialized);

  const privatekey = Buffer.from(PRIVATE_KEY, 'hex');
  // return;
  const signedTx = tx.sign(privatekey);
  const serializedTx = signedTx.serialize();

  console.log('xxx    : ', signedTx.toJSON());
  console.log('signed serialized: ', bufferToHex(serializedTx));
  console.log('signed txhash    : ', signedTx.serialize().toString('hex'));
  return;
  const hash = await sendTx(web3, bufferToHex(serializedTx));
  console.log('hash', hash);
}

main().then().catch(console.error);
