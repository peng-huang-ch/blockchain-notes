import 'dotenv/config';
import assert from 'node:assert';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import web3, {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  Commitment,
} from '@solana/web3.js';

const url = clusterApiUrl('devnet');
const connection = new Connection(url, 'confirmed');
console.log('Connection established', url);

async function legacy(from: Keypair, to: Keypair, amount: number, commitment: Commitment) {
  console.log('from publicKey', from.publicKey.toBase58());
  console.log('to publicKey', to.publicKey.toBase58());

  const fromPubkey = from.publicKey;
  const toPubkey = to.publicKey;

  // Add transfer instruction to transaction
  const transferIx = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports: amount,
  });

  const recentBlockhash = await connection.getLatestBlockhash();
  const transaction = new web3.Transaction({
    recentBlockhash: recentBlockhash.blockhash,
    feePayer: fromPubkey,
  });
  transaction.add(transferIx);

  const transactionBuffer = transaction.serializeMessage();
  const signature = nacl.sign.detached(transactionBuffer, from.secretKey);

  transaction.addSignature(fromPubkey, Buffer.from(signature));

  let isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verified: ${isVerifiedSignature}`);

  // The signatures were verified: true

  const rawTransaction = transaction.serialize();
  const txid = await connection.sendRawTransaction(rawTransaction, {
    // skipPreflight: true,
    preflightCommitment: commitment,
    maxRetries: 2,
  });
  assert.strictEqual(txid, bs58.encode(signature), 'txid should be the same as signature');
  console.log('txid', txid);
  return txid;
}

async function versioned(from: Keypair, to: Keypair, amount: number, commitment: Commitment) {
  console.log('from publicKey', from.publicKey.toBase58());
  console.log('to publicKey', to.publicKey.toBase58());

  const fromPubkey = from.publicKey;
  const toPubkey = to.publicKey;
  const feePayer = from.publicKey;

  // Add transfer instruction to transaction
  const transferIx = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports: amount,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [transferIx], // note this is an array of instructions
  }).compileToV0Message();

  const transactionV0 = new VersionedTransaction(messageV0);

  const msg = messageV0.serialize();
  const signature = nacl.sign.detached(msg, from.secretKey);
  transactionV0.addSignature(feePayer, signature);

  // The signatures were verified: true
  const isVerifiedSignature = nacl.sign.detached.verify(msg, signature, new PublicKey(feePayer).toBuffer());
  console.log(`The signatures were verified: ${isVerifiedSignature}`);

  // send transaction
  const raw = transactionV0.serialize();
  const txid = await connection.sendRawTransaction(raw, {
    // skipPreflight: true,
    preflightCommitment: commitment,
    maxRetries: 2,
  });

  assert.strictEqual(txid, bs58.encode(signature), 'txid should be the same as signature');
  console.log('txid', txid);
  return txid;
}

async function main() {
  const aliceKey = process.env.SOL_ALICE_KEY;
  const bobKey = process.env.SOL_BOB_KEY;
  const from = Keypair.fromSecretKey(bs58.decode(aliceKey));
  const to = Keypair.fromSecretKey(bs58.decode(bobKey));

  const amount = LAMPORTS_PER_SOL / 100;
  const commitment = 'confirmed';
  console.log('endpoint', url);

  await legacy(from, to, amount, commitment);
  await versioned(from, to, amount, commitment);
}

main().catch(console.error);
