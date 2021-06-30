const MNEMONIC = 'traffic wine leader wheat mom device kiwi great horn room remind office';
const name = 'phcc';
const password = 'ph.cc';
const keypairType = 'sr25519';
const address = '5DUCAgjGtjYZsfdF9US4NksiL7GWeMVizxnGzWZXdFRh9aUd';

const cloverTypes = require('@clover-network/node-types');
const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { cryptoWaitReady, mnemonicGenerate, mnemonicToMiniSecret, mnemonicValidate, naclKeypairFromSeed } = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');

async function main() {
  await cryptoWaitReady();
  const mnemonicAlice = mnemonicGenerate();

  console.log(`Generated mnemonic: ${mnemonicAlice}`);

  // Validate the mnemic string that was generated
  const isValidMnemonic = mnemonicValidate(mnemonicAlice);

  console.log(`isValidMnemonic: ${isValidMnemonic}`);

  // Create valid Substrate-compatible seed from mnemonic
  const seedAlice = mnemonicToMiniSecret(mnemonicAlice);

  // Generate new public/secret keypair for Alice from the supplied seed
  const { publicKey, secretKey } = naclKeypairFromSeed(seedAlice);
}

main().then().catch(console.error);
