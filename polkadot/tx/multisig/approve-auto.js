const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { encodeMultiAddress, sortAddresses } = require('@polkadot/util-crypto');
const BN = require('bn.js');

async function main() {
  const wsProvider = new WsProvider('wss://api.clover.finance');
  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

  // 1. Define relevant constants
  formatBalance.setDefaults({
    unit: 'CLV',
    decimals: 18,
  });

  // 2. Define relevant constants
  const ss58Format = 42;
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const AMOUNT_TO_SEND = new BN('1000');
  const STORE_CALL = false;
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts
  const keyring = new Keyring({ ss58Format: ss58Format, type: 'sr25519' });
  const alice = keyring.addFromUri(PHRASE + '//polkadot');
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  const dest = alice;
  const signer = aaron;

  const addresses = [
    alice.address, // addresses[0]
    aaron.address, // addresses[1]
    phcc.address, // addresses[2]
  ];

  const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, ss58Format);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer.address),
    ss58Format
  );
  console.log('MULTISIG  : ', MULTISIG);

  // 4. Send 1 WND to dest account
  const call = api.tx.balances.transfer(dest.address, AMOUNT_TO_SEND);
  // const call_method_hash = call.method.hash;
  // const call_method_hex = call.method.toHex();
  console.log('call method hex -: ', call.method.toHex());
  const call_method_hash = hexToU8a('0x65222f6881191b6640f1e2609dc4c72b8a5cb9aded400f6e7f2b6b9c2997d97b');
  const call_method_hex = '0x07000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05a10f';

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
