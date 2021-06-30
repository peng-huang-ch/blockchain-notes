// const { Transaction } = require('@ethereumjs/tx');
// const { keccak256: k256 } = require('ethereum-cryptography/keccak');
// const BigNumber = require('bignumber.js');
const rp = require('request-promise');
var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
var Accounts = require('web3-eth-accounts');
const Contract = require('web3-eth-contract');
const ethJsUtil = require('ethereumjs-util');
// const abi = require('ethereumjs-abi');
// const abiDecoder = require('abi-decoder');
// const rlp = require('rlp');
const BN = require('bn.js');
async function makeRequest(opts) {
  let rpcURI = opts.rpcURI;
  let options = {
    uri: rpcURI,
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      jsonrpc: '2.0',
      method: opts.method,
      params: opts.params,
      id: 1,
    },
  };
  return rp(options).then((res) => {
    if (res.error) {
      throw res.error.message;
    }
    if (res.result == null) {
      throw 'Not Found';
    }
    return res.result;
  });
}

async function getTransactionCount(rpcURI, address) {
  return await makeRequest({
    rpcURI,
    method: 'eth_getTransactionCount',
    params: [address, 'latest'],
  });
}

async function getGasPrice(rpcURI) {
  return await makeRequest({
    rpcURI,
    method: 'eth_gasPrice',
    params: [],
  });
}

async function estimateGas(rpcURI, rawTx) {
  return await makeRequest({
    rpcURI,
    method: 'eth_estimateGas',
    params: [rawTx],
  });
}

async function deploy({ payload, network }) {
  const { keys } = payload;
  const { rpcURI } = network;
  const abi = require('./abis/multisig');
  const bytecode = require('./bytecodes/multisig');
  const contract = new Contract(abi);
  const addresses = keys.map((key) => ethJsUtil.bufferToHex(ethJsUtil.pubToAddress(Buffer.from(ec.keyFromPublic(key, 'hex').getPublic(false, 'hex'), 'hex').slice(1))));
  const input = contract
    .deploy({
      data: bytecode,
      arguments: [addresses],
    })
    .encodeABI();
  console.log('input', input);
  const rawTx = {
    data: input,
  };

  const nonce = await getTransactionCount(rpcURI, '0xd73d9aa55abbd6cfbed3e9ad7f8be2f6d83c70dc');
  const gasPrice = await getGasPrice(rpcURI);
  const gas = await estimateGas(rpcURI, rawTx);
  console.log('gas', gas);

  const { rawTransaction } = await new Accounts(rpcURI).signTransaction(
    {
      ...rawTx,
      ...{ nonce, gas, gasPrice },
    },
    '0x2ef4813a7b4181f6b0eb57fa4b980740cbd4d827da81c39324870ee3368da087'
  );

  // await makeRequest({
  //   rpcURI,
  //   method: 'eth_sendRawTransaction',
  //   params: [rawTransaction],
  // });
  const hexBuf = Buffer.from('0xd73d9aa55abbd6cfbed3e9ad7f8be2f6d83c70dc');
  const nonceBuf = Buffer.from(nonce);
  const futureAddress = ethJsUtil.bufferToHex(ethJsUtil.generateAddress(hexBuf, nonceBuf));
  return futureAddress;
}

// deploy({
//   payload: {
//     keys: ['02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', '0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd', '02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266'],
//   },
//   network: {
//     rpcURI: 'https://kovan.infura.io/v3/31a18f4a8bd14b56a4fb9ca9a818c7fa',
//   },
// })
//   .then(console.log)
//   .catch(console.error);

const a = new BN('370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243', 16);
console.log(a.toString(10));
