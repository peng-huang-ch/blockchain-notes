const { toBase64, toHex } = require('@cosmjs/encoding');
const { Secp256k1HdWallet, makeCosmoshubPath, pubkeyType, pubkeyToAddress } = require('@cosmjs/amino');

async function main() {
  const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });

  console.log('wallet ', wallet.mnemonic);
  const [firstAccount] = await wallet.getAccounts();
  const pub = firstAccount.pubkey;
  console.log('pub', toBase64(pub));
  console.log('pub hex', toHex(pub));

  const pubkey = {
    type: pubkeyType.secp256k1,
    value: toBase64(pub),
  };
  const address = pubkeyToAddress(pubkey, 'cosmos');
  console.log('address', address);
  console.log(firstAccount);
  console.log(firstAccount.address);
}

main().catch(console.error);
