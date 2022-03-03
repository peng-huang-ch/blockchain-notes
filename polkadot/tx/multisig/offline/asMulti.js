const BigNumber = require('bignumber.js');
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { encodeMultiAddress, sortAddresses } = require('@polkadot/util-crypto');
const { alice, aaron, phcc, provider } = require('../../../private');

async function main() {
  // await cryptoWaitReady();
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
  const AMOUNT_TO_SEND = new BigNumber(0.1).shiftedBy(18).toString();;
  const STORE_CALL = false;
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts
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
  var call_method_hash = call.method.hash.toHex();
  var call_method_hex = call.method.toHex();
  console.log('call method hash : ', call_method_hash);
  console.log('call method hex  : ', call_method_hex);

  var call_method_hash = '0x851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42';
  var call_method_hex = '0x09011300008a5d78456301'
  const maxWeight = await call.paymentInfo(signer.address);
  console.log('maxWeight', maxWeight);

  // 5. Retrieve and unwrap the time point
  const info = await api.query.multisig.multisigs(MULTISIG, call_method_hash);
  if (!info.isSome) {
    throw new Error('this is NOT the first approval, should it must be Some.');
  }

  const TIME_POINT = info.unwrap().when;
  console.log('TIME_POINT       : ', TIME_POINT.toHuman());
  return;
  // 6. Send asMulti transaction
  // Now the multisig call that was initiated by the Alice account
  // to send 1 WND to Charlie can be approved by Bob.
  // Since threshold is set to 2, this approval should dispatch the call
  // (2 approvals received)
  const tx = api.tx.multisig.asMulti(
    THRESHOLD,
    otherSignatories,
    TIME_POINT,
    call_method_hex,
    STORE_CALL,
    MAX_WEIGHT //
  );
  return;
  const { weight } = await tx.paymentInfo(signer.address);
  console.log('weight', weight.toNumber());

  const { nonce } = await api.query.system.account(signer.address);

  const payload = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce: nonce.toNumber(),
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: signer.address,
  });

  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  tx.addSignature(signer.address, placeholder, payload.toPayload());

  const serialized = tx.toHex();
  console.log('serialized     : ', serialized);

  const signatureHash = payload.toRaw().data;
  console.log('signatureHash  : ', signatureHash);

  const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));
  console.log('signature      : ', signature);

  const hex = serialized.replace(placeholder.slice(2), signature.slice(2));
  const extrinsic = api.createType('Extrinsic', hex);
  const extrinsicHex = extrinsic.toHex();

  console.log('signer           : ', signer.address);
  console.log('nonce            : ', nonce.toNumber());
  console.log('signatureHash    : ', signatureHash);
  console.log('serialized       : ', serialized);
  console.log('signature        : ', signature);
  console.log('extrinsicHex     : ', extrinsicHex);
  return;
  const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
  console.log(`txHash :  ${txHash}`);
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
