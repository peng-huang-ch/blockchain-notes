import 'dotenv/config';
import bs58 from 'bs58';
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';

const { Permissions, Permission } = multisig.types;

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

var secretKey = process.env.SOL_SECRET_KEY;
var aliceKey = process.env.SOL_ALICE_KEY;
var bobKey = process.env.SOL_BOB_KEY;

const payer = Keypair.fromSecretKey(bs58.decode(secretKey));
const alice = Keypair.fromSecretKey(bs58.decode(aliceKey));
const bob = Keypair.fromSecretKey(bs58.decode(bobKey));
const members = [payer, bob];

// Create a new multisig.
async function main() {
  // Random Public Key that will be used to derive a multisig PDA
  const createKey = Keypair.generate();

  // Creator should be a Keypair or a Wallet Adapter wallet
  const creator = payer;

  // Derive the multisig PDA
  const [multisigPda, multisigDump] = multisig.getMultisigPda({
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
    timeLock: 0,
    // List of the members to add to the multisig
    members: [
      {
        // Members Public Key
        key: creator.publicKey,
        // Members permissions inside the multisig
        permissions: Permissions.all(),
      },
      {
        key: alice.publicKey,
        // Member can only add votes to proposed transactions
        permissions: Permissions.fromPermissions([Permission.Vote]),
      },
    ],
    // This means that there needs to be 2 votes for a transaction proposal to be approved
    threshold: 2,
    rentCollector: null,
    treasury: configTreasury,
    sendOptions: { skipPreflight: true },
  });
  console.log('Multisig  Pda: ', multisigPda.toBase58());
  console.log('Multisig created: ', signature);
}

try {
  main();
} catch (e) {
  console.error(e);
}
