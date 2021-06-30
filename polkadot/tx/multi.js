const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { u8aToHex, formatBalance } = require('@polkadot/util');
const { createKeyMulti, encodeAddress, sortAddresses, encodeMultiAddress } = require('@polkadot/util-crypto');

function print(result, now) {
  const { nonce, data: balance } = result;
  console.log(`${now}: balance of ${balance.free} and a nonce of ${nonce}`);

  formatBalance.setDefaults({ unit: 'CLV' });
  console.log(formatBalance(balance.free, { withUnit: 'CLV', withSi: true }, 18));
}

async function send() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'miracle enforce rely repeat throw topic mystery stumble able bridge duty liar';
  // const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

  const PENG = 'push exhibit ozone spoil neglect supply palm leave master scorpion unveil rain';

  const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  // 1. Use formatBalance to display amounts
  formatBalance.setDefaults({
    unit: 'CLV',
    decimals: 18,
  });

  // 2. Define relevant constants
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const AMOUNT_TO_SEND = 10;
  const displayAmount = formatBalance(AMOUNT_TO_SEND);
  const depositBase = api.consts.multisig.depositBase;
  const depositFactor = api.consts.multisig.depositFactor;

  // 3. Initialize accounts
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');
  // const peng = keyring.addFromUri(PENG + '//polkadot');

  const MULTISIG = createMultiAddress([aaron.address, phcc.address, peng.address], 2, 42);
  console.log('MULTISIG', MULTISIG);
  const otherSignatories = [aaron.address, phcc.address, peng.address].sort();

  // 4. API calls - info is necessary for the timepoint
  const call = api.tx.balances.transfer(aaron.address, AMOUNT_TO_SEND);
  const info = await api.query.multisig.multisigs(MULTISIG, call.method.hash);

  // 5. Set the timepoint
  // If this IS the first approval, then this must be None (null)
  const TIME_POINT = null;
  // If this is NOT the first approval, then it must be Some,
  // with the timepoint (block number and transaction index)
  // of the first approval transaction :
  // const TIME_POINT = info.unwrap().when;

  // 6. approveAsMulti
  const txHash = await api.tx.multisig.approveAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT).signAndSend(alice);
  console.log(`depositBase   : ${depositBase}`);
  console.log(`depositFactor : ${depositFactor}`);
  console.log(`Sending ${displayAmount} from ${alice.address} to ${MULTISIG}`);
  console.log(`Required values  : approveAsMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`Submitted values : approveAsMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call.method.hash}, ${MAX_WEIGHT})\n`);
  console.log(`approveAsMulti tx: https://clover-testnet.subscan.io/extrinsic/${txHash}`);
}

async function auto() {
  const THRESHOLD = 2;
  const MAX_WEIGHT = 640000000;
  const STORE_CALL = false;

  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  await sleep(1000 * 1);
  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

  const PENG = 'push exhibit ozone spoil neglect supply palm leave master scorpion unveil rain';

  const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  const peng = keyring.addFromUri(PENG + '//polkadot');

  const AMOUNT_TO_SEND = 10;

  const MULTI_ADDRESS = [aaron.address, phcc.address, peng.address];

  // 3. Create Multisig (with optional SS58PREFIX)
  const multisig = encodeMultiAddress(MULTI_ADDRESS, THRESHOLD);
  console.log(`Multisig Address: ${multisig}\n`);

  const otherSignatories = [aaron.address, phcc.address].sort();

  // 4. Send 1 WND to Aaron account
  const call = api.tx.balances.transfer(aaron.address, AMOUNT_TO_SEND);

  const TIME_POINT = null;
  // 5. Retrieve and unwrap the timepoint
  // const info = await api.query.multisig.multisigs(multisig, call.method.hash);
  // const TIME_POINT = info.unwrap().when;
  // console.log(`Time point is: ${TIME_POINT}`);

  // 6. Send asMulti transaction
  // Now the multisig call that was initiated by the Alice account
  // to send 1 WND to Charlie can be approved by Bob.
  // Since threshold is set to 2, this approval should dispatch the call
  // (2 approvals received)

  const txHash = await api.tx.multisig
    .asMulti(
      THRESHOLD,
      otherSignatories,
      TIME_POINT,
      call.method.toHex(),
      STORE_CALL,
      MAX_WEIGHT //
    )
    .signAndSend(peng);

  console.log(`Sending ${displayAmount} from ${MULTISIG} to ${Charlie.address}`);
  console.log(`Required values  : asMulti(THRESHOLD, otherSignatories, TIME_POINT, call.method.hash, MAX_WEIGHT)`);
  console.log(`Submitted values : asMulti(${THRESHOLD}, otherSignatories: ${JSON.stringify(otherSignatories, null, 2)}, ${TIME_POINT}, ${call.method.hash}, ${MAX_WEIGHT})\n`);
  console.log(`asMulti tx: https://westend.subscan.io/extrinsic/${txHash}`);
}

function createMultiAddress(addresses, threshold, SS58Prefix = 42) {
  const multiAddress = createKeyMulti(addresses, threshold);
  // Convert byte array to SS58 encoding.
  const Ss58Address = encodeAddress(multiAddress, SS58Prefix);
  return Ss58Address;
}

async function multi() {
  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

  const PENG = 'push exhibit ozone spoil neglect supply palm leave master scorpion unveil rain';

  const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });

  const alice = keyring.addFromUri(PHRASE + '//polkadot');

  const aaron = keyring.addFromUri(AARON + '//polkadot');

  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  const peng = keyring.addFromUri(PENG + '//polkadot');

  const multiAddr = createMultiAddress([phcc.address, aaron.address, peng.address], 2, 42);

  console.log('multi address', multiAddr);
  console.log('aaron address', aaron.address);

  console.log(multiAddr);
  console.log(multiAddr === '5FXDVZtkbpkioX3n6f3RUoD1bdEDSoVesAwR5h9fNNTZwftf');
  const AMOUNT = 1000;

  const tx = api.tx.balances.transfer(multiAddr.address, AMOUNT);

  const { nonce } = await api.query.system.account(multiAddr);

  // create the payload
  for (const account of [phcc, aaron]) {
    const signer = api.createType('SignerPayload', {
      method: tx,
      nonce,
      genesisHash: api.genesisHash,
      blockHash: api.genesisHash,
      runtimeVersion: api.runtimeVersion,
      version: api.extrinsicVersion,
    });

    const { signature } = api.createType('ExtrinsicPayload', signer.toPayload(), { version: api.extrinsicVersion }).sign(account);
    tx.addSignature(multiAddr, u8aToHex(new Uint8Array([...new Uint8Array([1]), ...new Uint8Array(64).fill(0x42)])), signer.toPayload());
    console.log('tx signature', u8aToHex(tx.signature));
  }

  const hash = await tx.send();
  console.log('hash', u8aToHex(hash));

  const hash = await transfer.signAndSend(alice);

  console.log(u8aToHex(hash));
}

async function main() {
  return send();
}

main()
  .then()
  .catch(console.error)
  .finally(() => process.exit());
