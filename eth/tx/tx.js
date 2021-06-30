const Web3 = require('web3');

const provider = 'https://mainnet.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const web3 = new Web3(provider);

async function main() {
  const transactionConfig = {
    // ...rebuildTx,
    value: 0,
    gasPrice: 100,
    to: '0xdecb5eeaf7c502949da566111db38dff34195470',
    data: '0xa9059cbb0000000000000000000000005f560610a5f64834fb2c40402226745c32ec9f85000000000000000000000000000000000000000000000000000000e8d4a51000',
  };
  // transactionConfig.nonce = undefined;
  console.log(transactionConfig);
  const gasLimit = await web3.eth.estimateGas(transactionConfig);
  console.log('gasLimit', gasLimit);
}

main().then().catch(console.error);
