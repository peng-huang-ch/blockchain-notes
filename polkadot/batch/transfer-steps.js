const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { blake2AsU8a } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');

async function main() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const keyring = new Keyring({ ss58Format: 42, type: 'ecdsa' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  const signer = alice;
  const dest = aaron;

  console.log('alice: ', alice.address);
  console.log('aaron: ', aaron.address);

  //   const AMOUNT = new BigNumber(1.1).shiftedBy(18).toString();

  const txs = [
    api.tx.balances.transfer(dest.address, 12345), //
    api.tx.balances.transfer(dest.address, 22345),
  ];

  // construct the batch and send the transactions
  const tx = api.tx.utility.batch(txs.map((tx) => tx.method.toHex()));

  // nonce
  const { nonce } = await api.query.system.account(signer.address);
  console.log('nonce    : ', nonce.toNumber());

  // payload
  const payload = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce: nonce.toNumber(),
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: signer.address,
  });

  // console.log(' tx.toHex()        : ', tx.toHex());
  // console.log(' tx.method.toHex() : ', tx.method.toHex());

  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  // const { signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  tx.addSignature(signer.address, placeholder, payload.toPayload());

  const serialized = tx.toHex();
  console.log('serialized', serialized);

  const signatureHash = payload.toRaw().data;
  console.log('signatureHash  : ', signatureHash);

  const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));
  console.log('signature      : ', signature);

  const hex = serialized.replace(placeholder.slice(2), signature.slice(2));
  const extrinsic = api.createType('Extrinsic', hex);
  const extrinsicHex = extrinsic.toHex();

  console.log(`Signer address   : ${signer.address}`);
  console.log('extrinsicHex', extrinsicHex);
  // return;

  const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
  console.log(`txHash :  ${txHash}`);
  console.log(`Signer address   : ${signer.address}`);
  console.log(`Batch tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
