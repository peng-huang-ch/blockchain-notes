import 'dotenv/config';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';

var url = clusterApiUrl('devnet');

async function main() {
  const connection = new Connection(url, 'confirmed');
  // const ownerAddress = new PublicKey('3ejod8WdzSuQCXsY7jVvm74nBZr1JrxRnC1zZnxxBVWN'); // legacy
  const ownerAddress = new PublicKey('4WgeY3eNtTkUnmE85AxgJM17n1m3yAexnLjz12Fio2kk'); // multisig

  const balance = await connection.getBalance(ownerAddress);
  console.log('SOL	                                         Balance');
  console.log('------------------------------------------------------------');
  console.log(`${ownerAddress.toString()}   ${balance}`);

  const tokenAccounts = await connection.getTokenAccountsByOwner(ownerAddress, {
    programId: TOKEN_PROGRAM_ID,
  });

  console.log('Token                                         Balance');
  console.log('------------------------------------------------------------');
  tokenAccounts.value.forEach((tokenAccount) => {
    const accountData = AccountLayout.decode(tokenAccount.account.data);
    console.log(`${new PublicKey(accountData.mint)}   ${accountData.amount}`);
  });
}

main().catch(console.error);
