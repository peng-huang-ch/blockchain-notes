const { eddsa: EdDSA } = require('elliptic');
const ec = new EdDSA('ed25519');
const StellarSdk = require('stellar-sdk');

const secretKey = '';
const privateKey = '';
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

const sourceKeys = StellarSdk.Keypair.fromSecret(secretKey);
const sourceId = sourceKeys.publicKey();
const destinationId = 'GBH343PGYNGDQ4IQM3VU3TYREQ6KKI3IVOKF3F4YKGRHBNJXLIVIMLAH';
async function main() {
  await server.loadAccount(destinationId);
  const minTime = Math.floor(Date.now() / 1000);
  const maxTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  // const minTime = '1628748210';
  // const maxTime = '1628834610';
  const sourceAccount = await server.loadAccount(sourceId);
  const sequenceNumber = sourceAccount.sequenceNumber();

  const account = new StellarSdk.Account(sourceId, sequenceNumber);
  // console.log('sourceAccount : ', sourceAccount);
  console.log('sequence number : ', sequenceNumber);
  console.log('xxx', StellarSdk.Asset.native());
  console.log('minTime', minTime);
  console.log('maxTime', maxTime);
  // Start building the transaction.
  // Transaction will hold a built transaction we can resubmit if the result is unknown.
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
    timebounds: {
      minTime,
      maxTime,
    },
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationId,
        // Because Stellar allows transaction in many currencies, you must
        // specify the asset type. The special "native" asset represents Lumens.
        asset: StellarSdk.Asset.native(),
        amount: '10',
        source: sourceId,
      })
    )
    // A memo allows you to add your own metadata to a transaction. It's
    // optional and does not affect how Stellar treats the transaction.
    .addMemo(StellarSdk.Memo.text('phcc'))
    // Wait a maximum of three minutes for the transaction
    // .setTimeout(180)
    .build();

  console.log('hash  : ', transaction.hash().toString('hex'));
  console.log('toXDR : ', transaction.toXDR());

  // const reTxn = StellarSdk.TransactionBuilder.fromXDR(transaction.toXDR(), StellarSdk.Networks.TESTNET);

  const txhash = transaction.hash().toString('hex');
  const keyPair = ec.keyFromSecret(privateKey);

  const message = Buffer.from(txhash, 'hex');
  const sig = keyPair.sign(message);
  console.log('message', txhash);
  console.log('signature', sig.toHex().toLowerCase());

  // console.log('xxx', sig.toHex().toLowerCase() === '22bb5ebdd6978be2c30b52a3554f4968ee256495f6e290ac3e629be6ba7e946097dcd994ea8b440ca876e04810b8e39f7a3ceca51f050ef2b8f2c55d090d8503');
  // console.log('txHash', txhash, txhash === '671b059f83956f6ebca9bd21d92f97c257a127885ad3f70bdee0a012482a0c14');
  const xSig = Buffer.from(sig.toHex(), 'hex').toString('base64');
  console.log('x signature', xSig);
  console.log('toXDR : ', transaction.toXDR());
  transaction.addSignature(sourceId, xSig);

  console.log('transaction', transaction);
  console.log('txid', transaction.hash().toString('hex'));
  // console.log(transaction.signatureBase());

  const serialized = transaction.toXDR();
  const recover = StellarSdk.TransactionBuilder.fromXDR(serialized, StellarSdk.Networks.TESTNET);

  // And finally, send it off to Stellar!
  const result = await server.submitTransaction(recover);
  console.log(result);
}

main().catch(console.error);
