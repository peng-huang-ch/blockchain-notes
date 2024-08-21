/**
 * libraries
 * : noble-curves(https://github.com/paulmillr/noble-curves)
 * : tweetnacl-js(https://github.com/dchest/tweetnacl-js)
 */
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes, bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import nacl from 'tweetnacl';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

function main() {
  const hashToSign = randomBytes(32);
  const privateKey = randomBytes(32);
  const keyPair = nacl.sign.keyPair.fromSeed(privateKey);
  const secretKey = keyPair.secretKey;

  // public key
  const publicKey = ed25519.getPublicKey(privateKey);
  assert.strictEqual(bytesToHex(publicKey), bytesToHex(keyPair.publicKey), 'publicKey do not match');

  // signature
  const signature = ed25519.sign(hashToSign, privateKey);
  assert.strictEqual(bytesToHex(signature), bytesToHex(nacl.sign.detached(hashToSign, secretKey)), 'signatures do not match');

  // verify signature
  assert.strict(ed25519.verify(signature, hashToSign, publicKey), 'noble ed25519 signature verify failed');
  assert.strict(nacl.sign.detached.verify(hashToSign, signature, publicKey), 'tweetnacl ed25519 signature verify failed');

  console.log('All tests passed');
}

function generate() {
  const type = 'ed25519';
  const { publicKey, privateKey } = crypto.generateKeyPairSync(type);
  const message = 'Hello world!';
  const signature = crypto.sign(null, utf8ToBytes(message), privateKey);
  const verified = crypto.verify(null, utf8ToBytes(message), publicKey, signature);
  console.log('signature  : ', bytesToHex(signature));
  console.log('privateKey : ', privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex'));
  console.log('isMatch    : ', verified);
  console.log('generated complete. \n');
}

// main();

generate();
