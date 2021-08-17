const axios = require('axios');

async function makeRequest({ uri, method, params }) {
  let options = {
    url: uri,
    method: 'POST',
    data: {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    },
  };
  return axios(options).then((response) => {
    const { error, result } = response.data;
    if (error) {
      throw error;
    }
    return result;
  });
}

async function getTransactionCount(uri, address) {
  return await makeRequest({
    uri,
    method: 'eth_getTransactionCount',
    params: [address, 'latest'],
  });
}

async function getGasPrice(uri) {
  return await makeRequest({
    uri,
    method: 'eth_gasPrice',
    params: [],
  });
}

async function estimateGas(uri, rawTx) {
  return await makeRequest({
    uri,
    method: 'eth_estimateGas',
    params: [rawTx],
  });
}

async function getNextSequenceId(uri, address) {
  return makeRequest({
    uri,
    method: 'eth_call',
    params: [
      {
        to: address,
        data: '0xa0b7967b',
      },
      'latest',
    ],
  });
}

async function sendTx(uri, rawTx) {
  return await makeRequest({
    uri,
    method: 'eth_estimateGas',
    params: [rawTx],
  });
}
