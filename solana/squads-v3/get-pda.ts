import dotenv from 'dotenv';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
dotenv.config();

const { Multisig } = multisig.accounts;

// Cluster Connection
var url = clusterApiUrl('devnet');
console.log('url         : ', url);
var connection = new Connection(url, 'confirmed');

async function main() {
  const createAddress = 'Hgucdc61K96b5Vs6PSEe2Sat9w7jKXMJmr6mkJVXXEqk';
  const createKey = new PublicKey(createAddress);
  const [multisigPda] = multisig.getMultisigPda({
    createKey,
  });

  const multisigAccount = await Multisig.fromAccountAddress(connection, multisigPda);

  // Log out the multisig's members
  console.log('Members : ', multisigAccount.members);
}

try {
  main();
} catch (e) {
  console.error(e);
}
