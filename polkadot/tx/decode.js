const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { blake2AsU8a } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');

function print(result, now) {
  const { nonce, data: balance } = result;
  console.log(`${now}: balance of ${balance.free} and a nonce of ${nonce}`);

  formatBalance.setDefaults({ unit: 'CLV' });
  console.log(formatBalance(balance.free, { withUnit: 'CLV', withSi: true }, 18));
}

async function main() {
  const wsProvider = new WsProvider('wss://api.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const result = await api.query.system.account('5DHVqqMEUj8LRbxbKSAWjUexUuee4dEs4bwf8i7MfcYzpCcN');
  console.log('result', result.nonce);

  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';

  const serialized = '0x4d02840035fdfacc9704ca2672283870b711c9fe8f6787f31ec150fed4d3533ab14b2cf202999eb9fe1f3ac6b7126dacd61be2b56296cbb40a335efd55993ae655b31cbc6d4c8390bf61d35b542eda46d651c5f705452989a4000a3fd9e47ebf8ba60df96c0100040007000045662f3837457c0f76ce2878e3102cb5173bbbb9714429fe100ee2087cc9fb7213c492d56e676adb0d';
  const extrinsic = api.createType('Extrinsic', serialized);
  console.log('extrinsic.hex     : ', extrinsic.toHex());
  console.log('extrinsic.nonce   : ', extrinsic.nonce.toNumber());
  console.log('extrinsic.method  : ', extrinsic.method.toHuman());
  console.log('extrinsic', extrinsic.toHuman());

  console.log('--------');
  // const txHash = await api.rpc.author.submitExtrinsic(extrinsic);
  // console.log(`txHash :  ${txHash}`);

  const method = extrinsic.method.toHex();
  const sender = extrinsic.signer.toString();
  const payload = api.createType('SignerPayload', {
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    era: extrinsic.era,

    address: sender,
    method,
    nonce: '1000',
  });
  console.log('extrinsic.signer.value : ', extrinsic.signer.toString());
  extrinsic.addSignature(u8aToHex(extrinsic.signer.toU8a()), placeholder, payload.toPayload());
  console.log('- extrinsic.method', extrinsic.method.toHuman());
  console.log('- extrinsic  ', extrinsic.toHuman());
  console.log('- extrinsic  ', extrinsic.toHex());

  const hash = u8aToHex(blake2AsU8a(payload.toRaw().data));
  console.log('++++ : ', hash);

  // const recover = api.createType('SignerPayload', {
  //   ...extrinsic,
  //   method: extrinsic.method.toHex(),
  //   nonce: extrinsic.nonce,
  //   era: extrinsic.era,
  // });
  // console.log('tx info', recover.toHuman());
  // return;
  // const txHash = await api.rpc.author.submitExtrinsic(extrinsic);
  // console.log(`txHash :  ${txHash}`);
  // return;

  // const { signature } = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion }).sign(alice);
  // console.log('signature', signature);
  // console.log('signature', signature.length);

  // return;

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
