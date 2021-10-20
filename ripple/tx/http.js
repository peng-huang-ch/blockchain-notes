const RippleAPI = require('ripple-lib').RippleAPI;
const codec = require('ripple-binary-codec');

const api = new RippleAPI({
  proxy: 'https://s.altnet.rippletest.net:51234/',
});

// Address: rfXgErjK96k59evDnC22zX7vRo2hYaSiqc
// Secret: ssHAaRfvdDsF62da3dpDHgxHSnw4d
// Balance: 1,000 XRP

const from_address = 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc';
const secret = 'ssHAaRfvdDsF62da3dpDHgxHSnw4d';
const dest_address = 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM';

// const from_address = 'rDerjU2jeRvGmRDpfRoSFkbYen4dXzuSrH';
// const secret = 'snQ8ipa9zdwX1taPZCmLq5RLNTrJR';
// api
//   .connect()
//   .then(() => {
//     return;
//   })
//   .then((info) => {
//     console.log(info);
//     console.log('getAccountInfo done');
//   })
//   .then(() => {
//     const txJSON = JSON.stringify({
//       TransactionType: 'Payment',
//       Account: from_address,
//       Amount: '2000000',
//       Destination: dest_address,
//     });

//     const signed = api.sign(txJSON, secret);

//     console.log('tx_blob is:', signed.signedTransaction);
//     console.log('tx hash is:', signed.id);
//   })
//   .then(() => {})
//   .then(() => {
//     console.log('done and disconnected.');
//   })
//   .catch(console.error);

async function main() {
  // await api.connect();

  return;
  const account = await api.getAccountInfo(from_address);
  console.log('account', account);

  const preparedTx = await api.prepareTransaction(
    {
      TransactionType: 'Payment',
      Account: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
      Amount: api.xrpToDrops('100'),
      Destination: 'r3Q3D8nsyu2nJKFsagHfYdMp8H1VEHd3ps',

      // LastLedgerSequence: '19194490',
      // Fee: '12',
      // Sequence: '19165274',
      // Flags: 2147483648,
    },
    {
      // Expire this transaction if it doesn't execute within ~5 minutes:
      //       maxFee
      // maxLedgerVersionOffset: 75,
    }
  );

  console.log('prepare', preparedTx);
  const tmp = JSON.parse(preparedTx.txJSON);
  const serialized = codec.encode(tmp);
  console.log('Transaction serialized:', serialized);

  // return;
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
