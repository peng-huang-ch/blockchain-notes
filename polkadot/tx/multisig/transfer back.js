const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance, u8aToHex, hexToU8a } = require('@polkadot/util');
const { sortAddresses, encodeMultiAddress } = require('@polkadot/util-crypto');
const BN = require('bn.js');

const sleep = async (ns) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ns);
  });
};

async function main() {
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
  const SS58PREFIX = 42;
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const AMOUNT_TO_SEND = new BN('1000');
  const displayAmount = formatBalance(AMOUNT_TO_SEND, { forceUnit: 'clv', withSi: true });
  const depositBase = api.consts.multisig.depositBase;
  const depositFactor = api.consts.multisig.depositFactor;

  // 3. Initialize accounts
  const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
  const alice = keyring.addFromUri(PHRASE + '//polkadot');
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');

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
  console.log('MULTISIG  : ', MULTISIG);

  // 4. API calls - info is necessary for the timepoint
  const call = api.tx.balances.transfer(dest.address, AMOUNT_TO_SEND);
  const call_hash = call.method.hash;
  console.log('call method hash : ', u8aToHex(call_hash));
  console.log('call method hex  : ', call.method.toHex());

  // 5. Set the timepoint
  // If this IS the first approval, then this must be None (null)
  // const TIME_POINT = null;s
  // If this is NOT the first approval, then it must be Some,
  // with the timepoint (block number and transaction index)
  // of the first approval transaction :
  const info = await api.query.multisig.multisigs(MULTISIG, call_hash);
  if (info.isSome) {
    throw new Error('should be the first approval.');
  }
  const TIME_POINT = null;
  console.log('TIME_POINT    : ', TIME_POINT);

  // 6. approveAsMulti
  const tx = await api.tx.multisig.approveAsMulti(
    THRESHOLD,
    otherSignatories, //
    TIME_POINT,
    call_hash,
    MAX_WEIGHT
  );

  // .signAndSend(signer);

  const { nonce } = await api.query.system.account(signer.address);

  const blocks = 50;

  const signedBlock = await api.rpc.chain.getBlock();

  const options = {
    blockHash: signedBlock.block.header.hash,
    era: api.createType('ExtrinsicEra', {
      current: signedBlock.block.header.number,
      period: blocks,
    }),
    nonce,
  };
  // const blockNumber = signedBlock.block.header.number;
  // const payload = api.createType('SignerPayload', {
  //   genesisHash: api.genesisHash,
  //   runtimeVersion: api.runtimeVersion,
  //   version: api.extrinsicVersion,
  //   address: MULTISIG,
  //   blockNumber,
  //   method: tx.method,
  //   ...options,
  // });

  // // create the payload
  const payload = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
  });

  // const { signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  tx.addSignature(signer.address, '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001', payload.toPayload());

  // tx.addSignature(signer.address, signature, payload.toPayload());

  const serialized = tx.toHex();
  const signatureHash = payload.toRaw().data.slice(2);
  console.log('serialized', serialized);
  console.log('signatureHash', signatureHash);

  const signature = u8aToHex(signer.sign(hexToU8a(payload.toRaw().data), { withType: true }));
  console.log('signature', signature.length);

  const placeholder = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  const hex = serialized.replace(placeholder, signature.toString().slice(2));
  console.log('hex', hex);
  const extrinsic = api.createType('Extrinsic', hex);
  const txHash = await api.rpc.author.submitExtrinsic(extrinsic);

  // tx.addSignature(alice.address, signature, payload.toPayload());

  // const txHash = await tx.send();
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
  3. call_hash should be the call method hash, not the call method to hex.
demo link: https://clover-testnet.subscan.io/extrinsic/0x98b5d0302cdb6990276034eceff498c8c84473a571e8c9c863829b9c4342fc8d
events:
  1. balances(Reserved)
  2. multisig(NewMultisig)
  3. treasury(Deposit)
 */
