import 'dotenv/config';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { BN } from 'bn.js';
import web3, { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import Squads, { DEFAULT_MULTISIG_PROGRAM_ID, Wallet, getAuthorityPDA, getMsPDA } from '@sqds/sdk';

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

var aliceKey = process.env.SOL_ALICE_KEY;
var bobKey = process.env.SOL_BOB_KEY;
var daveKey = process.env.SOL_DAVE_KEY;

// const payer = Keypair.fromSecretKey(bs58.decode(secretKey));
const payer = Keypair.fromSecretKey(bs58.decode(daveKey));
const alice = Keypair.fromSecretKey(bs58.decode(aliceKey));
const bob = Keypair.fromSecretKey(bs58.decode(bobKey));
const members = [payer, bob];

async function createMultisig() {
  // Random Public Key that will be used to derive a multisig PDA
  const squads = Squads.devnet(new Wallet(payer));

  // random key so no collision
  const createKey = new Keypair().publicKey;
  const threshold = 1;
  const members = [payer.publicKey];

  const name = 'Test Squad';
  const description = 'This is a test squad';

  try {
    const authorityIndex = 1;
    const multisigAccount = await squads.createMultisig(threshold, createKey, members, name, description);
    console.log('Successfully created a new multisig at', multisigAccount.publicKey.toBase58());
    console.log('Multisig account:', JSON.stringify(multisigAccount));
    const [vault] = getAuthorityPDA(multisigAccount.publicKey, new BN(authorityIndex), DEFAULT_MULTISIG_PROGRAM_ID);
    console.log('Default Vault address:', vault.toBase58());
  } catch (e) {
    console.log('Error:', e);
  }
}

// https://explorer.solana.com/tx/3AXZbBJiJkZNGA5DSm6GGc678u6Voru6yrNKu29GuJgfkyAUr8eqvZ3gRyh7k5WGB8eCsQcquX3oewENksS9L6rT?cluster=devnet
async function createMultisigAndFunding() {
  const recentBlockhash = 'u8wHFL3EGFZAe5avNWWVsYzPJaeqQpT4Um39p9VCKpn';
  const squads = Squads.devnet(new Wallet(payer));
  // Random Public Key that will be used to derive a multisig PDA
  // const createKey = new Keypair().publicKey;
  const createKey = new PublicKey('Lvvv4vRtuLZGnSQKvrT31NCj885dJ62bBfyUVxaS3G9');
  const threshold = 1;
  const members = [payer.publicKey];

  const name = '1-1';
  const description = '1-1 squards';
  console.log('payer public : ', payer.publicKey.toBase58());
  console.log('alice public : ', alice.publicKey.toBase58());

  try {
    const createMultisigInstruction = await squads.buildCreateMultisig(threshold, createKey, members, name, description);
    const [multisigPDA] = getMsPDA(createKey, DEFAULT_MULTISIG_PROGRAM_ID);
    assert.strictEqual(multisigPDA.toBase58(), '8NC7mZZhYpn1y2egFH1khc83xQJK1q3qjRqUFsrXAkCd', 'multisigPDA should equal.');

    const authorityPDA = squads.getAuthorityPDA(multisigPDA, 1);
    console.log('authorityPDA : ', authorityPDA.toBase58());
    assert.strictEqual(authorityPDA.toBase58(), '4SMaYiBx2xksjCwAhGqk6fh182X9QE51p6pxPCnac8MY', 'authorityPDA should equal.');
    const transferInstruction = web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: authorityPDA,
      lamports: 0.001 * LAMPORTS_PER_SOL,
    });

    var transaction = new web3.Transaction({
      recentBlockhash,
      feePayer: payer.publicKey,
    });

    const computeUnitsInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 0,
    });

    transaction.add(computeUnitsInstruction);
    transaction.add(createMultisigInstruction);
    transaction.add(transferInstruction);

    const serializedTransaction = transaction.serializeMessage();
    const signature = bs58.decode('3AXZbBJiJkZNGA5DSm6GGc678u6Voru6yrNKu29GuJgfkyAUr8eqvZ3gRyh7k5WGB8eCsQcquX3oewENksS9L6rT');
    transaction.addSignature(payer.publicKey, signature);

    const rawTransaction = transaction.serialize();
    console.log('RawTransaction : ', bs58.encode(rawTransaction));

    let isVerifiedSignature = transaction.verifySignatures();
    console.log(`The signatures were verified: ${isVerifiedSignature}`);
    return;
  } catch (e) {
    console.log('Error:', e);
  }
}

async function main() {
  // await createMultisig();
  await createMultisigAndFunding();
}

try {
  main();
} catch (e) {
  console.error(e);
}
