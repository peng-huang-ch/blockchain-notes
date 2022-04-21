const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance } = require('@polkadot/util');
const { createKeyMulti, encodeAddress, sortAddresses, encodeMultiAddress } = require('@polkadot/util-crypto');
const { alice, aaron, phcc, provider } = require('../../private');

async function send() {

  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  // 1. Use formatBalance to display amounts
  formatBalance.setDefaults({
    unit: 'CLV',
    decimals: 18,
  });

  // 2. Define relevant constants
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const AMOUNT_TO_SEND = new BN('1000000000000000000');
  const displayAmount = formatBalance(AMOUNT_TO_SEND);
  const depositBase = api.consts.multisig.depositBase;
  const depositFactor = api.consts.multisig.depositFactor;

  // 3. Initialize accounts
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');
  // const peng = keyring.addFromUri(PENG + '//polkadot');

  // 4. API calls - info is necessary for the timepoint
  const call = api.tx.balances.transfer(aaron.address, AMOUNT_TO_SEND);
  const info = await api.query.multisig.multisigs(MULTISIG, call.method.hash);

  // 5. Set the timepoint
  // If this IS the first approval, then this must be None (null)
  const TIME_POINT = null;
  // If this is NOT the first approval, then it must be Some,
  // with the timepoint (block number and transaction index)
  // of the first approval transaction :
  // const TIME_POINT = info.unwrap().when;

  // 6. approveAsMulti
  const txHash = await api.tx.multisig.approveAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT).signAndSend(alice);
  console.log(`depositBase   : ${depositBase}`);
  console.log(`depositFactor : ${depositFactor}`);
  console.log(`Sending ${displayAmount} from ${alice.address} to ${MULTISIG}`);
  console.log(`Required values  : approveAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`Submitted values : approveAsMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call.method.hash}, ${MAX_WEIGHT})\n`);
  console.log(`approveAsMulti tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

async function auto() {
  // 1. Define relevant constants
  const INDEX = 0;
  const THRESHOLD = 2;
  const SS58PREFIX = 42;
  const AMOUNT_TO_SEND = 100;

  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const addresses = [
    alice.address, // addresses[0]
    aaron.address, // addresses[1]
    phcc.address, // addresses[2]
  ];

  // 3. Create Multisig (with optional SS58PREFIX)
  const multisig = encodeMultiAddress(addresses, THRESHOLD, SS58PREFIX);
  console.log(`Multisig Address: ${multisig}\n`);

  // 4. Filter out the sender
  const otherSignatories = addresses.filter((who) => who !== addresses[INDEX]);
  const otherSignatoriesSorted = sortAddresses(otherSignatories);
  console.log(`Other Signatories: ${JSON.stringify(otherSignatoriesSorted, null, 2)}\n`);

  // 4. Define an array of transactions
  const transactions = [
    api.tx.balances.transfer(aaron.address, AMOUNT_TO_SEND), //
    api.tx.balances.transfer(phcc.address, AMOUNT_TO_SEND), //
  ];

  // 5. Batch sending 1 WND to the other addresses
  // This is necessary to be able to sign and send transactions
  // with those accounts.
  const txHash = await api.tx.utility.batch(transactions).signAndSend(alice);
  console.log(`Sending 1 WND from ${alice.address} to ${otherSignatories}`);
  console.log(`transfer tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

function createMultiAddress(addresses, threshold, SS58Prefix = 42) {
  const multiAddress = createKeyMulti(addresses, threshold);
  // Convert byte array to SS58 encoding.
  const Ss58Address = encodeAddress(multiAddress, SS58Prefix);
  return Ss58Address;
}

async function main() {
  return auto();
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
