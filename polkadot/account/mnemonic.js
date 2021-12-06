const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { cryptoWaitReady, mnemonicGenerate, mnemonicToMiniSecret, mnemonicValidate, naclKeypairFromSeed } = require('@polkadot/util-crypto');
const { Keyring } = require('@polkadot/keyring');

async function main () {
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
