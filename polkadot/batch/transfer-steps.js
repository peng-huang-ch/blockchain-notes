require('dotenv').config();
const { strict: assert } = require('assert');
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { PHRASE, AARON, PHCC } = process.env;

console.log('process.env : ', process.env)
async function main () {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
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
  const AMOUNT_TO_SEND = '10000';
  const displayAmount = formatBalance(AMOUNT_TO_SEND);

  // 3. Initialize accounts
  const keyring = new Keyring({ ss58Format: ss58Format, type: 'ecdsa' });
  const alice = keyring.addFromUri(PHRASE + '//polkadot');
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  const signer = alice;
  const dest = alice;


  // 4. Send 1 WND to dest account
  const call = api.tx.balances.transfer(dest.address, AMOUNT_TO_SEND);

  console.log('sender address   : ', alice.address);
  console.log('dest   address   : ', dest.address);
  console.log('call method hex -: ', call.method.toHex());
  const call_method_hash = call.method.hash;
  const call_method_hex = call.method.toHex();

  console.log('call method hash : ', call_method_hash.toHuman());
  console.log('call method hex  : ', call_method_hex);

  const txs = Array.from(Array(2).keys()).map(() => call_method_hex);

  // construct the batch and send the transactions
  const online = api.tx.utility.batch(txs);
  const offline = api.tx.utility.batch(txs);
  console.log('online hex         : ', online.method.toHex());
  console.log('offline hex        : ', offline.method.toHex());
  console.log('online eq offline  : ', online.method.toHex() === offline.method.toHex());

  const { nonce } = await api.query.system.account(signer.address);
  console.log('nonce    : ', nonce.toNumber());

  const period = 50;
  const signedBlock = await api.rpc.chain.getBlock();
  const currentHeight = signedBlock.block.header.number;
  const blockHash = signedBlock.block.header.hash.toHex();
  const era = api.createType('ExtrinsicEra', { current: currentHeight, period });

  const options = {
    method: online.method.toHex(),
    nonce: nonce.toNumber(),
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,

    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: signer.address,

  }

  Object.assign(options, { blockHash, blockNumber: currentHeight, era: era.toHex() });

  const payload = api.createType('SignerPayload', options);

  const { signature: online_signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  console.log('online signature   : ', online_signature);
  online.addSignature(signer.address, online_signature, payload.toPayload());
  const online_serialized = online.toHex();
  console.log('online serialized  : ', online_serialized);

  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  offline.addSignature(signer.address, placeholder, payload.toPayload());

  const { data } = payload.toRaw();
  console.log('offline data       : ', data);
  console.log('offline data length: ', data.length);

  var signatureHash = hexToU8a(data).length > 256 ? api.registry.hash(data).toHex() : data;
  const signatureHashU8a = hexToU8a(signatureHash);
  const signatureU8a = signer.sign(signatureHashU8a, { withType: true })
  const offline_signature = u8aToHex(signatureU8a);

  console.log('offline signature  : ', offline_signature);

  const offline_hex = offline.toHex();
  const offline_serialized = offline_hex.replace(placeholder.slice(2), offline_signature.slice(2));
  console.log('online serialized', offline_serialized);

  console.log('--signature--');
  console.log('online       : ', online_signature);
  console.log('offline      : ', offline_signature);
  console.log('eq           : ', online_signature === offline_signature);
  assert(online_signature === offline_signature, 'signature should be the same');

  console.log('--serialized--');
  console.log('online       : ', online_serialized);
  console.log('offline      : ', offline_serialized);

  assert(online_serialized === offline_serialized, 'serialized should be the same');
  const extrinsic = api.createType('Extrinsic', online_serialized);
  const extrinsicHex = extrinsic.toHex();

  console.log(`Signer address   : ${signer.address}`);
  console.log('extrinsicHex', extrinsicHex);

  return;

  var txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
  console.log(`txHash :  ${txHash}`);
  console.log(`Sending ${displayAmount} from ${signer.address} to ${dest.address}`);
  console.log(`Signer address   : ${signer.address}`);
  console.log(`Required values  : asMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`asMulti tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main().catch(console.error).finally(process.exit);