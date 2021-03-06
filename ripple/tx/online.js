const _ = require('lodash');
const RippleAPI = require('ripple-lib').RippleAPI;
const codec = require('ripple-binary-codec');

const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net/', // Public rippled server
});

// Address: rfXgErjK96k59evDnC22zX7vRo2hYaSiqc
// Secret: ssHAaRfvdDsF62da3dpDHgxHSnw4d
// Balance: 1,000 XRP

const from_address = 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc';
const secret = 'ssHAaRfvdDsF62da3dpDHgxHSnw4d';
const dest_address = 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM';

async function main() {
  await api.connect();

  const account = await api.getAccountInfo(from_address);
  console.log('account', account);

  const preparedTx = await api.prepareTransaction(
    {
      TransactionType: 'Payment',
      Account: from_address,
      Amount: api.xrpToDrops('1'),
      Destination: 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM',
    },
    {
      // Expire this transaction if it doesn't execute within ~5 minutes:
      //       maxFee
      maxLedgerVersionOffset: 75,
    }
  );

  console.log('prepare', preparedTx);
  const tmp = JSON.parse(preparedTx.txJSON);
  console.log('tmp', tmp);
  const serialized = codec.encode(tmp);
  console.log('Transaction serialized:', serialized);
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

  return api.disconnect();
}

main().then().catch(console.error);
