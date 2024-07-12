import 'dotenv/config';
import bs58 from 'bs58';
import web3, { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';

export function generateMultisigMembers() {
  var secretKey = process.env.SOL_SECRET_KEY;
  var aliceKey = process.env.SOL_ALICE_KEY;
  var bobKey = process.env.SOL_BOB_KEY;
  var carolKey = process.env.SOL_CAROL_KEY;

  const creator = Keypair.fromSecretKey(bs58.decode(secretKey));
  const almighty = Keypair.fromSecretKey(bs58.decode(aliceKey));
  const proposer = Keypair.fromSecretKey(bs58.decode(bobKey));
  const voter = Keypair.fromSecretKey(bs58.decode(carolKey));

  return {
    almighty,
    proposer,
    voter,
    creator,
  };
}

export async function createAutonomousMultisig({
  connection,
  createKey = Keypair.generate(),
  creator,
  members,
  threshold,
  timeLock,
}: {
  createKey?: Keypair;
  creator: Keypair;
  members: multisig.generated.Member[];
  threshold: number;
  timeLock: number;
  connection: Connection;
}): Promise<[PublicKey, number]> {
  // Derive the multisig PDA
  const [multisigPda, multisigBump] = multisig.getMultisigPda({
    // The createKey has to be a Public Key, see accounts reference for more info
    createKey: createKey.publicKey,
  });

  const [programConfigPda] = multisig.getProgramConfigPda({});

  const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);

  const configTreasury = programConfig.treasury;

  const signature = await multisig.rpc.multisigCreateV2({
    connection,
    // One time random Key
    createKey,
    // The creator & fee payer
    creator,
    multisigPda,
    configAuthority: null,

    timeLock,
    threshold,
    members,
    // This means that there needs to be 1 votes for a transaction proposal to be approved
    rentCollector: null,
    treasury: configTreasury,
  });
  console.log('Multisig created : ', signature);
  await connection.confirmTransaction(signature);

  return [multisigPda, multisigBump];
}

export async function createAndSendV0Tx(
  connection: Connection,
  txInstructions: TransactionInstruction[],
  payerKey: web3.Keypair,
  signers: web3.Keypair[],
) {
  // Step 1 - Fetch Latest Blockhash
  let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash('finalized');
  console.log('   ✅ - Fetched latest blockhash. Last Valid Height:', lastValidBlockHeight);

  // Step 2 - Generate Transaction Message
  const messageV0 = new web3.TransactionMessage({
    payerKey: payerKey.publicKey,
    recentBlockhash: blockhash,
    instructions: txInstructions,
  }).compileToV0Message();
  console.log('   ✅ - Compiled Transaction Message');
  const transaction = new web3.VersionedTransaction(messageV0);

  // Step 3 - Sign your transaction with the required `Signers`
  transaction.sign(signers);
  console.log('   ✅ - Transaction Signed');

  // Step 4 - Send our v0 transaction to the cluster
  const txid = await connection.sendTransaction(transaction, { maxRetries: 5 });
  console.log('   ✅ - Transaction sent to network');

  // Step 5 - Confirm Transaction
  const confirmation = await connection.confirmTransaction({
    signature: txid,
    blockhash,
    lastValidBlockHeight,
  });
  if (confirmation.value.err) {
    throw new Error('   ❌ - Transaction not confirmed.');
  }
  console.log('🎉 Transaction Successfully Confirmed!', '\n', `https://explorer.solana.com/tx/${txid}?cluster=devnet`);
}

async function createLookupTable(connection: Connection, feePayer: Keypair, addresses: PublicKey[]) {
  // Step 1 - Fetch Latest Blockhash
  let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash('finalized');
  console.log('   ✅ - Fetched latest blockhash. Last Valid Height:', lastValidBlockHeight);

  const recentSlot = await connection.getSlot();
  console.log('Current Slot:', recentSlot);

  const [lookupTableInst, lookupTableAddress] = web3.AddressLookupTableProgram.createLookupTable({
    authority: feePayer.publicKey,
    payer: feePayer.publicKey,
    recentSlot: recentSlot,
  });

  const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
    payer: feePayer.publicKey,
    authority: feePayer.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });

  // Step 2 - Log Lookup Table Address
  console.log('Lookup Table Address:', lookupTableAddress.toBase58());

  // Step 3 - Generate a transaction and send it to the network
  await createAndSendV0Tx(connection, [lookupTableInst, extendInstruction], feePayer, [feePayer]);
}

export async function extendLookupTable(connection: Connection, feePayer: Keypair, lookupTable: PublicKey, addresses: PublicKey[]) {
  const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
    payer: feePayer.publicKey,
    authority: feePayer.publicKey,
    lookupTable,
    addresses: addresses,
  });

  // Step 1 - Log Lookup Table Address
  console.log('Lookup Table Address:', lookupTable.toBase58());

  // Step 2 - Generate a transaction and send it to the network
  await createAndSendV0Tx(connection, [extendInstruction], feePayer, [feePayer]);
  return lookupTable;
}
