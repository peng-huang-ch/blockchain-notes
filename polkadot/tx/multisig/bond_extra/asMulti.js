const assert = require('assert');
const BigNumber = require('bignumber.js');
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { encodeMultiAddress, sortAddresses } = require('@polkadot/util-crypto');
const { alice, aaron, phcc, provider } = require('../../../private');

async function main() {
  const wsProvider = new WsProvider(provider);
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  // 1. Define relevant constants
  formatBalance.setDefaults({
    unit: 'CLV',
    decimals: 18,
  });

  // 2. Define relevant constants
  const ss58Format = 42;
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const MAX_ADDITIONAL = new BigNumber(0.1).shiftedBy(18).toString();;
  const STORE_CALL = false;
  const displayAmount = formatBalance(MAX_ADDITIONAL);

  // 3. Initialize accounts
  const dest = alice;
  const signer = aaron;

  const addresses = [
    alice.address, // alice
    aaron.address, // aaron
    phcc.address,
  ];

  const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, ss58Format);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer.address),
    ss58Format
  );
  console.log('MULTISIG  : ', MULTISIG);

  // 4. bond extra
  const call = api.tx.staking.bondExtra(MAX_ADDITIONAL)
  const call_method_hash = call.method.hash;
  const call_method_hex = call.method.toHex();

  console.log('call method hash : ', u8aToHex(call_method_hash));
  console.log('call method hex  : ', call_method_hex);

  // 5. Retrieve and unwrap the time point
  const info = await api.query.multisig.multisigs(MULTISIG, call_method_hash);
  if (!info.isSome) {
    throw new Error('this is NOT the first approval, should it must be Some.');
  }
  const TIME_POINT = info.unwrap().when;
  console.log('TIME_POINT    : ', TIME_POINT.toHuman());

  // 6. Send asMulti transaction
  // Now the multisig call that was initiated by the Alice account
  // to send 1 WND to Charlie can be approved by Bob.
  // Since threshold is set to 2, this approval should dispatch the call
  // (2 approvals received)
  const txHash = await api.tx.multisig
    .asMulti(
      THRESHOLD,
      otherSignatories,
      TIME_POINT,
      call_method_hex,
      STORE_CALL,
      MAX_WEIGHT //
    )
    .signAndSend(signer);
  console.log(`Sending ${displayAmount} from ${MULTISIG} to ${dest.address}`);
  console.log(`Signer address   : ${signer.address}`);
  console.log(`Required values  : asMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`Submitted values : asMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call_method_hash}, ${MAX_WEIGHT})\n`);
  console.log(`asMulti tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main().catch(console.error).finally(process.exit);

/*
points:
  1. the signer should have enough balance to charge the tx fee.
  2. call_hash should be the call method call method to hex, not the call method hash.
demo link: https://clover-testnet.subscan.io/extrinsic/0x45ba69baab1ecf360e984eb95f40f3541784d8b89ef8c260dde2d2916b0a36c1
events:
  1. balances(Unreserved)
  2. balances(Transfer)
  3. multisig(MultisigExecuted)
  4. treasury(Deposit)
 */
