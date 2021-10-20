const { DirectSecp256k1HdWallet, Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes } = require('@cosmjs/proto-signing');
const { fromBase64, toBase64, toHex, fromHex } = require('@cosmjs/encoding');
const { pubkeyType, pubkeyToAddress, encodeSecp256k1Pubkey } = require('@cosmjs/amino');
const crypto = require('@cosmjs/crypto');
const { defaultRegistryTypes, SigningStargateClient, StargateClient, Tendermint34Client, buildFeeTable, GasPrice } = require('@cosmjs/stargate');
const tx_1 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');
const tx_4 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');

const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';

async function main() {
  const registry = new Registry(defaultRegistryTypes);

  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  const serialized =
    '0a95010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a020801180512150a0f0a077570686f746f6e1204323030301080f1041a4019b9bfc360c646413e5068c49b6f98ea7f47dbd76a443d1f1f0557ef3eb6acf779942a63bd21d29adc3ec0cce764232bcf92aafb5b2a92159c2cc99f33a310f5';
  const tx = tx_4.TxRaw.decode(fromHex(serialized));
  const authInfo = tx_4.AuthInfo.decode(tx.authInfoBytes);
  //   const authInfo = tx_4.AuthInfo.decode(tx.authInfoBytes);
  console.log('tx', tx_4.TxRaw.toJSON(tx));
  console.log('authInfo', JSON.stringify(tx_4.AuthInfo.toJSON(authInfo), null, 4));
  console.log('body', registry.decodeTxBody(tx.bodyBytes));

  console.log(toHex(fromBase64('CiECWAL2sGSujNFQU0IpBdMEgXw0GOtOefgT5QgSeo/El8k=')));
  let pub = decodePubkey({
    typeUrl: '/cosmos.crypto.secp256k1.PubKey',
    value: fromBase64('CiECWAL2sGSujNFQU0IpBdMEgXw0GOtOefgT5QgSeo/El8k='),
  });

  console.log(pub);
  console.log(toHex(fromBase64(pub.value)));
  // const address = pubkeyToAddress(
  //   {
  //     type: 'tendermint/PubKeySecp256k1',
  //     value:
  //   },
  //   'cosmos'
  // );
  return;
}

main().catch(console.error);
