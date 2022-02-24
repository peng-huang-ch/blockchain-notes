const assert = require('assert');
const BigNumber = require('bignumber.js');
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance, u8aToHex, hexToU8a } = require('@polkadot/util');
const { sortAddresses, encodeMultiAddress } = require('@polkadot/util-crypto');
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
  const SS58PREFIX = 42;
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const MAX_ADDITIONAL = new BigNumber(0.1).shiftedBy(18).toString();;

  const displayAmount = formatBalance(MAX_ADDITIONAL, { forceUnit: 'clv', withSi: true });
  const depositBase = api.consts.multisig.depositBase;
  const depositFactor = api.consts.multisig.depositFactor;

  // 3. Initialize accounts
  const dest = alice;
  const signer = alice;

  const addresses = [
    alice.address, // addresses[0]
    aaron.address, // addresses[1]
    phcc.address, // addresses[2]
  ];

  const MULTISIG = encodeMultiAddress(addresses, THRESHOLD, SS58PREFIX);
  const otherSignatories = sortAddresses(
    addresses.filter((who) => who !== signer.address),
    SS58PREFIX
  );

  console.log('MULTISIG     : ', MULTISIG);
  console.log('addresses    : ', addresses);
  console.log('quantity     : ', MAX_ADDITIONAL);

  const { data } = await api.query.system.account(signer.address);
  const { free: balance, miscFrozen: frozen } = data;
  console.log('data', data.toHuman());
  console.log(balance.toHuman());
  console.log(frozen.toHuman());

  // 4. API calls - info is necessary for the timepoint
  const call = api.tx.staking.bondExtra(MAX_ADDITIONAL)
  const call_method_hash = call.method.hash;
  const call_method_hex = call.method.toHex();
  console.log('call method hash : ', u8aToHex(call_method_hash));
  console.log('call method hex  : ', call_method_hex);
  // assert.strictEqual(call_method_hash, '0x20c1b27f3f9c4ad76eb8f9a7c16f98d72808e8398a0a25d533edb75b9f24066b', 'call hash should be equal')
  // 5. Set the timepoint
  // If this IS the first approval, then this must be None (null)
  // const TIME_POINT = null;
  // If this is NOT the first approval, then it must be Some,
  // with the timepoint (block number and transaction index)
  // of the first approval transaction :

  const info = await api.query.multisig.multisigs(MULTISIG, call_method_hash);
  if (info.isSome) {
    throw new Error('should be the first approval.');
  }

  const TIME_POINT = null;

  console.log('approve as multi', THRESHOLD, otherSignatories, MAX_WEIGHT);
  // 6. approveAsMulti
  const tx = api.tx.multisig.approveAsMulti(
    THRESHOLD,
    otherSignatories, //
    TIME_POINT,
    call_method_hash,
    MAX_WEIGHT
  );

  const { nonce } = await api.query.system.account(signer.address);

  const signedBlock = await api.rpc.chain.getBlock();

  const options = {
    blockHash: signedBlock.block.header.hash,
    era: api.createType('ExtrinsicEra', {
      current: signedBlock.block.header.number,
      period: 10,
    }),
    nonce,
  };

  console.log('nonce', nonce.toNumber());

  // // create the payload
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

  console.log('sender : ', signer.address);
  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  tx.addSignature(signer.address, placeholder, payload.toPayload());

  // const { signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  // tx.addSignature(signer.address, signature, payload.toPayload());

  const serialized = tx.toHex();
  console.log('serialized', serialized);

  const signatureHash = payload.toRaw().data;
  console.log('signatureHash  : ', signatureHash);

  const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));
  console.log('signature      : ', signature);

  const hex = serialized.replace(placeholder.slice(2), signature.slice(2));
  const extrinsic = api.createType('Extrinsic', hex);
  const extrinsicHex = extrinsic.toHex();

  console.log('extrinsicHex', extrinsicHex);


  const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
  console.log(`txHash :  ${txHash}`);

  console.log(`depositBase   : ${depositBase}`);
  console.log(`depositFactor : ${depositFactor}`);
  console.log(`Signer address   : ${signer.address}`);
  console.log(`Sending ${displayAmount} from ${dest.address} to ${MULTISIG}`);
  console.log(`Required values  : approveAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`Submitted values : approveAsMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call.method.hash}, ${MAX_WEIGHT})\n`);
  console.log(`approveAsMulti tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main().then().catch(console.error).finally(process.exit);

/*
points:
  1. the signer should have enough balance to charge the tx fee.
  2. the signer should reverse some token.
  3. call_method_hash should be the call method hash, not the call method to hex.
demo link: https://clover-testnet.subscan.io/extrinsic/0x98b5d0302cdb6990276034eceff498c8c84473a571e8c9c863829b9c4342fc8d
events:
  1. balances(Reserved)
  2. multisig(NewMultisig)
  3. treasury(Deposit)
 */
