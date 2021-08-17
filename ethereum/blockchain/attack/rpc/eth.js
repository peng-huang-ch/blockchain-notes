const { request } = require('./request');

// https://geth.ethereum.org/docs/rpc/ns-eth
async function eth_mining(uri) {
  return request(uri, 'eth_mining');
}

async function eth_syncing(uri) {
  return request(uri, 'eth_syncing');
}

async function eth_coinbase(uri) {
  return request(uri, 'eth_coinbase');
}

async function eth_getTransactionCount(uri, address) {
  return request(uri, 'eth_getTransactionCount', [address, 'latest']);
}

async function eth_getTransactionByHash(uri, hash) {
  return request(uri, 'eth_getTransactionByHash', [hash]);
}

async function eth_signTransaction(uri, tx) {
  return request(uri, 'eth_signTransaction', [tx]);
}

async function eth_sendRawTransaction(uri, raw) {
  return request(uri, 'eth_sendRawTransaction', [raw]);
}

exports.eth_mining = eth_mining;
exports.eth_syncing = eth_syncing;
exports.eth_coinbase = eth_coinbase;
exports.eth_getTransactionCount = eth_getTransactionCount;
exports.eth_getTransactionByHash = eth_getTransactionByHash;
exports.eth_signTransaction = eth_signTransaction;
exports.eth_sendRawTransaction = eth_sendRawTransaction;
