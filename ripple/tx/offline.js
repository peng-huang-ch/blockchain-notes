const rippleLib = require('ripple-lib');
const hashjs = require('hash.js');
const { ec: EC } = require('elliptic');
const codec = require('ripple-binary-codec');

const { bytesToHex, hexToBytes, computePublicKeyHash } = require('ripple-keypairs/dist/utils');
const { BN } = require('bn.js');
const { RippleAPI } = rippleLib;

function hash(message) {
  return hashjs.sha512().update(message).digest().slice(0, 32);
}

const secp256k1 = new EC('secp256k1');
const api = new RippleAPI({
  server: 'wss://s.altnet.rippletest.net/', // Public rippled server
});

// Address: rfXgErjK96k59evDnC22zX7vRo2hYaSiqc
// Secret: ssHAaRfvdDsF62da3dpDHgxHSnw4d
// Balance: 1,000 XRP
// privateKey: 00FB0879201B1B89E98F8A2EB459566BA7C45C67CB1DB400E2D14082D71BE20609
// publicKey: 035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669

const from_address = 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc';
const secret = 'ssHAaRfvdDsF62da3dpDHgxHSnw4d';
const dest_address = 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM';
const publicKey = '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669';
const privateKey = '00FB0879201B1B89E98F8A2EB459566BA7C45C67CB1DB400E2D14082D71BE20609';

async function main() {
  await api.connect();

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
  console.log('now', Date.now());
  console.log('prepare', preparedTx);

  const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
  // console.log('Prepared transaction tx:', preparedTx.txJSON);
  // console.log('Prepared transaction instructions:', preparedTx.txJSON);
  // console.log('Transaction cost:', preparedTx.instructions.fee, 'XRP');
  // console.log('Transaction expires after ledger:', maxLedgerVersion);

  // const txData = preparedTx.txJSON;

  const txData = '{"TransactionType":"Payment","Account":"rfXgErjK96k59evDnC22zX7vRo2hYaSiqc","Amount":"1000000","Destination":"rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM","Flags":2147483648,"LastLedgerSequence":19194490,"Fee":"12","Sequence":19165274}';
  console.log('signingData expect   :  535458001200002280000000240124705A201B0124E27A6140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F032166698114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3');
  // console.log('signingData received : ', signingData);

  const signed = api.sign(txData, secret);

  const serializedTx = JSON.parse(txData);
  serializedTx.SigningPubKey = publicKey;

  const signingData = codec.encodeForSigning(serializedTx);
  console.log('signingData          : ', signingData);
  const tx = {
    Fee: '12',
    TransactionType: 'Payment',
    Account: 'rfXgErjK96k59evDnC22zX7vRo2hYaSiqc',
    Amount: '1000000',
    Destination: 'rUCzEr6jrEyMpjhs4wSdQdz4g8Y382NxfM',
    Flags: 2147483648,
    LastLedgerSequence: 19194490,

    Sequence: 19165274,
    SigningPubKey: '035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F03216669',
    TxnSignature: '3045022100DD4AEB145ED63B11863B54F24AFB42D7753D87E1BCA0EFCA7271DB4F1FC084DA02205A290B99A543872D738D95AAB293AE30B869A6E7799567714799D869726E30E5',
  };
  const serialized = codec.encode(tx);
  const id = RippleAPI.computeBinaryTransactionHash(serialized);
  const msg = hash(hexToBytes(signingData));

  const txSignature = bytesToHex(
    secp256k1
      .sign(msg, hexToBytes(privateKey), {
        canonical: true,
      })
      .toDER()
  );

  const txID = signed.id;
  const tx_signed = signed.signedTransaction;
  console.log('Identifying hash:', txID, txID === id);
  console.log('Signed tx:', tx_signed, tx_signed === serialized);
  const message = '535458001200002280000000240124705A201B0124D4F76140000000000F424068400000000000000C7321035ABF78147D2CAB552A4CCE6067457023100E9B9A8B4B097847428B0F032166698114479DFDA47DC5E11BFF00A06888164CAD3793B8C283148008F9193579C7D32FAF4AD1A9BFFDB236F148E3';
  const signature = bytesToHex(
    secp256k1
      .sign(hash(hexToBytes(message)), hexToBytes(privateKey), {
        canonical: true,
      })
      .toDER()
  );
  console.log('expect   :  3044022053BB488609530DB2FC1205DA0FD0C668B128079C6D2802E387FA2AB183E91FE70220400372B5DD034E5F3F0D8C8AC73FD0CC093D5D469EE5A36EB482D0A6B0612BFC');
  console.log('received : ', signature);
  console.log('equal    : ', txSignature === tx.TxnSignature);
  // console.log('sign     : ', sign(message, privateKey));

  // const result = await api.submit(tx_signed);
  // console.log('Tentative result code:', result.resultCode);
  // console.log('Tentative result message:', result.resultMessage);

  return api.disconnect();
}

main().then().catch(console.error);
