const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance } = require('@polkadot/util');
const BN = require('bn.js');
const { alice, aaron, phcc, provider } = require('../../private');

async function main() {
  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  // 1. Define relevant constants
  formatBalance.setDefaults({
    unit: 'CLV',
    decimals: 18,
  });

  // 2. Define relevant constants
  const THRESHOLD = 2;
  const SS58PREFIX = 42;
  const AMOUNT_TO_SEND = new BN('10000000000000000');
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts

  const addresses = [
    alice.address, // addresses[0]
    aaron.address, // addresses[1]
    phcc.address, // addresses[2]
  ];

  const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, SS58PREFIX);
  console.log(`Multisig Address: ${MULTISIG}\n`);

  // 4. Send 2 WND to multisig account
  const txHash = await api.tx.balances.transfer(MULTISIG, AMOUNT_TO_SEND).signAndSend(alice);
  console.log(`Sending ${displayAmount} from ${alice.address} to ${MULTISIG}`);
  console.log(`transfer tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
