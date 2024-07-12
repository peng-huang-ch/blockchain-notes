import 'dotenv/config';
import bs58 from 'bs58';
import { clusterApiUrl, Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, transfer, createMultisig } from '@solana/spl-token';

var url = clusterApiUrl('devnet');
var connection = new Connection(url, 'confirmed');

var secretKey = process.env.SOL_SECRET_KEY;
const fromWallet = Keypair.fromSecretKey(bs58.decode(secretKey));

// console.log('from address : ', fromWallet.publicKey.toString());

async function main() {
  // Generate a new wallet to receive newly minted token
  const toWallet = Keypair.generate();
  const toAddress = toWallet.publicKey;
  // multisig address
  const fromPubkey = new PublicKey('4WgeY3eNtTkUnmE85AxgJM17n1m3yAexnLjz12Fio2kk');

  // Create new token mint
  // const mint = await createMint(connection, fromWallet, fromWallet.publicKey, fromWallet.publicKey, 9);
  // EURC
  const mint = new PublicKey('HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr');

  // Get the token account of the fromWallet address, and if it does not exist, create it
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, fromPubkey);

  // Get the token account of the toWallet address, and if it does not exist, create it
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toAddress);

  // Mint 1 new token to the "fromTokenAccount" account we just created
  let signature = await mintTo(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet.publicKey, //
    10 ** 9 * 10 ** 6,
  );

  console.log('mint tx:', signature);

  await connection.confirmTransaction(signature, 'confirmed');

  // // Transfer the new token to the "toTokenAccount" we just created
  // signature = await transfer(
  //   connection,
  //   fromWallet,
  //   fromTokenAccount.address,
  //   toTokenAccount.address, //
  //   fromWallet.publicKey,
  //   50,
  // );

  // console.log('transfer tx:', signature);
}

main().catch(console.error);
