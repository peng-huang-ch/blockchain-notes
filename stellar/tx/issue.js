const StellarSdk = require('stellar-sdk');
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

// Keys for accounts to issue and receive the new asset
const issuingKeys = StellarSdk.Keypair.fromSecret('');
const receivingKeys = StellarSdk.Keypair.fromSecret('');
const chiveKeys = StellarSdk.Keypair.fromSecret('');

// Create an object to represent the new asset
console.log('issuer', issuingKeys.publicKey());
const astroDollar = new StellarSdk.Asset('PHCC', issuingKeys.publicKey());

async function issue() {
  // First, the receiving account must trust the asset
  const receiver = await server.loadAccount(receivingKeys.publicKey());

  receiver.balances.forEach(function (balance) {
    console.log('balance', balance);
    console.log('receiver Type:', balance.asset_type, ', Balance:', balance.balance);
  });

  //   return;
  var transaction = new StellarSdk.TransactionBuilder(receiver, {
    fee: 100,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    // The `changeTrust` operation creates (or alters) a trustline
    // The `limit` parameter below is optional
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: astroDollar,
        limit: '100000000',
      })
    )
    // setTimeout is required for a transaction
    .setTimeout(100)
    .build();

  transaction.sign(receivingKeys);

  //   var result = await server.submitTransaction(transaction);
  //   console.log(result);

  // Second, the issuing account actually sends a payment using the asset
  const issuer = await server.loadAccount(issuingKeys.publicKey());

  issuer.balances.forEach(function (balance) {
    console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
  });

  var transaction = new StellarSdk.TransactionBuilder(issuer, {
    fee: 100,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: receivingKeys.publicKey(),
        asset: astroDollar,
        amount: '100000001',
      })
    )
    // setTimeout is required for a transaction
    .setTimeout(100)
    .build();
  transaction.sign(issuingKeys);
  //   var result = await server.submitTransaction(transaction);
  //   console.log('issue result', result);
}

async function transfer() {
  // First, the receiving account must trust the asset
  const chive = await server.loadAccount(chiveKeys.publicKey());
  //   console.log('sequence', chive.sequenceNumber());
  //   chive.balances.forEach(function (balance) {
  //     console.log('balance', balance);
  //     console.log('receiver Type:', balance.asset_type, ', Balance:', balance.balance);
  //   });
  //   //   const minTime = Math.floor(Date.now() / 1000);
  //   //   const maxTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const minTime = '1628765951';
  const maxTime = '1628852351';
  //   //   return;
  //   var transaction = new StellarSdk.TransactionBuilder(chive, {
  //     fee: 100,
  //     networkPassphrase: StellarSdk.Networks.TESTNET,
  //     timebounds: {
  //       minTime,
  //       maxTime,
  //     },
  //   })
  //     // The `changeTrust` operation creates (or alters) a trustline
  //     // The `limit` parameter below is optional
  //     .addOperation(
  //       StellarSdk.Operation.changeTrust({
  //         asset: astroDollar,
  //         limit: '1000',
  //       })
  //     )
  //     .addMemo(StellarSdk.Memo.text('phcc'))
  //     // setTimeout is required for a transaction
  //     // .setTimeout(100)
  //     .build();
  //   console.log(transaction);

  //   console.log('hash  : ', transaction.hash().toString('hex'));
  //   console.log('toXDR : ', transaction.toXDR());

  //   transaction.sign(chiveKeys);

  //   var result = await server.submitTransaction(transaction);
  //   console.log(result);

  // Second, the issuing account actually sends a payment using the asset
  const receiver = await server.loadAccount(receivingKeys.publicKey());
  console.log('receiver public  : ', receivingKeys.publicKey());
  console.log('receiver sequence: ', receiver.sequenceNumber());
  //   receiver.balances.forEach(function (balance) {
  //     console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
  //   });

  var transaction = new StellarSdk.TransactionBuilder(receiver, {
    fee: 100,
    networkPassphrase: StellarSdk.Networks.TESTNET,
    timebounds: {
      minTime,
      maxTime,
    },
  })
    .addOperation(
      StellarSdk.Operation.payment({
        source: receivingKeys.publicKey(),
        destination: chiveKeys.publicKey(),
        asset: astroDollar,
        amount: '1000',
      })
    )
    .addMemo(StellarSdk.Memo.text('phcc'))
    // setTimeout is required for a transaction
    // .setTimeout(100)
    .build();
  console.log(JSON.stringify(transaction, null, 2));

  console.log('hash  : ', transaction.hash().toString('hex'));
  console.log('toXDR : ', transaction.toXDR());
  return;
  transaction.sign(receivingKeys);
  var result = await server.submitTransaction(transaction);
  console.log('issue result', result);
}

// issue().catch(console.error);
transfer().catch(console.error);
