import 'dotenv/config';
import bs58 from 'bs58';
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js';
import { createMultisig } from '@solana/spl-token';

var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

async function main() {
  var secretKey = process.env.SOL_SECRET_KEY;
  var aliceKey = process.env.SOL_ALICE_KEY;
  var bobKey = process.env.SOL_BOB_KEY;
  var carolKey = process.env.SOL_CAROL_KEY;

  const payer = Keypair.fromSecretKey(bs58.decode(secretKey));

  // 2-3 multisig
  const alice = Keypair.fromSecretKey(bs58.decode(aliceKey));
  const bob = Keypair.fromSecretKey(bs58.decode(bobKey));
  const carol = Keypair.fromSecretKey(bs58.decode(carolKey));

  console.log('payer : ', payer.publicKey.toBase58());
  console.log('alice : ', alice.publicKey.toBase58());
  console.log('bob : ', bob.publicKey.toBase58());
  console.log('carol : ', carol.publicKey.toBase58());

  // create multisig account, at least 2 signers
  const multisigKey = await createMultisig(
    connection,
    payer,
    [alice.publicKey, bob.publicKey, carol.publicKey], //
    2,
  );
  const multisigAddress = multisigKey.toBase58();

  console.log(`Created 2/3 multisig ${multisigAddress}`);
  console.log(`https://explorer.solana.com/address/${multisigAddress}?cluster=devnet`);

  // GQDnfiPbgbC5CJ3VjZP6NFhgiESG6cqR1DZe94Wuvi9H
  // https://explorer.solana.com/address/GQDnfiPbgbC5CJ3VjZP6NFhgiESG6cqR1DZe94Wuvi9H?cluster=devnet
  return;
}

main().catch(console.error);
