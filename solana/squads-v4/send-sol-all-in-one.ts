import dotenv from 'dotenv';
import bs58 from 'bs58';
import web3, {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  getMint,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import * as multisig from '@sqds/multisig';
dotenv.config();

import { createAutonomousMultisig } from './utils';
const { Permissions, Permission } = multisig.types;
const { Multisig } = multisig.accounts;

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

// all in one transaction.
async function main() {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  console.log('creator address  : ', creator.publicKey.toBase58());
  console.log('almighty address : ', almighty.publicKey.toBase58());

  var multisigPda = new PublicKey('5jScQQdYLABuQmhczMCmnPbAtPKyRaHDrdknSDq6oNrF');

  const multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
  const transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;

  const vaultIndex = 0;
  // Default vault, index 0.
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: vaultIndex,
  });
  const [proposalPda] = multisig.getProposalPda({
    multisigPda,
    transactionIndex,
  });

  const [transactionPda] = multisig.getTransactionPda({
    multisigPda,
    index: transactionIndex,
  });

  // const transactionAccount = await multisig.generated.VaultTransaction.fromAccountAddress(connection, transactionPda);

  // mint account is a signer in the SystemProgram.createAccount ix,
  // so we use an Ephemeral Signer provided by the Multisig program as the from account.
  // const [ephemeralPda, ephemeralBump] = multisig.getEphemeralSignerPda({
  //   transactionPda,
  //   ephemeralSignerIndex: 0,
  // });

  const transactionMessage = new TransactionMessage({
    instructions: [
      web3.SystemProgram.transfer({
        fromPubkey: vaultPda,
        toPubkey: proposer.publicKey,
        lamports: LAMPORTS_PER_SOL * 0.001,
      }),
    ],
    payerKey: almighty.publicKey,
    recentBlockhash: blockhash,
  });

  const createTransactionIx = multisig.instructions.vaultTransactionCreate({
    multisigPda,
    transactionIndex,
    vaultIndex,
    /** Number of additional signing PDAs required by the transaction. */
    ephemeralSigners: 2,
    /** Transaction message to wrap into a multisig transaction. */
    transactionMessage,
    /** `AddressLookupTableAccount`s referenced in `transaction_message`. */
    // addressLookupTableAccounts?: AddressLookupTableAccount[];
    memo: 'send 0.001 sol',
    creator: almighty.publicKey,
    rentPayer: almighty.publicKey,
  });

  const createProposalIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex,
    creator: almighty.publicKey,
  });

  const approveProposalIx1 = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex,
    member: almighty.publicKey,
  });

  const approveProposalIx2 = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex,
    member: voter.publicKey,
  });

  const executeTransactionIx = multisig.generated.createVaultTransactionExecuteInstruction({
    multisig: multisigPda,
    member: almighty.publicKey,
    proposal: proposalPda,
    transaction: transactionPda,
    // anchorRemainingAccounts: [],
  });

  const message = new TransactionMessage({
    payerKey: almighty.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      createTransactionIx, // create transaction
      createProposalIx, // proposal transaction
      approveProposalIx1, // approve transaction
      approveProposalIx2, // approve transaction
      executeTransactionIx, // execute transaction
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);

  tx.sign([almighty, voter]);

  const signature = await connection.sendTransaction(tx);
  console.log('signature : ', signature);
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  // Verify the multisig account.

  const newTransactionIndex = multisigAccount.transactionIndex;

  console.log('transactionIndex: ', newTransactionIndex);
}

try {
  main();
} catch (e) {
  console.error(e);
}
