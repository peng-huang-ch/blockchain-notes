/**
 * This file is used to generate a public key from a secret key using the curve25519 elliptic curve.
 * The public key is then used to verify a signature.
 * libraries
 * : noble-curves(https://github.com/paulmillr/noble-curves)
 * : elliptic(https://github.com/indutny/elliptic)
 * : tweetnacl-js(https://github.com/dchest/tweetnacl-js)
 * • elliptic: A library for elliptic curve cryptography, implements curve25519
 * • tweetnacl-js: A library for cryptography, implements x25519-xsalsa20-poly1305
 */
import 'dotenv/config';

import { hexToBytes, bytesToHex } from '@noble/curves/abstract/utils';
import { ec as EC } from 'elliptic';
import nacl from 'tweetnacl';

var secret = process.env.CURVE_25519_SECRET;
const ec = new EC('curve25519');

function elliptic(): void {
  var key1 = ec.genKeyPair();
  var key2 = ec.genKeyPair();

  var shared1 = key1.derive(key2.getPublic());
  var shared2 = key2.derive(key1.getPublic());

  console.log('Both shared secrets are BN instances');
  console.log('shared secrets: ', shared1.toString(16));
  console.log('shared secrets: ', shared2.toString(16));

  var keyPair = ec.keyFromPrivate(secret);
  console.log('Public key:', keyPair.getPublic('hex'));
}

function tweetnacl() {
  var secretKey = hexToBytes(secret);
  var keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
  console.log('Public key:', bytesToHex(keyPair.publicKey));
}

elliptic();
tweetnacl();
