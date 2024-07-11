import 'dotenv/config';
import bs58 from 'bs58';
import web3, { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionMessage } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

var secretKey = process.env.SOL_SECRET_KEY;
var aliceKey = process.env.SOL_ALICE_KEY;
var bobKey = process.env.SOL_BOB_KEY;
var carolKey = process.env.SOL_CAROL_KEY;

const creator = Keypair.fromSecretKey(bs58.decode(secretKey));
const almighty = Keypair.fromSecretKey(bs58.decode(aliceKey));
const proposer = Keypair.fromSecretKey(bs58.decode(bobKey));
const voter = Keypair.fromSecretKey(bs58.decode(carolKey));

// send sol.
async function main() {
  var { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  console.log('creator  address  : ', creator.publicKey.toBase58()); // 3ejod8WdzSuQCXsY7jVvm74nBZr1JrxRnC1zZnxxBVWN
  console.log('almighty address : ', almighty.publicKey.toBase58()); // 9XPq2y985ouFBUQ9ddRk25sL1HAwEaQdHGCKeBptMzBj
  console.log('proposer address : ', proposer.publicKey.toBase58()); // GNxKGSCFYyzpnMo6qgi9BBJuS9sFsFKsX3DNGXXULJJG
  console.log('voter    address : ', voter.publicKey.toBase58()); // ExdJWJT6TNh8mWeri1y6iEsYy5WRvDTF3FhJ2JudbiFi

  // 9XPq2y985ouFBUQ9ddRk25sL1HAwEaQdHGCKeBptMzBj,ExdJWJT6TNh8mWeri1y6iEsYy5WRvDTF3FhJ2JudbiFi,GNxKGSCFYyzpnMo6qgi9BBJuS9sFsFKsX3DNGXXULJJG
  var multisigPda = new PublicKey('5jScQQdYLABuQmhczMCmnPbAtPKyRaHDrdknSDq6oNrF');

  // Get the current multisig transaction index
  var multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  var transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex);
  const newTransactionIndex = transactionIndex + 1n;

  const vaultIndex = 0;
  // Default vault, index 0.
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: vaultIndex,
  });

  const instruction = web3.SystemProgram.transfer({
    // The transfer is being signed from the Squads Vault, that is why we use the VaultPda
    fromPubkey: vaultPda,
    toPubkey: almighty.publicKey,
    lamports: 0.001 * LAMPORTS_PER_SOL,
  });

  // This message contains the instructions that the transaction is going to execute
  const transferMessage = new TransactionMessage({
    payerKey: almighty.publicKey,
    recentBlockhash: blockhash,
    instructions: [instruction],
  });

  const vaultSignature = await multisig.rpc.vaultTransactionCreate({
    connection,
    multisigPda,
    transactionIndex: newTransactionIndex,
    vaultIndex,
    ephemeralSigners: 0,
    transactionMessage: transferMessage,
    memo: 'Transfer 0.001 SOL to creator',
    creator: almighty.publicKey,
    feePayer: creator,
    rentPayer: creator.publicKey,
    signers: [almighty, creator],
  });

  await connection.confirmTransaction({
    signature: vaultSignature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('Transaction created: ', vaultSignature);

  var { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // proposal
  const proposalSignature = await multisig.rpc.proposalCreate({
    connection,
    multisigPda,
    transactionIndex: newTransactionIndex,
    creator: proposer,
    feePayer: creator,
  });

  await connection.confirmTransaction({
    signature: proposalSignature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('Transaction proposal created: ', proposalSignature);

  var multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
  var transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex);

  // first member approve
  const approveSignature1 = await multisig.rpc.proposalApprove({
    connection,
    multisigPda,
    transactionIndex,
    member: almighty,
    feePayer: creator,
  });

  await connection.confirmTransaction({
    signature: approveSignature1,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('Transaction proposal-1 approved: ', approveSignature1);

  // second member approve
  const approveSignature2 = await multisig.rpc.proposalApprove({
    connection,
    multisigPda,
    transactionIndex,
    member: voter,
    feePayer: creator,
  });

  await connection.confirmTransaction({
    signature: approveSignature2,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('Transaction proposal-2 approved: ', approveSignature2);

  // VaultTransactionExecute
  var { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  var multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
  var transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex);
  const executeSignature = await multisig.rpc.vaultTransactionExecute({
    connection,
    multisigPda,
    transactionIndex,
    sendOptions: { skipPreflight: true },
    member: almighty.publicKey,
    feePayer: almighty,
    signers: [almighty],
  });

  await connection.confirmTransaction({
    signature: executeSignature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('Transaction executed: ', executeSignature);

  // Verify the multisig account.
  console.log('transactionIndex: ', multisigAccount.transactionIndex.toString());
}

try {
  main();
} catch (e) {
  console.error(e);
}
