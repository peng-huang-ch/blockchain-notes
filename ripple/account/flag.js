const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net/', // Public rippled server
});

const from_address = 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS';
const from_secret = 'snuALrXSwbTHpWft3ibTA9ZzszC22';

const dest_address = 'rhV1ZJ5SHs8Spbu4aXjAE225a1CzfoJnru';
const dest_secret = 'sndxPdZnfUzxKyaB6XwFsnETwrtTX';

async function flag() {
  const account = await api.getAccountInfo(from_address);
  console.log('account', account);

  const prepared = await api.prepareTransaction({
    TransactionType: 'AccountSet',
    Account: dest_address,
    // SetFlag: 1, // RequireDest
    ClearFlag: 1,
  });
  console.log('Prepared transaction:', prepared.txJSON);
  const max_ledger = prepared.instructions.maxLedgerVersion;

  const signed = api.sign(prepared.txJSON, dest_secret);
  console.log('Transaction hash:', signed.id);
  const tx_id = signed.id;
  const tx_blob = signed.signedTransaction;

  const prelim_result = await api.request('submit', { tx_blob: tx_blob });
  console.log('Preliminary result:', prelim_result);
  const min_ledger = prelim_result.validated_ledger_index;
  console.log('minx_ledger : '.min_ledger);
  // min_ledger, max_ledger, and tx_id are useful for looking up the transaction's
  // status later.
}

async function transfer() {
  const account = await api.getAccountInfo(from_address);
  console.log('account', account);

  const preparedTx = await api.prepareTransaction(
    {
      TransactionType: 'Payment',
      Account: from_address,
      Amount: api.xrpToDrops('1'),
      Destination: dest_address,
    },
    {
      // Expire this transaction if it doesn't execute within ~5 minutes:
      //       maxFee
      maxLedgerVersionOffset: 75,
    }
  );

  console.log('prepare', preparedTx);

  const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
  console.log('Prepared transaction instructions:', preparedTx.txJSON);
  console.log('Transaction cost:', preparedTx.instructions.fee, 'XRP');
  console.log('Transaction expires after ledger:', maxLedgerVersion);

  const signed = api.sign(preparedTx.txJSON, from_secret);
  const txID = signed.id;
  const tx_signed = signed.signedTransaction;
  console.log('Identifying hash:', txID);
  console.log('Signed tx:', tx_signed);

  // const ledgerVersion = await api.getLedgerVersion();
  // const earliestLedgerVersion = ledgerVersion + 1;

  const result = await api.submit(tx_signed);
  console.log('Tentative result code:', result.resultCode);
  console.log('Tentative result message:', result.resultMessage);
}
async function main() {
  await api.connect();
  await flag();
  await transfer();
  return api.disconnect();
}

main().then().catch(console.error);
