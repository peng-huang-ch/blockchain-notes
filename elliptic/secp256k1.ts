import 'dotenv/config';

import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { ECDSASignature, ecsign, toBytes } from '@ethereumjs/util';
import * as ecc from 'tiny-secp256k1';

import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

type Signature = Pick<EC.Signature, 'r' | 's' | 'recoveryParam'>;

function canonical({ r, s, recoveryParam }: Signature): Signature {
  if (s.cmp(ec.nh) > 0) {
    s = ec.n.sub(s);
    recoveryParam ^= 1;
  }

  return { r, s, recoveryParam };
}

function display(signature: ECDSASignature) {
  const r = toBytes(signature.r);
  const s = toBytes(signature.s);
  const v = signature.v;
  console.log('r        : ', bytesToHex(r)); //
  console.log('s        : ', bytesToHex(s));
  console.log('v        : ', v);
  console.log('r + s    : ', bytesToHex(Buffer.concat([r, s])));
  console.log('r + s + v: ', bytesToHex(Buffer.concat([r, s])) + toBytes(v));
}

var secret = process.env.ECDSA_SECRET;
var msg = '0f555ff76600d72613417599a74db3a6e159000f96c770ed37d99e9deb429ae1';
var privKey = Buffer.from(secret, 'hex');
var signature = ec.sign(msg, privKey);

const keyPair = ec.keyFromPrivate(privKey);
console.log('pub hex : ', keyPair.getPublic(true, 'hex'));
display({
  r: signature.r.toBuffer(),
  s: signature.s.toBuffer(),
  v: BigInt(signature.recoveryParam),
});

var expected = ecc.sign(Buffer.from(msg, 'hex'), privKey);
console.log('ecc : ', bytesToHex(expected));

var canonicate = canonical(signature);
console.log('---------------');
console.log('-- canonical --');
console.log('---------------');
display({
  r: canonicate.r.toBuffer(),
  s: canonicate.s.toBuffer(),
  v: BigInt(canonicate.recoveryParam),
});
console.log('---------------');
console.log('------end------');
console.log('---------------');

const msgHash = hexToBytes(msg);
var signed = ecsign(msgHash, privKey);
display(signed);
