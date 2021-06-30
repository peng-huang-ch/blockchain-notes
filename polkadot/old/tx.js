const cloverTypes = require('@clover-network/node-types');
// Import the API & Provider and some utility functions
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { Keyring } = require('@polkadot/keyring');
const { hexToU8a, u8aToHex } = require('@polkadot/util');
const { formatBalance } = require('@polkadot/util');
// Utility function for random values
const { randomAsU8a } = require('@polkadot/util-crypto');

// Some constants we are using in this sample
const ALICE = '5EoKvCTnroB1niQHqhn7hzSPYryUoByaUaogkafq1m8ZK6nL';
const AMOUNT = 10000;
const PHRASE = '';

async function main() {
  // Create the API and wait until ready
  const wsProvider = new WsProvider('wss://api.clover.finance');
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: cloverTypes,
  });
  formatBalance.setDefaults({ unit: 'CLV' });

  const account = await api.query.system.account('5EoKvCTnroB1niQHqhn7hzSPYryUoByaUaogkafq1m8ZK6nL');
  console.log(account.data.free);
  console.log(formatBalance(account.data.free, { forceUnit: 'clv', withSi: true }, 18));

  // api.query.system.eventTopics
  // // Find the actual keypair in the keyring
  // const alicePair = keyring.addFromUri(PHRASE + '//polkadot');
  // // const alicePair = keyring.getPair(ALICE);

  // // Create a new random recipient
  // const recipient = ALICE//keyring.addFromSeed(randomAsU8a(32)).address;

  // console.log('Sending', AMOUNT, 'from', alicePair.address, 'to', recipient, 'with nonce', nonce.toString());

  // // Do the transfer and track the actual status
  // let transaction =  api.tx.balances
  //   .transfer(recipient, AMOUNT)
  // const blocks = 50;

  // const signedBlock = await api.rpc.chain.getBlock();

  // const options = {
  //   blockHash: signedBlock.block.header.hash,
  //   era: api.createType('ExtrinsicEra', {
  //     current: signedBlock.block.header.number,
  //     period: blocks
  //   }),
  //   nonce
  // };
  // const blockNumber = signedBlock.block.header.number;
  // const payload = api.createType('SignerPayload', {
  //   genesisHash: api.genesisHash,
  //   runtimeVersion: api.runtimeVersion,
  //   version: api.extrinsicVersion,
  //   ...options,
  //   address: ALICE,
  //   blockNumber,
  //   method: transaction.method
  // });
  // const aaa = api.createType('ExtrinsicPayload', payload.toPayload(), { version: api.extrinsicVersion })
  // console.log(aaa.sign(alicePair))

  // const placeholder = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001'
  // transaction.addSignature(ALICE, '0x'+placeholder, payload.toPayload());
  // console.log(payload.toRaw().data)
  // const signature = u8aToHex(alicePair.sign(hexToU8a(payload.toRaw().data), { withType: true }))
  // console.log('@', signature)
  // let serialized = transaction.toHex().slice(2)
  // console.log('0x' + serialized)

  // const hex = '0x' + serialized.replace(placeholder, `${signature.slice(2)}`)
  // console.log(hex)

  // //   01c649ce815eaab9806d341eb4a41d8c365718e0110b130ce69f15822cb68aba5b3515ceaa235e1a9724218ec6bf867ee17d7b97eb244a65b8fdcbb86293769082
  // // 0x01b6788f3ae00370ee549401d7a90854e589a2605218863a903ac5b90b329e2d5ff1807ca9b6fb6a0880f993854d9d02eb99738e097ddff9ef0abb3770510b9e82
  // // 0x015e13869c6cb64f31bec871887ecc1e4eff2f124dd059427f0b194dbc0068835f9f36344b01f4223ef098e67bbe0610d5938d19bac860ca7290bdf94cbd4eaa88
  // // await transaction.signAsync(alicePair, { nonce })
  // // console.log(transaction.toHex())

  // // 0x3102840078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead0500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018503100007000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05419c
  // // 0x3102840078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead0501f8a8077d64ee30cc3f803de6aac1da1314a8de7a522f48c152eca03403c7e3188a7498caa3efea519cb12fbd30d28e3cd8b534db72acd755d5719f3a7e1293846503100007000078fa2a61b6f9ee896d847d9363417fa984e40853dd72e05f7ea12fe9db4ead05419c
  // const extrinsic = api.createType('Extrinsic', hex);
  // const hash = await api.rpc.author.submitExtrinsic(extrinsic);
  const s = await api.rpc.author.submitAndWatchExtrinsic(extrinsic);

  // console.log(hash)
  // console.log(payload)
  // const payload = api.createType('SignerPayload', {
  //   genesisHash: api.genesisHash,
  //   runtimeVersion: api.runtimeVersion,
  //   version: api.extrinsicVersion,
  //   ...options,
  //   address: from,
  //   blockNumber,
  //   method: transaction.method
  // });
  // transaction.addSignature(from, '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001', payload.toPayload());

  // .signAndSend(alicePair, { nonce }, ({ events = [], status }) => {
  //   console.log('Transaction status:', status.type);

  //   if (status.isInBlock) {
  //     console.log('Included at block hash', status.asInBlock.toHex());
  //     console.log('Events:');

  //     events.forEach(({ event: { data, method, section }, phase }) => {
  //       console.log('\t', phase.toString(), `: ${section}.${method}`, data.toString());
  //     });
  //   } else if (status.isFinalized) {
  //     console.log('Finalized block hash', status.asFinalized.toHex());

  //     process.exit(0);
  //   }
  // });
}

main().catch(console.error);
