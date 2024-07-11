import { clusterApiUrl, Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';

import { createAutonomousMultisig, generateMultisigMembers } from './utils';

const { Permissions, Permission } = multisig.types;
const { Multisig } = multisig.accounts;

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

const { almighty, proposer, voter, creator } = generateMultisigMembers();

// all in one transaction.
async function main() {
  const { blockhash } = await connection.getLatestBlockhash();
  console.log('creator address  : ', creator.publicKey.toBase58());
  console.log('almighty address : ', almighty.publicKey.toBase58());

  const rentCollector = almighty.publicKey;
  var [multisigPda] = await createAutonomousMultisig({
    connection,
    creator,
    members: [
      { key: almighty.publicKey, permissions: Permissions.all() },
      { key: proposer.publicKey, permissions: Permissions.fromPermissions([Permission.Initiate]) },
      { key: voter.publicKey, permissions: Permissions.fromPermissions([Permission.Vote]) },
    ],
    threshold: 1,
    timeLock: 0,
  });
  // console.log('multisigPda : ', multisigPda.toBase58());
  var multisigPda = new PublicKey('5jScQQdYLABuQmhczMCmnPbAtPKyRaHDrdknSDq6oNrF');

  var multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);
  const transactionIndex = multisig.utils.toBigInt(multisigAccount.transactionIndex) + 1n;
  console.log('transactionIndex : ', transactionIndex);

  const createTransactionIx = multisig.instructions.configTransactionCreate({
    multisigPda,
    transactionIndex,
    creator: almighty.publicKey,
    // Change threshold to 2.
    // actions: [{ __kind: 'ChangeThreshold', newThreshold: 2 }],
    actions: [{ __kind: 'SetRentCollector', newRentCollector: rentCollector }],
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

  const executeTransactionIx = multisig.instructions.configTransactionExecute({
    multisigPda,
    transactionIndex,
    member: almighty.publicKey,
    rentPayer: almighty.publicKey,
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
  await connection.confirmTransaction(signature);

  // Verify the multisig account.
  var multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);

  const threshold = multisigAccount.threshold;

  console.log('threshold: ', threshold);
}

try {
  main();
} catch (e) {
  console.error(e);
}
