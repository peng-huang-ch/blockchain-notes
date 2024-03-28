import dotenv from 'dotenv';
import bs58 from 'bs58';
import web3, { PublicKey } from '@solana/web3.js';
dotenv.config();

var secretKey = process.env.SOL_SECRET_KEY;

async function main() {
  // Connect to cluster
  var url = web3.clusterApiUrl('devnet');
  var connection = new web3.Connection(url, 'confirmed');

  // Generate a new random public key
  // var keypair = web3.Keypair.generate();
  var keypair = web3.Keypair.fromSecretKey(bs58.decode(secretKey));
  var pubkey = keypair.publicKey;

  console.log('keypair address : ', keypair.publicKey.toBase58());
  console.log('keypair public : ', keypair.publicKey.toString());

  // const toPubkey = new web3.PublicKey('5FuQRmLQ1kNX2Teq9bgHVHvrdsb3G6PKmWithyLfxsDt');
  // 1 - Request Airdrop
  var pubkey = new PublicKey('6j1VwNJJSTupxayXxx7bsfwPjBiccpBZprjHRmS21LAQ');
  var signature = await connection.requestAirdrop(pubkey, web3.LAMPORTS_PER_SOL);
  console.log('signature : ', signature);

  // 2 - Fetch the latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  // 3 - Confirm transaction success
  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature,
    },
    'finalized',
  );
  // 4 - Log results
  console.log(`Tx Complete: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  return;
}

main().catch(console.error);
