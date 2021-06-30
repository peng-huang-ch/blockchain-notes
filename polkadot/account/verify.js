const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');

function verify() {
  const keyring = new Keyring();

  // create Alice based on the development seed
  const alice = keyring.addFromUri('//Alice');

  // create the message, actual signature and verify
  const message = stringToU8a('this is our message');
  const signature = alice.sign(message);
  const isValid = alice.verify(message, signature);

  // output the result
  console.log(`${u8aToHex(signature)} is ${isValid ? 'valid' : 'invalid'}`);
}

async function main() {
  await cryptoWaitReady();

  verify();
}

main().then().catch(console.error);
