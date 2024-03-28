import dotenv from 'dotenv';
import bs58 from 'bs58';
import web3 from '@solana/web3.js';

dotenv.config();

// Connect to cluster
var url = web3.clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new web3.Connection(url, 'confirmed');

var secretKey = process.env.SOL_SECRET_KEY;
console.log('secretKey : ', secretKey);

async function sendTransaction() {
  var keypair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
  var fromPubkey = keypair.publicKey;

  console.log('keypair address : ', keypair.publicKey.toBase58());
  console.log('keypair public : ', keypair.publicKey.toString());
  console.log('keypair secret : ', bs58.encode(keypair.secretKey));

  // Generate a new random public key
  var to = web3.Keypair.generate();
  var toPubkey = new web3.PublicKey('5FuQRmLQ1kNX2Teq9bgHVHvrdsb3G6PKmWithyLfxsDt');

  const transferIx = web3.SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey,
    lamports: web3.LAMPORTS_PER_SOL / 1,
  });
  // Add transfer instruction to transaction
  var transaction = new web3.Transaction().add(transferIx);
  // Sign transaction, broadcast, and confirm
  var signature = await web3.sendAndConfirmTransaction(connection, transaction, [keypair]);
  console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

// https://solana.com/docs/core/transactions/versions
async function sendVersionedTransaction() {
  var payer = web3.Keypair.fromSecretKey(bs58.decode(secretKey));

  // Generate a new random public key
  var toPubkey = new web3.PublicKey('5FuQRmLQ1kNX2Teq9bgHVHvrdsb3G6PKmWithyLfxsDt');
  let blockhash = await connection.getLatestBlockhash().then((res) => res.blockhash);

  const transferIx = web3.SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey,
    lamports: web3.LAMPORTS_PER_SOL / 1000,
  });
  const instructions = [transferIx];
  // create v0 compatible message
  const messageV0 = new web3.TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  // Create a new VersionedTransaction, passing in our v0 compatible message:
  const transaction = new web3.VersionedTransaction(messageV0);

  // sign your transaction with the required `Signers`
  transaction.sign([payer]);

  // send our v0 transaction to the cluster
  const signature = await connection.sendTransaction(transaction);
  console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

async function main() {
  // await sendTransaction();

  await sendVersionedTransaction();
}

main().catch(console.error);
