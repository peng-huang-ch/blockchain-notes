const Web3 = require('web3');
const Method = require('web3-eth/node_modules/web3-core-method');

const abi = require('../abis/erc20.json');
const web3 = new Web3('https://mainnet-prod.invault.space/eth-archive');
const address = '0x5d9fe07813a260857cf60639dac710ebb9531a20';

async function main() {
  var blockNumber = 12000001;
  const method = web3.eth.getBalance; //(address, blockNumber);
  var balance = await method(address, blockNumber);
  var batch = new web3.BatchRequest();

  console.log('balance', balance);
  const p = new Promise((resolve, reject) => {
    const req = method.request(address, blockNumber, (e, result) => {
      console.log('getBalance request', e, result);
      if (e) return reject(e);
      resolve(result);
    });
    batch.add(req);
  });
  batch.execute();
  var promises = [p];
  console.log('batch 1 : ');
  var ret = await Promise.all(promises);
  console.log('batch 2 : ', ret);
}

main().catch(console.error);
