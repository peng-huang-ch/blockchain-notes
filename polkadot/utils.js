// Required imports
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider } = require('@polkadot/api');

async function api() {
  // Initialise the provider to connect to the local node
  const provider = new WsProvider('wss://api.clover.finance');

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider, types: cloverTypes });

  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([api.rpc.system.chain(), api.rpc.system.name(), api.rpc.system.version()]);

  console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);
  return api;
}

exports.api = api;

const sleep = async (ns) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ns);
  });
};

exports.sleep = sleep;
