const bip39 = require('bip39');
const { ec: EC } = require('elliptic');
const { Keyring } = require('@polkadot/keyring');
const { hexToU8a, u8aToHex, bnToU8a, u8aConcat } = require('@polkadot/util');

const { cryptoWaitReady, secp256k1Sign, blake2AsU8a, EXPAND_OPT } = require('@polkadot/util-crypto');
const { BN } = require('bn.js');
cryptoWaitReady().then(() => {
  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';
  // const secretKey = '0x41686b77ae34a06df617dde217d6f2ad286223a8596dd4e2d00d81dc8218b72c';
  const ss58Format = 42;
  const keyring = new Keyring({ ss58Format, type: 'ecdsa' });
  const pair = keyring.addFromUri(PHRASE + '//polkadot');

  const message = '0x0700000e5797b5449c8a6526fb5fcf1a159fbc2bbdd197405aed62a9db35d1b9946e7aa10f00f0001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927';
  // console.log('address : ', pair.address);
  // console.log('toJson  : ', u8aToHex(pair.publicKey));
  console.log('expect sign    : ', u8aToHex(pair.sign(message, { withType: true })));

  const ec = new EC('secp256k1');
  const secretKey = '0x41686b77ae34a06df617dde217d6f2ad286223a8596dd4e2d00d81dc8218b72c';
  const key = ec.keyFromPrivate(hexToU8a(secretKey));
  const prepare = blake2AsU8a(message);

  console.log('prepare', u8aToHex('0249614c6d647caa19443b48ca3ad9cc6bb5d4e466c51b6fb4f337de43cb2076'));
  // console.log('0-0', new BN('230c81fcf0f3e1dad51d819de283e965f3561f9f111f18ac41c02af567686e0e', 16).toString('hex'));
  const { s, r, recoveryParam } = key.sign(hexToU8a('0xac3b4f9fe406915078136ded365c88dfc226869ec21dfe235f6604db83418969'));
  console.log('r - ec         :', r.toString('hex'));
  console.log('r - toHex      :', u8aToHex(bnToU8a(r, EXPAND_OPT)));
  console.log('s - ec         : ', s.toString('hex'));
  console.log('recoveryParam  : ', recoveryParam);
  const receive = u8aConcat(bnToU8a(r, EXPAND_OPT), bnToU8a(s, EXPAND_OPT), new Uint8Array([recoveryParam || 0]));
  console.log('receive : ', u8aToHex(receive));
  console.log('expect  : ', u8aToHex(secp256k1Sign(message, { secretKey: hexToU8a(secretKey) })));

  // const secretKey = '00b3c9a1e6ced51ed3e2fad2c9cfee0e846a7a68c27e58be5c2509f49d397b7d76';
});
