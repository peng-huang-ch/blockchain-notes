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
  const AMOUNT_TO_SEND = new BigNumber(0.1).shiftedBy(18).toString();;
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts
  const dest = alice;
  const signer = alice; // should be the approve transaction signer

  console.log('Signer address : ', signer.address);

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

  // 4. Send 1 WND to alice account
  const call = api.tx.balances.transfer(dest.address, AMOUNT_TO_SEND);
  var call_method_hash = call.method.hash;
  var call_method_hex = call.method.toHex();
  console.log('call method hash : ', u8aToHex(call_method_hash));
  console.log('call method hash : ', call_method_hash.toHex());
  console.log('call method hex  : ', call_method_hex);
  var call_method_hash = "0x851f64282d0567109a3cd1271eda7b8d8de1ba3a8f8458e53a64d1a19b196b42";
  var call_method_hex = "0x09011300008a5d78456301";

  // 5. Retrieve and unwrap the timepoint
  const info = await api.query.multisig.multisigs(MULTISIG, call_method_hash);
  if (!info.isSome) {
    throw new Error('do not found the time point.');
  }
  const TIME_POINT = info.unwrap().when;
  console.log('TIME_POINT    : ', TIME_POINT.toString());
  return;
  // 6. Cancel asMulti transaction
  const tx = api.tx.multisig.cancelAsMulti(
    THRESHOLD,
    otherSignatories,
    TIME_POINT,
    call_method_hash //
  );

  // const tx_hash = await tx.signAndSend(signer);
  // console.log('tx', tx_hash.toHuman());

  const { nonce } = await api.query.system.account(signer.address);
  // // create the payload
  const signedBlock = await api.rpc.chain.getBlock();
  const options = {
    blockHash: signedBlock.block.header.hash,
    era: api.createType('ExtrinsicEra', {
      current: signedBlock.block.header.number,
      period: 60,
    }),
    nonce,
  };
  const payload = api.createType('SignerPayload', {
    method: tx.method,
    nonce: nonce.toNumber(),
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: signer.address,
    ...options,
  });

  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  tx.addSignature(signer.address, placeholder, payload.toPayload());

  const serialized = tx.toHex();
  const signatureHash = payload.toRaw().data;
  const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));

  console.log('sender           : ', signer.address);
  console.log('nonce            : ', nonce.toNumber());
  console.log('signatureHash    : ', signatureHash);
  console.log('serialized       : ', serialized);
  console.log('signature        : ', signature);

  const hex = serialized.replace(placeholder.slice(2), signature.slice(2));
  const extrinsic = api.createType('Extrinsic', hex);
  const extrinsicHex = extrinsic.toHex();

  console.log('extrinsicHex     : ', extrinsicHex);

  const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
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
