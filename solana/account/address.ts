import assert from 'node:assert';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import * as bip39 from 'bip39';
import { HDKey } from 'micro-ed25519-hdkey';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

function mnemonicToKeypair(mnemonic: string, password: string = '', index: number = 0) {
  const seed = bip39.mnemonicToSeedSync(mnemonic, password);
  const hd = HDKey.fromMasterSeed(seed.toString('hex'));
  const path = `m/44'/501'/${index}'/0'`;
  const derivedSeed = hd.derive(path).privateKey;
  return Keypair.fromSeed(derivedSeed);
}

function main() {
  const mnemonic = process.env.MNEMONIC;
  const message = hexToBytes('8001000102');
  const keypair = mnemonicToKeypair(mnemonic);

  console.log('keypair publicKey : ', keypair.publicKey.toBase58());
  console.log('keypair secretKey : ', bs58.encode(keypair.secretKey));
  console.log('address 					 : ', keypair.publicKey.toBase58());
  const signature = nacl.sign.detached(message, keypair.secretKey);
  assert.strict(nacl.sign.detached.verify(message, signature, keypair.publicKey.toBuffer()), 'tweetnacl ed25519 signature verify failed');
  console.log('signature : ', bytesToHex(signature));
  console.log('bs58      : ', bs58.encode(signature));
}

main();
