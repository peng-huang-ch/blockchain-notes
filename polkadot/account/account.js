const { Keyring } = require('@polkadot/api');
const { cryptoWaitReady, createKeyMulti, encodeAddress, blake2AsU8a, mnemonicGenerate, mnemonicToMiniSecret, mnemonicValidate, secp256k1KeypairFromSeed } = require('@polkadot/util-crypto');
const { hexToU8a, u8aToHex } = require('@polkadot/util');

async function main() {
  await cryptoWaitReady();
  const mnemonic = mnemonicGenerate();
  console.log(mnemonic);

  // const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
  // const pair = keyring.addFromUri(mnemonic + '//polkadot');
  // console.log(pair.address);

  verifyAddresses();
  // const addresses = ['5CPWYjgP8FMqMFEuS98vit2M1dwKy7wicL9BdvD4RGed2DqC', '5F4rLDtniR4Mod3WSxNgwH9NmCyFz57tsgWi7eRsBMH7cuYb', '5CGGhuAeRYtC4f4Uxu6gc3yHPW3ZEwiCXLVS2nv8pFKkSJs8'];
  // const addresses = ['5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ', '5CvdkBiGornVUUkprLxjCS9TAdrnNA8sSaY1NSWU6nVyFJUA', '5E8ivzJyUuui53dCyV9zLf3hsyqBojuv9dSKzpn4hToVN4NY'];
  // const threshold = 2;
  // const expected = '5EjXLmCHWyo5SVTQEo9JBgozVNZgWYheAdENAuEZ1UvaGD3e';
  // const multiAddr = createMultiAddress(addresses, threshold, 42, expected);
  // console.log(expected === multiAddr);
  // console.log(multiAddr);

  console.log('xxxxxxx');
  console.log(encodeAddress(blake2AsU8a('0x0346219571358630cf0565dc9826f4583014a32d2230f04df77b6c2097c2e09624'), 42));
}

function createMultiAddress(addresses, threshold, SS58Prefix = 42, expected) {
  const multiAddress = createKeyMulti(addresses, threshold);
  // Convert byte array to SS58 encoding.
  const Ss58Address = encodeAddress(multiAddress, SS58Prefix);
  return Ss58Address;
}

function verifyAddresses() {
  verify({
    name: 'alice',
    PHRASE: 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief',
    address: '5HhZWYeLNRbpofy4F34vVENgwxQVE8HGWhprVE6MPPCqUdRn',
  });

  // verify({
  //   name: 'aaron',
  //   PHRASE: 'traffic wine leader wheat mom device kiwi great horn room remind office',
  //   address: '5F1GPrYp5Q32Hr3hczZXoJCTxNhuQxsBbABtSjDnVK9Fn9dZ',
  // });

  // verify({
  //   name: 'phcc',
  //   PHRASE: 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come',
  //   address: '5CvdkBiGornVUUkprLxjCS9TAdrnNA8sSaY1NSWU6nVyFJUA',
  // });

  // verify({
  //   name: 'peng',
  //   PHRASE: 'push exhibit ozone spoil neglect supply palm leave master scorpion unveil rain',
  //   address: '5E8ivzJyUuui53dCyV9zLf3hsyqBojuv9dSKzpn4hToVN4NY',
  // });
}

function verify({ name, PHRASE, address }) {
  const ss58Format = 42;
  const keyring = new Keyring({ ss58Format, type: 'ecdsa' });

  const pair = keyring.addFromUri(PHRASE + '//polkadot');
  console.log(name, address);
  console.log('pair.address', pair.address === address);
  console.log('pair.publicKey', u8aToHex(pair.publicKey));

  // Validate the mnemic string that was geneated
  // const isValidMnemonic = mnemonicValidate(PHRASE);

  // console.log(`isValidMnemonic: ${isValidMnemonic}`);

  // // Create valid Substrate-compatible seed from mnemonic
  const seed = mnemonicToMiniSecret(PHRASE);

  // // Generate new public/secret keypair for Alice from the supplied seed
  const { publicKey, secretKey } = secp256k1KeypairFromSeed(seed);
  console.log('public', u8aToHex(publicKey));
  console.log('secretKey', u8aToHex(secretKey));
  console.log('expect address: ', address);
  console.log('got address   : ', encodeAddress(blake2AsU8a(publicKey), ss58Format));
  console.log(encodeAddress(blake2AsU8a(publicKey), ss58Format) === address);
  console.log('------');
}

main().then().catch(console.error);
