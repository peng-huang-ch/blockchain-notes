const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net/', // Public rippled server
});

const from_address = 'rGtkPCrTgq5st3uSsyz5YnHMETYQdQofUS';
const from_secret = 'snuALrXSwbTHpWft3ibTA9ZzszC22';

const dest_address = 'rhV1ZJ5SHs8Spbu4aXjAE225a1CzfoJnru';
const dest_secret = 'sndxPdZnfUzxKyaB6XwFsnETwrtTX';

const new_address = 'rDerjU2jeRvGmRDpfRoSFkbYen4dXzuSrH';
const new_secret = 'snQ8ipa9zdwX1taPZCmLq5RLNTrJR';

async function clearFlag(address, secret, flag) {
  const account = await api.getAccountInfo(address);
  console.log('account', account);

  const prepared = await api.prepareTransaction({
    TransactionType: 'AccountSet',
    Account: address,
    // SetFlag: flag, // RequireDest=1
    ClearFlag: flag,
  });
  console.log('Prepared transaction:', prepared.txJSON);
  const max_ledger = prepared.instructions.maxLedgerVersion;

  const signed = api.sign(prepared.txJSON, secret);
  console.log('Transaction hash:', signed.id);
  const tx_id = signed.id;
  const tx_blob = signed.signedTransaction;

  const prelim_result = await api.request('submit', { tx_blob: tx_blob });
  console.log('Preliminary result:', prelim_result);
  const min_ledger = prelim_result.validated_ledger_index;
  console.log('minx_ledger : ', min_ledger);
  // min_ledger, max_ledger, and tx_id are useful for looking up the transaction's
  // status later.
}

async function transfer(from, secret, to) {
  const account = await api.getAccountInfo(from);
  console.log('account', account);

  const preparedTx = await api.prepareTransaction(
    {
      TransactionType: 'Payment',
      Account: from,
      Amount: api.xrpToDrops('1'),
      Destination: to,
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

  const signed = api.sign(preparedTx.txJSON, secret);
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
  await clearFlag(new_address, new_secret, 4);
  return api.disconnect();
}

main().then().catch(console.error);
