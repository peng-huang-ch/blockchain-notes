import 'dotenv/config';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { BN } from 'bn.js';
import web3, { Keypair, PublicKey, ComputeBudgetProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Squads, { Wallet, getTxPDA } from '@sqds/sdk';

var daveKey = process.env.SOL_DAVE_KEY;
const payer = Keypair.fromSecretKey(bs58.decode(daveKey));

const multisigPDA = new PublicKey('8NC7mZZhYpn1y2egFH1khc83xQJK1q3qjRqUFsrXAkCd');
const squads = Squads.devnet(new Wallet(payer));

/**
 * 1-1 approve-transaction
 */
// https://explorer.solana.com/tx/2wLktm5rjGEX7vBjVtwxkzJUPKFgyXFMcChhLf3gJfwJAZNy9fTJMGcswF568cDzbHG39m8DmFQnXLtx7BBUP9D?cluster=devnet
async function approveTransaction() {
  const recentBlockhash = '3r6C8EKcB1FQysbWggT6zQUhB9qRZKhf8DvkANCJwvaS';
  const authorityPDA = squads.getAuthorityPDA(multisigPDA, 1);
  const toPubkey = new PublicKey('5FuQRmLQ1kNX2Teq9bgHVHvrdsb3G6PKmWithyLfxsDt');
  const transactionIndex = new BN(2);
  const [txPDA] = getTxPDA(multisigPDA, transactionIndex, squads.multisigProgramId);
  assert.strictEqual(txPDA.toBase58(), '3gqdLNRS9wGJdX1QeqLAQcr5dhem3nzRJcGugi2xmTX9', 'txPDA should be equal.');

  const computeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 0,
  });

  const transferIx = web3.SystemProgram.transfer({
    fromPubkey: authorityPDA,
    toPubkey: toPubkey,
    lamports: LAMPORTS_PER_SOL * 0.001,
  });

  var transaction = new web3.Transaction({
    recentBlockhash,
    feePayer: payer.publicKey,
  });

  const activatedIx = await squads.buildActivateTransaction(multisigPDA, txPDA);
  const approveIx = await squads.buildApproveTransaction(multisigPDA, txPDA);

  transaction.add(transferIx);
  transaction.add(computeUnitPriceIx);
  transaction.add(activatedIx);
  transaction.add(approveIx);

  const signature = bs58.decode('2wLktm5rjGEX7vBjVtwxkzJUPKFgyXFMcChhLf3gJfwJAZNy9fTJMGcswF568cDzbHG39m8DmFQnXLtx7BBUP9D');
  transaction.addSignature(payer.publicKey, signature);

  const rawTransaction = transaction.serialize();
  console.log('RawTransaction : ', bs58.encode(rawTransaction));

  let isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verified: ${isVerifiedSignature}`);

  return;
}

/**
 * 1-1 execute-transaction
 * @returns
 */
// https://explorer.solana.com/tx/4B26gYV3uoeWe87gaVxHgZKBRzeqfdv6Fvtd3V3YhJsw3x2U8dM5u4rCBDAr9woH38izzdgBuqbv1QBvx3qRu8LT?cluster=devnet
async function executeTransaction() {
  const recentBlockhash = '2AyguSPeTKK3D1jvGkjgECk3f2GSvaPfe7Sed9nc5XG4';
  const transactionIndex = new BN(2);
  const [txPDA] = getTxPDA(multisigPDA, transactionIndex, squads.multisigProgramId);
  assert.strictEqual(txPDA.toBase58(), '3gqdLNRS9wGJdX1QeqLAQcr5dhem3nzRJcGugi2xmTX9', 'txPDA should be equal.');

  var transaction = new web3.Transaction({
    recentBlockhash,
    feePayer: payer.publicKey,
  });
  const computeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 0,
  });

  const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: 400_000,
  });

  const executeInstruction = await squads.buildExecuteTransaction(txPDA, payer.publicKey);

  transaction.add(computeUnitPriceInstruction);
  transaction.add(computeUnitLimitInstruction);
  transaction.add(executeInstruction);

  const signature = bs58.decode('4B26gYV3uoeWe87gaVxHgZKBRzeqfdv6Fvtd3V3YhJsw3x2U8dM5u4rCBDAr9woH38izzdgBuqbv1QBvx3qRu8LT');
  transaction.addSignature(payer.publicKey, signature);

  const rawTransaction = transaction.serialize();
  console.log('RawTransaction : ', bs58.encode(rawTransaction));

  let isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verified: ${isVerifiedSignature}`);
}

async function main() {
  // await approveTransaction();
  await executeTransaction();
}

try {
  main();
} catch (e) {
  console.error(e);
}
