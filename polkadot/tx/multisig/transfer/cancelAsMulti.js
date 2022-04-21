const BigNumber = require('bignumber.js');
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance, u8aToHex, hexToU8a } = require('@polkadot/util');
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
  const AMOUNT_TO_SEND = new BigNumber(0.1).shiftedBy(18).toString();
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts
  const dest = alice;
  const signer = alice; // should be the approve transaction signer
  console.log('Signer address : ', signer.address);

  const addresses = [
    alice.address, // signer should be included
    aaron.address,
    phcc.address,
  ];

  const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, ss58Format);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer.address),
    ss58Format
  );
  console.log('MULTISIG  : ', MULTISIG);

  // 4. Send 1 WND to alice account
  const call = api.tx.balances.transfer(dest.address, AMOUNT_TO_SEND);
  var call_method_hash = call.method.hash;
  var call_method_hex = call.method.toHex();

  // 5. Retrieve and unwrap the timepoint
  const info = await api.query.multisig.multisigs(MULTISIG, call.method.hash);
  if (!info.isSome) {
    throw new Error('do not found the time point.');
  }
  const TIME_POINT = info.unwrap().when;
  console.log('TIME_POINT    : ', TIME_POINT);

  // 6. Cancel asMulti transaction
  const tx = api.tx.multisig.cancelAsMulti(
    THRESHOLD,
    otherSignatories,
    TIME_POINT,
    call.method.hash,
  );

  const txHash = await tx.signAndSend(signer);
  console.log(`txHash :  ${txHash}`);

  console.log(`Sending ${displayAmount} from ${MULTISIG} to ${alice.address}`);
  console.log(`Signer address   : ${signer.address}`);
  console.log(`Required values  : cancelAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash)`);
  console.log(`Submitted values : cancelAsMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call.method.hash})\n`);
  console.log(`cancelAsMulti tx : https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main().catch(console.error).finally(process.exit);

/*
points:
  1. the signer should have enough balance to charge the tx fee.
  2. signer should be the approve tx owner(same signer).
  3. call_hash should be the call method hash, not the call method to hex.
demo link: https://clover-testnet.subscan.io/extrinsic/0x2f157ebf8d005421fd4a94a3ac96fcc95eb50bae6515ff6055537bdf672fca64?tab=event
events:
  1. balances(Unreserved)
  2. multisig(MultisigCancelled)
  3. treasury(Deposit)
 */
