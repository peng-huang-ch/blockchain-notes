require('dotenv').config();
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { blake2AsU8a } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');
const { PHRASE, AARON } = process.env;

async function main () {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });


  const keyring = new Keyring({ ss58Format: 42, type: 'ecdsa' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  const signer = alice;
  const dest = aaron;

  const AMOUNT = new BigNumber(1.1).shiftedBy(18).toString();

  console.log('alice: ', alice.address);
  console.log('aaron: ', aaron.address);

  const result = await api.query.system.account(signer.address);
  const { nonce } = result;

  const tx = api.tx.balances.transfer(dest.address, AMOUNT);

  //   const txhash = await tx.signAndSend(signer);
  //   console.log('txHash', u8aToHex(txhash));

  return;
  // const txHash_1 = await tx.send();
  // console.log('txHash_1', txHash_1);
  // return;

  // create the payload
  const wrapper = api.createType('SignerPayload', {
    method: tx.method.toHex(),
    nonce,
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    address: signer.address,
  });

  // const txHash = await tx.signAsync(alice.address);
  console.log('signer.address', signer.address);
  // tx.signFake(signer.address, {
  //   method: tx.method.toHex(),
  //   nonce,
  //   genesisHash: api.genesisHash,
  //   blockHash: api.genesisHash,
  //   runtimeVersion: api.runtimeVersion,
  //   version: api.extrinsicVersion,
  //   address: signer.address,
  //   signedExtensions: api.registry.signedExtensions,
  //   signer,
  // });

  // const fakeSignature = u8aToHex(tx.signature);
  // console.log('extra.signature', fakeSignature);

  const { signature } = api.createType('ExtrinsicPayload', wrapper.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  console.log('wrapper.toRaw().data', wrapper.toRaw().data);
  const s = u8aToHex(alice.sign(wrapper.toRaw().data), { withType: true });
  console.log('s              : ', s);
  console.log('s === signature: ', s === signature);

  console.log('signature      : ', signature);
  const message = wrapper.toRaw().data;
  console.log('message        : ', message);
  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  console.log('placeHolder -- : ', placeholder);

  tx.addSignature(signer.address, placeholder, wrapper.toPayload());

  // const hash = await tx.send();
  // console.log('txhash : ', u8aToHex(hash));
  // return;

  // const xxxx = api.createType('ExtrinsicPayload', blake2AsU8a(wrapper.toU8a(true)), { version: api.extrinsicVersion });

  // console.log('sign--hash', blake2AsU8a(wrapper.toU8a(true)));

  // const { signature } = wrapper.sign(alice);

  // tx.addSignature(signer.address, '0x4500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001', wrapper.toPayload());

  const serialized = tx.toHex();
  console.log('serialized     : ', serialized);

  const realSerialized = serialized.replace(placeholder.slice(2), signature.slice(2));
  console.log('real serialized: ', realSerialized);

  const extrinsic = api.createType('Extrinsic', realSerialized);
  console.log('extrinsic toHex', extrinsic.toHex());
  extrinsic._raw.signature.nonce = 100;

  console.log('nonce', extrinsic.nonce);
  console.log('extrinsic', extrinsic);
  console.log('signer', extrinsic._raw.signer);
  console.log('signature', extrinsic._raw.signature);
  console.log('era', extrinsic._raw.era);
  console.log('nonce', extrinsic._raw.nonce);
  console.log('tip', extrinsic._raw.tip);
  // const txHash = await api.rpc.author.submitExtrinsic('0x31028400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202a00f352c3d41845cdb35ef4f4d57938170fa4f45004328a31dc77311dca165667d2346ca4192cda605769ef1ccec89217aac429070439f8cc70ee5580a0ecb3a0100f0000700000e5797b5449c8a6526fb5fcf1a159fbc2bbdd197405aed62a9db35d1b9946e7aa10f');
  // console.log(`txHash :  ${txHash}`);
  // const { signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(alice);
  // console.log('signature', signature);
  // console.log('signature', signature.length);

  return;

  // const placeholder = '0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  // tx.addSignature(signer.address, placeholder, payload.toPayload());

  // const serialized = tx.toHex();
  // console.log('serialized', serialized);

  // const signatureHash = payload.toRaw().data;
  // console.log('signatureHash  : ', signatureHash);

  // const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));

  // console.log('signature      : ', signature);

  // const expectedSignature = '0x021cdf981c1942a837ef78236f4932810741007c3c2f55452b6ee1d008dcdfabab8ef3e6d4062e2ff73e0819f6947b3f64c5c59f6c63ff18d89166b9a8c15bad6b01';

  // const hex = serialized.replace(placeholder, expectedSignature.slice(2));

  // console.log('serialized: ', serialized);
  // console.log('hex       : ', hex);
  // const extrinsic = api.createType('Extrinsic', hex);
  // const extrinsicHex = extrinsic.toHex();

  // console.log('extrinsicHex', extrinsicHex);
  // return;
  // const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
  // console.log(`txHash :  ${txHash}`);
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
