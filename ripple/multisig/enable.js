const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net/', // Public rippled server
});

const jon = {
  account: 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS',
  secret: 'snuALrXSwbTHpWft3ibTA9ZzszC22',
};
const aya = {
  account: 'rhV1ZJ5SHs8Spbu4aXjAE225a1CzfoJnru',
  secret: 'sndxPdZnfUzxKyaB6XwFsnETwrtTX',
};
const bran = {
  account: 'rweTZdJmr67cVuWnqqUQbUqcDGugpnRehc',
  secret: 'ss2Zoo3b7DvbijGxrD8TtSatHCohU',
};

// const from_address = 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc';
// const secret = 'ssHAaRfvdDsF62da3dpDHgxHSnw4d';

const from_address = 'rDerjU2jeRvGmRDpfRoSFkbYen4dXzuSrH';
const secret = 'snQ8ipa9zdwX1taPZCmLq5RLNTrJR';

async function main() {
  await api.connect();

  const account = await api.getAccountInfo(from_address);
  console.log('account', account);

  const preparedTx = await api.prepareTransaction(
    {
      TransactionType: 'AccountSet',
      Account: from_address,
      ClearFlag: 4,
    },
    {
      // Expire this transaction if it doesn't execute within ~5 minutes:
      signersCount: 2,
    }
  );
  console.log('prepare', preparedTx);
  //   return;

  const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
  console.log('Prepared transaction instructions:', preparedTx.txJSON);
  console.log('Transaction cost:', preparedTx.instructions.fee, 'XRP');
  console.log('Transaction expires after ledger:', maxLedgerVersion);

  //   return;
  const jonSign = api.sign(preparedTx.txJSON, jon.secret, { signAs: jon.account }).signedTransaction;
  const ayaSign = api.sign(preparedTx.txJSON, aya.secret, { signAs: aya.account }).signedTransaction;

  // signatures are combined and submitted
  const combinedTx = api.combine([jonSign, ayaSign]);

  const tx_signed = combinedTx.signedTransaction;
  const txID = combinedTx.id;
  console.log('Identifying hash:', txID);
  console.log('Signed tx:', tx_signed);

  // const ledgerVersion = await api.getLedgerVersion();
  // const earliestLedgerVersion = ledgerVersion + 1;

  // return;
  const result = await api.submit(tx_signed);
  console.log('Tentative result code:', result.resultCode);
  console.log('Tentative result message:', result.resultMessage);

  return api.disconnect();
}

main().then().catch(console.error);
