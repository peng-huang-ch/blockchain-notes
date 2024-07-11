import 'dotenv/config';
import bs58 from 'bs58';
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

var url = clusterApiUrl('testnet');
var connection = new Connection(url, 'confirmed');
console.log('Connection established', url);

var aliceKey = process.env.SOL_ALICE_KEY;
var bobKey = process.env.SOL_BOB_KEY;

const alice = Keypair.fromSecretKey(bs58.decode(aliceKey));
const bob = Keypair.fromSecretKey(bs58.decode(bobKey));
const multiSigners = [alice, bob];

// TODO: complete it.
async function main() {
  // multisig address
  var fromPubkey = new PublicKey('4WgeY3eNtTkUnmE85AxgJM17n1m3yAexnLjz12Fio2kk');
  // const ownerAddress = fromPubkey;
  var toPubkey = new PublicKey('3ejod8WdzSuQCXsY7jVvm74nBZr1JrxRnC1zZnxxBVWN');

  // const transferInstruction = SystemProgram.transfer({
  //   fromPubkey: fromAddress,
  //   toPubkey: ownerAddress,
  //   lamports: LAMPORTS_PER_SOL / 100,
  // });
  // const transaction = new Transaction().add(transferInstruction);

  // Add transfer instruction to transaction
  const transferIx = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports: LAMPORTS_PER_SOL / 1,
  });
  const transaction = new Transaction({
    feePayer: alice.publicKey,
  });

  transaction.add(transferIx);
  // transaction.feePayer = fromPubkey;

  // Sign transaction, broadcast, and confirm
  const signature = await sendAndConfirmTransaction(connection, transaction, [alice, ...multiSigners], {
    commitment: 'singleGossip',
    preflightCommitment: 'singleGossip',
  });
  console.log('SIGNATURE', signature);

  // // Transfer the sol to the "toAddress"
  // signature = await transfer(
  //   connection,
  //   payerWallet,
  //   fromAddress,
  //   toAddress, //
  //   ownerAddress,
  //   10 ** 1,
  //   multiSigners,
  // );

  console.log('transfer tx:', signature);
}

// main().catch(console.error);
