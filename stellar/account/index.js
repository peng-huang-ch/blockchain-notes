const StellarSdk = require('stellar-sdk');

const { eddsa: EdDSA } = require('elliptic');
const ec = new EdDSA('ed25519');
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

async function main() {
  const pair = StellarSdk.Keypair.random();

  //
  const pub = Buffer.from('01ac1a962dbf53b43fbd5a2b30a5016ac93051a62b81b5721c7842bc32fc47b3', 'hex');
  const pair1 = new StellarSdk.Keypair({ type: 'ed25519', publicKey: pub });
  console.log('pair pub key : ', pair1.publicKey());
  const publicKey = pair.publicKey();
  const rawPublicKey = pair.rawPublicKey().toString('hex');
  const xdrAccountId = pair.xdrAccountId();
  const type = pair.xdrAccountId().switch();
  const xdr = pair.xdrAccountId().toXDR('base64');

  const isValid = StellarSdk.StrKey.isValidEd25519PublicKey();
  // const
  const encodeEd25519PublicKey = StellarSdk.StrKey.encodeEd25519PublicKey(pub);
  console.log('isValid', isValid);
  console.log('encodeEd25519PublicKey', encodeEd25519PublicKey);
  // const type = pair.xdrAccountId().switch();

  //   console.log('secret', secret);
  console.log('publicKey    : ', publicKey);
  console.log('rawPublicKey : ', rawPublicKey);
  // console.log('xdrAccountId : ', xdrAccountId);
  console.log('switch : ', type);
  console.log('xdr : ', xdr);
  return;
  const account = await server.loadAccount(publicKey);
  //   console.log('Balances for account: ' + pub);
  account.balances.forEach(function (balance) {
    console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
  });
}

main().catch(console.error);
