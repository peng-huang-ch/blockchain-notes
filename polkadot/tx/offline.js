const assert = require('assert').strict;
const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { construct } = require('@substrate/txwrapper-polkadot');
const { u8aToHex, hexToU8a } = require('@polkadot/util');
const BigNumber = require('bignumber.js');

async function getPeriodEra(api, period = 1) {
  const block = await api.rpc.chain.getBlock();
  const blockNumber = block.block.header.number;
  const blockHash = block.block.header.hash;
  const era = api.createType('ExtrinsicEra', {
    current: blockNumber,
    period
  });
  return {
    blockHash,
    era,
  }

}

// https://wiki.polkadot.network/docs/build-transaction-construction
async function main() {
  // await cryptoWaitReady();
  var wsProvider = new WsProvider('wss://api.clover.finance');

  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const keyring = new Keyring({ ss58Format: 42, type: 'ecdsa' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  const signer = alice;
  const dest = aaron;

  const AMOUNT = new BigNumber(1.1).shiftedBy(9).toString();

  console.log('alice: ', alice.address);
  console.log('aaron: ', aaron.address);

  const result = await api.query.system.account(signer.address);
  const { nonce } = result;
  console.log('nonce: ', nonce.toNumber());

  var tx = api.tx.balances.transfer(dest.address, AMOUNT);
  // const signed = await tx.signAsync(signer, { blockHash: api.genesisHash, era: 0, nonce: nonce.toNumber() });

  var periodEra = await getPeriodEra(api, 10);

  const signerPayloadOptions = {
    method: tx.method.toHex(),
    nonce: nonce.toNumber(),
    genesisHash: api.genesisHash,
    blockHash: api.genesisHash,
    runtimeVersion: api.runtimeVersion,
    version: api.extrinsicVersion,
    // address: signer.address,
  }

  Object.assign(signerPayloadOptions, periodEra);

  // create signer payload
  const signerPayload = api.createType('SignerPayload', signerPayloadOptions);

  var serialized;

  // choose one of the following methods to sign the extrinsic
  // 1.
  {
    // create extrinsic payload
    const extrinsicPayload = api.createType('ExtrinsicPayload', signerPayload.toPayload(), { version: api.extrinsicVersion });
    const { signature } = extrinsicPayload.sign(signer);
    tx.addSignature(signer.address, signature, signerPayload.toPayload());
    serialized = tx.toHex();
  }

  // 2.
  {
    // with signer payload
    const signature = u8aToHex(signer.sign(hexToU8a(signerPayload.toRaw().data), { withType: true }));
    tx.addSignature(signer.address, signature, signerPayload.toPayload());

    assert.strictEqual(tx.toHex(), serialized, 'tx serialized should be equal');
    // serialized = tx.toHex();
  }

  // 3.
  {
    // 1. with a placeholder signature
    // 2.replace the placeholder with the actual signature
    const placeholder = '0x020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
    tx.addSignature(signer.address, placeholder, signerPayload.toPayload());
    var tmpTxHex = tx.toHex();

    const signatureU8a = signer.sign(hexToU8a(signerPayload.toRaw().data), { withType: true });
    const signature = u8aToHex(signatureU8a);

    // replace placeholder with the actual signature
    const txHex = tmpTxHex.replace(placeholder.slice(2), signature.slice(2));
    assert.strictEqual(txHex, serialized, 'tx serialized should be equal');
  }

  const extrinsic = api.createType('Extrinsic', serialized);
  console.log('- extrinsic.method', extrinsic.method.toHuman());
  console.log('- extrinsic    : ', extrinsic.toHuman());
  console.log('- extrinsic hex:', extrinsic.toHex());
  console.log('- extrinsic era:', extrinsic.era.toHuman());
  console.log('- extrinsic period   :', extrinsic.era?.isMortalEra ? extrinsic.era.asMortalEra?.period.toNumber() : extrinsic.era.asImmortalEra);

  console.log('extrinsic', extrinsic.toHex());

  const txHash = await api.rpc.author.submitExtrinsic(extrinsic);
  const txHash2 = construct.txHash(extrinsic.toHex());
  assert.strictEqual(txHash.toHex(), txHash2, 'txHash should be equal');
  console.log(`txHash :  ${txHash}`);
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
