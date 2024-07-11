import web3, {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import invariant from 'invariant';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

import { createAndSendV0Tx, generateMultisigMembers, extendLookupTable } from './utils';

const { Multisig } = multisig.accounts;

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

const { almighty, proposer, voter, creator } = generateMultisigMembers();

const lookupTablePda = new PublicKey('F8EKrArN5677PYF7NTjepUbBNNW2r2w17doziWWKjmSw');
const multisigPda = new PublicKey('5jScQQdYLABuQmhczMCmnPbAtPKyRaHDrdknSDq6oNrF');
const vaultIndex = 0;

/** Populate remaining accounts required for execution of the transaction. */
export function accountMetasForTransactionExecute({
  transactionPda,
  vaultPda,
  message,
  programId,
  ephemeralSignerBumps,
  addressLookupTableAccounts,
}: {
  message: multisig.generated.VaultTransactionMessage;
  ephemeralSignerBumps: number[];
  vaultPda: PublicKey;
  transactionPda: PublicKey;
  programId: PublicKey;
  addressLookupTableAccounts: web3.AddressLookupTableAccount[];
}): {
  /** Account metas used in the `message`. */
  accountMetas: web3.AccountMeta[];
  /** Address lookup table accounts used in the `message`. */
  lookupTableAccounts: web3.AddressLookupTableAccount[];
} {
  const ephemeralSignerPdas = ephemeralSignerBumps.map((_, additionalSignerIndex) => {
    return multisig.getEphemeralSignerPda({
      transactionPda,
      ephemeralSignerIndex: additionalSignerIndex,
      programId,
    })[0];
  });

  const addressLookupTableKeys = message.addressTableLookups.map(({ accountKey }) => accountKey);
  const addressLookupTableAccountsMap = new Map(addressLookupTableAccounts.map((account) => [account.key.toBase58(), account]));
  // Populate account metas required for execution of the transaction.
  const accountMetas: web3.AccountMeta[] = [];
  // First add the lookup table accounts used by the transaction. They are needed for on-chain validation.
  accountMetas.push(
    ...addressLookupTableKeys.map((key) => {
      return { pubkey: key, isSigner: false, isWritable: false };
    }),
  );
  // Then add static account keys included into the message.
  for (const [accountIndex, accountKey] of message.accountKeys.entries()) {
    accountMetas.push({
      pubkey: accountKey,
      isWritable: multisig.utils.isStaticWritableIndex(message, accountIndex),
      // NOTE: vaultPda and ephemeralSignerPdas cannot be marked as signers,
      // because they are PDAs and hence won't have their signatures on the transaction.
      isSigner:
        multisig.utils.isSignerIndex(message, accountIndex) &&
        !accountKey.equals(vaultPda) &&
        !ephemeralSignerPdas.find((k) => accountKey.equals(k)),
    });
  }
  // Then add accounts that will be loaded with address lookup tables.
  for (const lookup of message.addressTableLookups) {
    const lookupTableAccount = addressLookupTableAccountsMap.get(lookup.accountKey.toBase58());
    invariant(lookupTableAccount, `Address lookup table account ${lookup.accountKey.toBase58()} not found`);

    for (const accountIndex of lookup.writableIndexes) {
      const pubkey: PublicKey = lookupTableAccount.state.addresses[accountIndex];
      invariant(pubkey, `Address lookup table account ${lookup.accountKey.toBase58()} does not contain address at index ${accountIndex}`);
      accountMetas.push({
        pubkey,
        isWritable: true,
        // Accounts in address lookup tables can not be signers.
        isSigner: false,
      });
    }
    for (const accountIndex of lookup.readonlyIndexes) {
      const pubkey: PublicKey = lookupTableAccount.state.addresses[accountIndex];
      invariant(pubkey, `Address lookup table account ${lookup.accountKey.toBase58()} does not contain address at index ${accountIndex}`);
      accountMetas.push({
        pubkey,
        isWritable: false,
        // Accounts in address lookup tables can not be signers.
        isSigner: false,
      });
    }
  }

  return {
    accountMetas,
    lookupTableAccounts: addressLookupTableAccounts,
  };
}

/** Populate remaining accounts required for execution of the immediate execute transaction */
export function accountsForImmediateTransactionExecute({
  transactionPda,
  vaultPda,
  message,
  ephemeralSignerBumps = [],
  programId = multisig.PROGRAM_ID,
  addressLookupTableAccounts = [],
}: {
  message: web3.TransactionMessage;
  ephemeralSignerBumps: number[];
  vaultPda: PublicKey;
  transactionPda: PublicKey;
  programId?: PublicKey;
  addressLookupTableAccounts?: web3.AddressLookupTableAccount[];
}): {
  /** Account metas used in the `message`. */
  accountMetas: web3.AccountMeta[];
  /** Address lookup table accounts used in the `message`. */
  lookupTableAccounts: web3.AddressLookupTableAccount[];
} {
  const transactionMessageBytes = multisig.utils.transactionMessageToMultisigTransactionMessageBytes({
    message,
    addressLookupTableAccounts,
    vaultPda,
  });
  const [multiTxMsg] = multisig.types.transactionMessageBeet.deserialize(Buffer.from(transactionMessageBytes), 0);
  console.log('multiTxMsg : ', multiTxMsg);
  const accounts = accountMetasForTransactionExecute({
    transactionPda,
    vaultPda,
    message: multiTxMsg as unknown as multisig.generated.VaultTransactionMessage,
    ephemeralSignerBumps,
    addressLookupTableAccounts,
    programId,
  });
  // Mark all accounts as non-signers.
  //TODO Why? Because the multisig program will not sign the transaction with the vault PDA.
  accounts.accountMetas = accounts.accountMetas.map((acc) => Object.assign(acc, { isSigner: false }));
  return accounts;
}

// all in one transaction.
async function createVaultTransaction() {
  var { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // Step 1 - Fetch our address lookup table
  const lookupTable = await connection.getAddressLookupTable(lookupTablePda);
  console.log(`Successfully found lookup table: `, lookupTable.value?.key.toString(), lookupTable.context);

  // Step 2 - Fetch the accounts from the lookup table
  const map = new Map<string, web3.AddressLookupTableAccount>();
  if (lookupTable.value) map.set(lookupTablePda.toBase58(), lookupTable.value);
  const addressLookupTableAccounts = [lookupTable.value];
  // const addressLookupTableAccounts = undefined;
  console.log('addressLookupTableAccounts : ', addressLookupTableAccounts);

  const multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
  const rentCollector = multisigAccount.rentCollector;
  const transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;
  // const transactionIndex = 93n;
  console.log('transactionIndex : ', transactionIndex);

  // Transaction, index -> transactionPda.
  const [transactionPda] = multisig.getTransactionPda({
    multisigPda,
    index: transactionIndex,
  });

  // Transaction, index -> proposalPda.
  const [proposalPda] = multisig.getProposalPda({
    multisigPda,
    transactionIndex,
  });

  await extendLookupTable(connection, almighty, lookupTablePda, [transactionPda, proposalPda]);
  console.log('🎉 - Extend lookup table : ', lookupTablePda.toBase58());

  // Default vault, index 0.
  const [vaultPda] = multisig.getVaultPda({
    multisigPda,
    index: vaultIndex,
  });

  console.log('vaultPda       : ', vaultPda.toBase58());
  console.log('transactionIdx : ', transactionIndex);
  console.log('transactionPda : ', transactionPda.toBase58());
  console.log('proposalPda    : ', proposalPda.toBase58());

  const lamportsForMintRent = await getMinimumBalanceForRentExemptMint(connection);

  // so we use an Ephemeral Signer provided by the Multisig program as the Mint account.
  const [mintPda, mintBump] = multisig.getEphemeralSignerPda({
    transactionPda,
    ephemeralSignerIndex: 0,
    programId: multisig.PROGRAM_ID,
  });

  // user custom ix
  const transferIx = SystemProgram.transfer({
    fromPubkey: vaultPda,
    toPubkey: creator.publicKey,
    lamports: LAMPORTS_PER_SOL * 0.001,
  });
  console.log('mintPda : ', mintPda);
  const mint = new PublicKey('HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr');

  // Create transfer instruction
  // Get the token account of the fromWallet address, and if it does not exist, create it
  const fromTokenAccount = getAssociatedTokenAddressSync(mint, vaultPda, true);

  // Get the token account of the toWallet address, and if it does not exist, create it
  // const toAddress = almighty.publicKey;
  const toAddress = Keypair.generate().publicKey;
  const toTokenAccount = getAssociatedTokenAddressSync(mint, toAddress);
  const tokenAmount = 10_000;

  const createAssociatedTokenIx = createAssociatedTokenAccountIdempotentInstruction(vaultPda, toTokenAccount, toAddress, mint);
  const tokenTransferIx = createTransferInstruction(fromTokenAccount, toTokenAccount, vaultPda, tokenAmount);

  const txMsg = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: [
      SystemProgram.createAccount({
        fromPubkey: vaultPda,
        newAccountPubkey: mintPda,
        space: MINT_SIZE,
        lamports: lamportsForMintRent,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(mintPda, 9, vaultPda, vaultPda, TOKEN_2022_PROGRAM_ID),
      // transferIx,
      // createAssociatedTokenIx,
      // tokenTransferIx,
    ],
  });

  // Create a vault transaction (Executed).
  const transactionCreateIx = multisig.instructions.vaultTransactionCreate({
    multisigPda,
    transactionIndex,
    vaultIndex,
    /** Number of additional signing PDAs required by the transaction. */
    ephemeralSigners: 1,
    /** Transaction message to wrap into a multisig transaction. */
    transactionMessage: txMsg,
    /** `AddressLookupTableAccount`s referenced in `transaction_message`. */
    addressLookupTableAccounts,
    memo: 'send 0.001 sol',
    creator: almighty.publicKey,
    // rentPayer: rentPayer, // rent payer
  });

  const proposalCreateIx = multisig.instructions.proposalCreate({
    multisigPda,
    transactionIndex,
    creator: proposer.publicKey,
  });

  // Approve the proposal by the first member.
  const proposalApproveIx1 = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex,
    member: voter.publicKey,
  });

  // Approve the proposal by the second member.
  const proposalApproveIx2 = multisig.instructions.proposalApprove({
    multisigPda,
    transactionIndex,
    member: almighty.publicKey,
  });

  const { accountMetas: anchorRemainingAccounts } = accountsForImmediateTransactionExecute({
    transactionPda,
    vaultPda,
    message: txMsg,
    ephemeralSignerBumps: [mintBump],
    addressLookupTableAccounts,
  });

  const executeTransactionIx = multisig.generated.createVaultTransactionExecuteInstruction({
    multisig: multisigPda,
    proposal: proposalPda,
    transaction: transactionPda,
    anchorRemainingAccounts,
    member: almighty.publicKey,
  });

  const accountsCloseIx = multisig.generated.createVaultTransactionAccountsCloseInstruction({
    multisig: multisigPda,
    rentCollector,
    proposal: proposalPda,
    transaction: transactionPda,
  });

  const feePayer = almighty.publicKey;
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [
      transactionCreateIx, // create transaction
      proposalCreateIx, // proposal create transaction
      proposalApproveIx1, // proposal approve transaction
      proposalApproveIx2, // proposal approve transaction
      executeTransactionIx, // execute transaction
      // accountsCloseIx, // close tx and proposal accounts
    ],
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(message);

  tx.sign([almighty, proposer, voter]);

  const created = await connection.sendTransaction(tx);
  console.log('created signature : ', created);
  await connection.confirmTransaction({
    signature: created,
    blockhash,
    lastValidBlockHeight,
  });
  console.log('signature confirmed: ', created);
  return;

  // Execute the transaction.
  var { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  const executing = await multisig.rpc.vaultTransactionExecute({
    connection,
    feePayer: almighty,
    multisigPda,
    transactionIndex,
    member: almighty.publicKey,
    signers: [almighty],
  });

  await connection.confirmTransaction({
    signature: executing,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('executing signature: ', executing);
  return;

  const closed = await multisig.rpc.vaultTransactionAccountsClose({
    connection,
    feePayer: almighty,
    multisigPda,
    rentCollector,
    transactionIndex,
  });

  await connection.confirmTransaction({
    signature: closed,
    blockhash,
    lastValidBlockHeight,
  });

  console.log('closed signature: ', closed);
}

// async function execute(transactionIndex: bigint) {
//   const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
//   const signature = await multisig.rpc.vaultTransactionExecute({
//     connection,
//     feePayer: almighty,
//     multisigPda,
//     transactionIndex,
//     member: almighty.publicKey,
//     signers: [almighty],
//     sendOptions: { skipPreflight: true },
//     // programId,
//   });
//   await connection.confirmTransaction({
//     signature,
//     blockhash,
//     lastValidBlockHeight,
//   });
//   console.log('execute signature: ', signature);
// }

async function main() {
  // await createLookupTable();
  await createVaultTransaction();
  // await execute(transactionIndex);
}

main();

// try {
//   main();
// } catch (e) {
//   console.log('e');
//   console.error(e);
// } finally {
//   console.log('done');
// }
