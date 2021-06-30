const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, formatBalance } = require('@polkadot/util');
const BN = require('bn.js');
const { createKeyMulti, encodeAddress, sortAddresses, encodeMultiAddress } = require('@polkadot/util-crypto');

const sleep = async (ns) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ns);
  });
};

async function fund() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  await sleep(1000 * 1);

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

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
  const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
  const alice = keyring.addFromUri(PHRASE + '//polkadot');
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  const addresses = [
    alice.address, // addresses[0]
    aaron.address, // addresses[1]
    phcc.address, // addresses[2]
  ];

  // const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, SS58PREFIX);
  const MULTISIG = '5F4rLDtniR4Mod3WSxNgwH9NmCyFz57tsgWi7eRsBMH7cuYb';
  console.log(`Multisig Address: ${MULTISIG}\n`);

  // 4. Send 2 WND to multisig account
  const txHash = await api.tx.balances.transfer(MULTISIG, AMOUNT_TO_SEND).signAndSend(alice);
  console.log(`Sending ${displayAmount} from ${alice.address} to ${MULTISIG}`);
  console.log(`transfer tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}
async function main() {
  return fund();
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
