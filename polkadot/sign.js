const bip39 = require('bip39');
const { ec: EC } = require('elliptic');
const { Keyring } = require('@polkadot/keyring');
const { hexToU8a, u8aToHex, bnToU8a, u8aConcat } = require('@polkadot/util');
const { cryptoWaitReady, secp256k1Sign, blake2AsU8a, EXPAND_OPT } = require('@polkadot/util-crypto');


cryptoWaitReady().then(() => {

  const ss58Format = 42;
  const keyring = new Keyring({ ss58Format, type: 'ecdsa' });
  const pair = keyring.addFromUri(PHRASE + '//polkadot');

  const message = '0x0700000e5797b5449c8a6526fb5fcf1a159fbc2bbdd197405aed62a9db35d1b9946e7aa10f00f0001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927';
  // console.log('address : ', pair.address);
  // console.log('toJson  : ', u8aToHex(pair.publicKey));
  console.log('expect sign    : ', u8aToHex(pair.sign(message, { withType: true })));

  const ec = new EC('secp256k1');
  const key = ec.keyFromPrivate(hexToU8a(secretKey));
  const prepare = blake2AsU8a(message);

  console.log('prepare', u8aToHex(prepare));
  const { s, r, recoveryParam } = key.sign(hexToU8a('0xac3b4f9fe406915078136ded365c88dfc226869ec21dfe235f6604db83418969'));
  console.log('r - ec         :', r.toString('hex'));
  console.log('r - toHex      :', u8aToHex(bnToU8a(r, EXPAND_OPT)));
  console.log('s - ec         : ', s.toString('hex'));
  console.log('recoveryParam  : ', recoveryParam);
  const receive = u8aConcat(bnToU8a(r, EXPAND_OPT), bnToU8a(s, EXPAND_OPT), new Uint8Array([recoveryParam || 0]));
  console.log('receive : ', u8aToHex(receive));
  console.log('expect  : ', u8aToHex(secp256k1Sign(message, { secretKey: hexToU8a(secretKey) })));
});
