const { request } = require('./request');

async function miner_stop(uri) {
  return request(uri, 'miner_stop');
}

//
async function miner_start(uri, number) {
  return request(uri, 'miner_start', number ? [number] : []);
}

async function miner_stop(uri) {
  return request(uri, 'miner_stop');
}

exports.miner_start = miner_start;
exports.miner_stop = miner_stop;
