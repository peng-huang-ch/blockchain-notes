const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');

async function main() {
  await cryptoWaitReady();

  const keyring = new Keyring();
  const alice = keyring.addFromUri('//Alice');

  // create the message, actual signature and verify
  const message = stringToU8a('message');
  const signature = alice.sign(message);
  const isValid = alice.verify(message, signature);

  // output the result
  console.log(`${u8aToHex(signature)} is ${isValid ? 'valid' : 'invalid'}`);
}

main().then().catch(console.error);
