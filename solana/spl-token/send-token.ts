import 'dotenv/config';
import assert from 'node:assert';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import web3, {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

const url = clusterApiUrl('devnet');
const connection = new Connection(url, 'confirmed');
const commitment = 'confirmed';

async function tokenMint(fromWallet: Keypair, decimals: number, amount: number): Promise<PublicKey> {
  const fromPublicKey = fromWallet.publicKey;
  // Create new token mint
  // const mint = await createMint(connection, fromWallet, fromWallet.publicKey, fromWallet.publicKey, 6);
  // or existing mint
  // const mint = new PublicKey('HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr');
  const mint = new PublicKey('HecDWFMjyn9LMHvRvFmUouzmDWz77HRoJg8w5Lv1BtiJ');
  // Get the token account of the fromWallet address, and if it does not exist, create it
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromPublicKey, true);

  // Mint 1 new token to the "fromTokenAccount" account we just created
  let signature = await mintTo(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet.publicKey, //
    amount * 10 ** decimals,
  );
  console.log('from token address :', fromTokenAccount.address.toBase58());
  console.log('mint tx : ', signature);
  await connection.confirmTransaction(signature, commitment);
  return mint;
}

async function tokenTransfer(fromWallet: Keypair, toPublicKey: PublicKey, mint: PublicKey, amount: number) {
  const fromPublicKey = fromWallet.publicKey;
  const feePayer = fromWallet.publicKey;

  // Get the token account of the fromWallet address
  const fromTokenAccount = getAssociatedTokenAddressSync(mint, fromPublicKey, true);
  const fromAssociatedTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromPublicKey, true);

  assert.strictEqual(fromAssociatedTokenAccount.address.toBase58(), fromTokenAccount.toBase58(), 'fromAssociatedTokenAccount.address');
  const balance = await connection.getTokenAccountBalance(fromAssociatedTokenAccount.address);
  console.log('balance', balance);
  assert.strict(BigInt(balance.value.amount) > BigInt(0), 'balance should be greater than 0');

  // Get the token account of the toWallet address
  const toTokenAccount = getAssociatedTokenAddressSync(mint, toPublicKey, true);

  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(fromPublicKey, toTokenAccount, toPublicKey, mint),
    createTransferInstruction(fromTokenAccount, toTokenAccount, fromPublicKey, BigInt(amount)),
  ];
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: fromPublicKey,
    recentBlockhash: blockhash,
    instructions, // note this is an array of instructions
  }).compileToV0Message();

  const transactionV0 = new VersionedTransaction(messageV0);

  const msg = messageV0.serialize();
  const signature = nacl.sign.detached(msg, fromWallet.secretKey);
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
  const aliceKey = process.env.SOL_SECRET_KEY;
  // const bobKey = process.env.SOL_BOB_KEY;
  const fromWallet = Keypair.fromSecretKey(bs58.decode(aliceKey));
  const toPubkey = Keypair.generate().publicKey;
  // const toWallet = Keypair.fromSecretKey(bs58.decode(bobKey));
  const decimals = 6;
  const amount = 1 * 10 ** decimals;
  // const token = await tokenMint(fromWallet, decimals, amount);

  const token = new PublicKey('HecDWFMjyn9LMHvRvFmUouzmDWz77HRoJg8w5Lv1BtiJ');
  await tokenTransfer(fromWallet, toPubkey, token, amount);
}

main();
