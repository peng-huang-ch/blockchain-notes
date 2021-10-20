const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, hexToU8a, formatBalance } = require('@polkadot/util');
const { blake2AsU8a } = require('@polkadot/util-crypto');
const BigNumber = require('bignumber.js');

const sleep = async (ns) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ns);
  });
};

function print(result, now) {
  const { nonce, data: balance } = result;
  console.log(`${now}: balance of ${balance.free} and a nonce of ${nonce}`);

  formatBalance.setDefaults({ unit: 'CLV' });
  console.log(formatBalance(balance.free, { withUnit: 'CLV', withSi: true }, 18));
}

async function auto() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  // await sleep(1000 * 1);

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const keyring = new Keyring({ ss58Format: 42, type: 'auto' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  console.log('alice:', alice.address);
  console.log('alice.address', alice.address === '5EoKvCTnroB1niQHqhn7hzSPYryUoByaUaogkafq1m8ZK6nL');

  const dest = alice;
  const signer = alice;

  const AMOUNT = new BigNumber(2).shiftedBy(18).toString();
  console.log('AMOUNT', AMOUNT);

  console.log('aaron: ', aaron.address);
  const transfer = api.tx.balances.transfer('5Gj9zP2Rr7ZTu9RWfSZ8W62tf1kcmsoLYSeX6BqDwUHQKw7j', AMOUNT);

  const hash = await transfer.signAndSend(signer);

  console.log(u8aToHex(hash));
}

async function multi() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

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

  // const tx = api.tx.balances.transfer(dest.address, AMOUNT).signFake(signer.address, {
  // genesisHash: api.genesisHash,
  // blockHash: api.genesisHash,
  // runtimeVersion: api.runtimeVersion,
  // version: api.extrinsicVersion,
  // address: signer.address,
  // signer: signer,
  // });

  const tx = api.tx.balances.transfer('5FterzLiBPS4cAFa3Man8rYpoLLDRVFxvGSygD8gpvF1Gz5f', AMOUNT);

  const txhash = await tx.signAndSend(signer);
  console.log('txHash', u8aToHex(txhash));
  console.log('tx', tx.toHex());
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

  // const { signature } = api.createType('ExtrinsicPayload', wrapper.toPayload(), { version: api.extrinsicVersion }).sign(signer);
  // console.log('wrapper.toRaw().data', wrapper.toRaw().data);
  // const s = u8aToHex(alice.sign(wrapper.toRaw().data), { withType: true });
  // console.log('s              : ', s);
  // console.log('s === signature: ', s === signature);

  // console.log('signature      : ', signature);
  // const message = wrapper.toRaw().data;
  // console.log('message        : ', message);
  const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
  tx.addSignature(signer.address, placeholder, wrapper.toPayload());

  const signature = u8aToHex(signer.sign(hexToU8a(wrapper.toRaw().data), { withType: true }));
  // console.log('signature', signature.length);

  const serialized = tx.toHex();
  const realSerialized = serialized.replace(placeholder.slice(2), signature.slice(2));

  const extrinsic = api.createType('Extrinsic', realSerialized);
  console.log('extrinsic.hex   : ', extrinsic.toHex());
  console.log('extrinsic.method: ', extrinsic.method.toHuman());
  console.log('extrinsic', extrinsic.toHuman());
  console.log('--------');
  console.log(extrinsic.toString());

  console.log('- extrinsic._raw.signature', extrinsic._raw.signature.nonce.toHuman());
  console.log('- extrinsic.method', extrinsic.method.toHuman());
  console.log('- extrinsic', extrinsic.toHuman());

  const txWrapper = api.createType('SignerPayload', {
    ...wrapper,
    nonce: '1000',
  });
  console.log('extrinsic.signer.value : ', extrinsic.signer.value);
  extrinsic.addSignature(u8aToHex(extrinsic.signer.toU8a()), placeholder, txWrapper.toPayload());
  console.log('- extrinsic.method', extrinsic.method.toHuman());
  console.log('- extrinsic  ', extrinsic.toHuman());
  console.log('- extrinsic  ', extrinsic.toHex());
  // const recover = api.createType('SignerPayload', {
  //   ...extrinsic,
  //   method: extrinsic.method.toHex(),
  //   nonce: extrinsic.nonce,
  //   era: extrinsic.era,
  // });
  // console.log('tx info', recover.toHuman());
  // return;
  const txHash = await api.rpc.author.submitExtrinsic(extrinsic);
  console.log(`txHash :  ${txHash}`);

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

async function main() {
  return multi();
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
