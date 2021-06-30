const { blake2b } = require('blakejs');
const pbkdf2 = require('pbkdf2');
const bip39 = require('bip39');
const bip32 = require('bip32');
const { Keyring } = require('@polkadot/keyring');
const { hexToU8a, u8aToHex } = require('@polkadot/util');

const { cryptoWaitReady } = require('@polkadot/util-crypto');
cryptoWaitReady().then(() => {
  var words = [];
  for (var i = 0; i < 100; i++) {
    const PHRASE = bip39.generateMnemonic(); //'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';
    const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
    const newPair = keyring.addFromUri(PHRASE + '//polkadot');

    console.log(newPair.address.length);
    words.push(newPair.address.slice(0, 1));
  }
  console.log(new Set(words));
  // const sig = newPair.sign(hexToU8a('0x070000b0e2c869624ed67d80646362282107db9c264cfc91e9bac6427d433a7609d22e0f0000c16ff2862305006c001000000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927f5db90b80b204e95b4b919ed067a44acc67f1783920ee46796cc4916830cb2a2'), { withType: true })
  // console.log(u8aToHex(sig))
});
